import { randomBytes } from 'crypto';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Stock } from '../models/Stock.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { Warehouse } from '../models/Warehouse.js';
import { assignedWarehouseIds, canManageWarehouse } from '../middleware/auth.js';
import { withTransaction } from '../utils/transaction.js';
import { asyncHandler, fail, isObjectId, ok, positiveInt } from '../utils/http.js';

const populateOrder = (query) =>
  query
    .populate('products.product', 'name sku imageUrl category')
    .populate('warehouse', 'name location')
    .populate('createdBy', 'name email role');

const newOrderNumber = () =>
  `ORD-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;

export const createOrder = asyncHandler(async (req, res) => {
  const customerName = String(req.body.customerName || '').trim();
  if (!customerName) return fail(res, 400, 'Customer name is required');
  if (!isObjectId(req.body.warehouseId)) return fail(res, 400, 'A valid warehouse is required');
  if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
    return fail(res, 400, 'At least one product is required');
  }

  const quantities = new Map();
  for (const item of req.body.items) {
    const quantity = positiveInt(item.quantity);
    if (!quantity || !isObjectId(item.productId)) {
      return fail(res, 400, 'Each item needs a valid product and a positive quantity');
    }
    quantities.set(String(item.productId), (quantities.get(String(item.productId)) || 0) + quantity);
  }

  const warehouse = await Warehouse.findById(req.body.warehouseId);
  if (!warehouse) return fail(res, 404, 'Warehouse not found');

  const ids = [...quantities.keys()];
  const products = await Product.find({ _id: { $in: ids } });
  if (products.length !== ids.length) return fail(res, 400, 'One or more products do not exist');
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  const stocks = await Stock.find({ warehouse: warehouse._id, product: { $in: ids } }).lean();
  const stockMap = new Map(stocks.map((stock) => [String(stock.product), stock.quantity]));
  for (const [id, quantity] of quantities) {
    const available = stockMap.get(id) || 0;
    if (available < quantity) {
      return fail(res, 400, `Insufficient stock for ${productMap.get(id).name}: available ${available}, requested ${quantity}`);
    }
  }

  const lines = [...quantities].map(([id, quantity]) => ({
    product: id,
    quantity,
    price: productMap.get(id).price,
  }));
  const totalAmount = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

  const order = await Order.create({
    orderNumber: newOrderNumber(),
    customerName,
    customerPhone: String(req.body.customerPhone || ''),
    products: lines,
    totalAmount: Math.round(totalAmount * 100) / 100,
    warehouse: warehouse._id,
    createdBy: req.user._id,
    status: 'Pending',
  });
  return ok(res, await populateOrder(Order.findById(order._id)), 'Order created (Pending)', 201);
});

export const listOrders = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user.role === 'salesRepresentative') query.createdBy = req.user._id;
  else if (req.user.role === 'warehouseManager') {
    query.warehouse = { $in: assignedWarehouseIds(req.user) };
  } else if (req.user.role === 'supplier') {
    return fail(res, 403, 'Suppliers cannot view orders');
  }
  if (['Pending', 'Processing', 'Completed', 'Cancelled'].includes(req.query.status)) {
    query.status = req.query.status;
  }
  if (req.query.q) {
    const pattern = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ orderNumber: pattern }, { customerName: pattern }, { customerPhone: pattern }];
  }
  const orders = await populateOrder(Order.find(query)).sort({ createdAt: -1 });
  return ok(res, orders);
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await populateOrder(Order.findById(req.params.id));
  if (!order) return fail(res, 404, 'Order not found');
  const allowed =
    req.user.role === 'admin' ||
    String(order.createdBy?._id || order.createdBy) === String(req.user._id) ||
    (req.user.role === 'warehouseManager' && canManageWarehouse(req.user, order.warehouse?._id || order.warehouse));
  if (!allowed) return fail(res, 403, 'You are not allowed to view this order');
  return ok(res, order);
});

async function deductOrderStock(order, session, rollbacks) {
  const ids = order.products.map((line) => line.product._id || line.product);
  const products = await Product.find({ _id: { $in: ids } }).select('name sku');
  const names = new Map(products.map((product) => [String(product._id), product.name]));
  const warehouseId = order.warehouse?._id || order.warehouse;
  const options = session ? { session } : {};

  for (const line of order.products) {
    const productId = line.product._id || line.product;
    const stock = await Stock.findOneAndUpdate(
      { product: productId, warehouse: warehouseId, quantity: { $gte: line.quantity } },
      { $inc: { quantity: -line.quantity } },
      { new: true, ...options }
    );
    if (!stock) {
      const current = await Stock.findOne({ product: productId, warehouse: warehouseId }, null, options);
      throw new Error(
        `Insufficient stock for ${names.get(String(productId)) || 'a product'}. Available: ${current?.quantity || 0}`
      );
    }

    const txData = {
      product: productId,
      warehouse: warehouseId,
      transactionType: 'stock-out',
      quantity: line.quantity,
      note: `Order ${order.orderNumber} processed`,
      performedBy: order.createdBy?._id || order.createdBy,
      date: new Date(),
    };
    let transaction;
    if (session) {
      transaction = (await StockTransaction.create([txData], { session }))[0];
    } else {
      transaction = await StockTransaction.create(txData);
      rollbacks.push(async () => {
        await Stock.updateOne({ product: productId, warehouse: warehouseId }, { $inc: { quantity: line.quantity } });
        await StockTransaction.deleteOne({ _id: transaction._id });
      });
    }
  }
}

export const updateStatus = asyncHandler(async (req, res) => {
  const status = String(req.body.status || '');
  if (!['Processing', 'Completed'].includes(status)) {
    return fail(res, 400, 'Status must be Processing or Completed. Use cancel for Cancelled.');
  }
  let order = await populateOrder(Order.findById(req.params.id));
  if (!order) return fail(res, 404, 'Order not found');
  if (!canManageWarehouse(req.user, order.warehouse?._id || order.warehouse)) {
    return fail(res, 403, 'You can only manage orders for your assigned warehouses');
  }
  if (['Cancelled', 'Completed'].includes(order.status)) {
    return fail(res, 400, `${order.status} orders cannot be processed again`);
  }
  if (order.status === status) return fail(res, 400, `Order is already ${status}`);
  if (status === 'Processing' && order.status !== 'Pending') {
    return fail(res, 400, 'Only Pending orders can move to Processing');
  }

  try {
    await withTransaction(async (session, rollbacks) => {
      if (order.status === 'Pending') {
        await deductOrderStock(order, session, rollbacks);
        order.processedAt = new Date();
      }
      order.status = status;
      if (status === 'Completed') order.completedAt = new Date();
      await order.save(session ? { session } : undefined);
    });
  } catch (error) {
    return fail(res, 400, error.message || 'Order could not be processed');
  }

  order = await populateOrder(Order.findById(order._id));
  return ok(res, order, `Order marked ${status}`);
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await populateOrder(Order.findById(req.params.id));
  if (!order) return fail(res, 404, 'Order not found');
  if (req.user.role === 'salesRepresentative' && String(order.createdBy?._id || order.createdBy) !== String(req.user._id)) {
    return fail(res, 403, 'You can only cancel your own orders');
  }
  if (order.status !== 'Pending') {
    return fail(res, 400, 'Only Pending orders can be cancelled');
  }
  order.status = 'Cancelled';
  order.cancelledAt = new Date();
  await order.save();
  return ok(res, order, 'Order cancelled');
});

export const orderSummary = asyncHandler(async (_req, res) => {
  const [rows] = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        revenue: { $sum: { $cond: [{ $ne: ['$status', 'Cancelled'] }, '$totalAmount', 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
        processing: { $sum: { $cond: [{ $eq: ['$status', 'Processing'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
      },
    },
  ]);
  return ok(res, rows || { totalOrders: 0, revenue: 0, pending: 0, processing: 0, completed: 0, cancelled: 0 });
});
