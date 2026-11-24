import { randomBytes } from 'crypto';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Stock } from '../models/Stock.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { Warehouse } from '../models/Warehouse.js';
import { assignedWarehouseIds, canManageWarehouse } from '../middleware/auth.js';
import { addStockWithCapacity } from '../utils/capacity.js';
import { withTransaction } from '../utils/transaction.js';
import {
  asyncHandler, fail, INVALID_QUANTITY, isObjectId, ok, positiveInt, stockShortfallMessage,
} from '../utils/http.js';
import { listOptions, setPaginationHeaders } from '../utils/list.js';

const populateOrder = (query) =>
  query
    .populate('products.product', 'name sku imageUrl category')
    .populate('warehouse', 'name location')
    .populate('createdBy', 'name email role');

const newOrderNumber = () =>
  `ORD-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;

export const createOrder = asyncHandler(async (req, res) => {
  const customerName = String(req.body.customerName || '').trim();
  if (!customerName) return fail(res, 400, 'Customer name is required.');
  if (!req.body.warehouseId) return fail(res, 400, 'Warehouse is required.');
  if (!isObjectId(req.body.warehouseId)) return fail(res, 400, 'Warehouse must be a valid warehouse id.');
  if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
    return fail(res, 400, 'At least one product is required.');
  }

  const quantities = new Map();
  for (const item of req.body.items) {
    const quantity = positiveInt(item.quantity);
    if (!quantity) return fail(res, 400, INVALID_QUANTITY);
    if (!isObjectId(item.productId)) return fail(res, 400, 'Product is required and must be a valid product id.');
    quantities.set(String(item.productId), (quantities.get(String(item.productId)) || 0) + quantity);
  }

  const warehouse = await Warehouse.findById(req.body.warehouseId);
  if (!warehouse) return fail(res, 404, `Warehouse "${req.body.warehouseId}" does not exist.`);

  const ids = [...quantities.keys()];
  const products = await Product.find({ _id: { $in: ids } });
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  if (products.length !== ids.length) {
    const missing = ids.filter((id) => !productMap.has(id));
    return fail(res, 400, `Product not found: ${missing.join(', ')}.`);
  }
  const archived = products.filter((product) => product.archived).map((product) => product.name);
  if (archived.length) {
    return fail(res, 400, `Archived products cannot be ordered: ${archived.join(', ')}.`);
  }

  const stocks = await Stock.find({ warehouse: warehouse._id, product: { $in: ids } }).lean();
  const stockMap = new Map(stocks.map((stock) => [String(stock.product), stock.quantity]));
  const shortfalls = [];
  for (const [id, quantity] of quantities) {
    const available = stockMap.get(id) || 0;
    if (available < quantity) {
      shortfalls.push(stockShortfallMessage({
        productName: productMap.get(id).name,
        available,
        requested: quantity,
        warehouseName: warehouse.name,
      }));
    }
  }
  if (shortfalls.length) return fail(res, 400, `Insufficient stock: ${shortfalls.join(' ')}`);

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

export const precheckOrder = asyncHandler(async (req, res) => {
  const warehouseId = req.body.warehouseId || req.body.warehouse;
  if (!warehouseId) return fail(res, 400, 'Warehouse is required.');
  if (!isObjectId(warehouseId)) return fail(res, 400, 'Warehouse must be a valid warehouse id.');
  if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
    return fail(res, 400, 'At least one product is required.');
  }

  const quantities = new Map();
  for (const item of req.body.items) {
    const quantity = positiveInt(item.quantity);
    if (!quantity) return fail(res, 400, INVALID_QUANTITY);
    const productId = item.productId || item.product;
    if (!isObjectId(productId)) return fail(res, 400, 'Product is required and must be a valid product id.');
    quantities.set(String(productId), (quantities.get(String(productId)) || 0) + quantity);
  }

  const warehouse = await Warehouse.findById(warehouseId).lean();
  if (!warehouse) return fail(res, 404, `Warehouse "${warehouseId}" does not exist.`);

  const ids = [...quantities.keys()];
  const products = await Product.find({ _id: { $in: ids } }).lean();
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const chosenStocks = await Stock.find({ warehouse: warehouse._id, product: { $in: ids } }).lean();
  const chosenMap = new Map(chosenStocks.map((stock) => [String(stock.product), stock.quantity || 0]));
  const allStocks = await Stock.find({ product: { $in: ids } }).populate('warehouse', 'name').lean();
  const stockByProduct = new Map();
  for (const stock of allStocks) {
    const key = String(stock.product);
    if (!stockByProduct.has(key)) stockByProduct.set(key, []);
    stockByProduct.get(key).push(stock);
  }

  let totalAmount = 0;
  const items = [];
  for (const [id, requested] of quantities) {
    const product = productMap.get(id);
    const archived = Boolean(product?.archived);
    const onHand = chosenMap.get(id) || 0;
    const available = product && !archived ? onHand : 0;
    const canFulfill = Boolean(product && !archived && available >= requested);
    const shortfall = canFulfill ? 0 : Math.max(requested - available, 0);
    const alternatives = [];
    let reason = null;

    if (!product) {
      reason = 'Product not found';
    } else if (archived) {
      reason = 'Product is archived';
      alternatives.push({ type: 'archived', message: 'Archived products cannot be ordered.' });
    } else if (!canFulfill) {
      reason = 'Insufficient stock';
      const other = (stockByProduct.get(id) || [])
        .filter((stock) => String(stock.warehouse?._id || stock.warehouse) !== String(warehouse._id))
        .filter((stock) => (stock.quantity || 0) >= requested)
        .sort((left, right) => (right.quantity || 0) - (left.quantity || 0))[0];
      if (other) {
        alternatives.push({
          type: 'warehouse',
          warehouseId: String(other.warehouse?._id || other.warehouse),
          warehouseName: other.warehouse?.name || '',
          available: other.quantity || 0,
        });
      } else {
        alternatives.push({
          type: 'maxQuantity',
          warehouseId: String(warehouse._id),
          warehouseName: warehouse.name,
          maxQuantity: available,
        });
      }
    }

    if (canFulfill) totalAmount += Number(product.price) * requested;
    items.push({
      productId: id,
      productName: product?.name || null,
      sku: product?.sku || null,
      archived,
      requested,
      available,
      shortfall,
      canFulfill,
      reason,
      alternatives,
    });
  }

  return ok(res, {
    warehouse: { id: String(warehouse._id), name: warehouse.name },
    items,
    totalAmount: Math.round(totalAmount * 100) / 100,
    allFulfillable: items.every((item) => item.canFulfill),
  });
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
  if (req.query.productId && isObjectId(req.query.productId)) {
    query['products.product'] = req.query.productId;
  }

  const opts = listOptions(req, {
    sortFields: {
      createdAt: 'createdAt',
      orderNumber: 'orderNumber',
      customerName: 'customerName',
      status: 'status',
      totalAmount: 'totalAmount',
    },
    defaultSort: { createdAt: -1 },
  });
  const total = await Order.countDocuments(query);
  const orders = await populateOrder(Order.find(query))
    .sort(opts.sort)
    .skip(opts.skip)
    .limit(opts.limit);
  setPaginationHeaders(res, opts.page, opts.limit, total);
  return ok(res, orders);
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await populateOrder(Order.findById(req.params.id));
  if (!order) return fail(res, 404, `Order "${req.params.id}" does not exist.`);
  const allowed =
    req.user.role === 'admin' ||
    String(order.createdBy?._id || order.createdBy) === String(req.user._id) ||
    (req.user.role === 'warehouseManager' && canManageWarehouse(req.user, order.warehouse?._id || order.warehouse));
  if (!allowed) {
    return fail(res, 403, req.user.role === 'warehouseManager'
      ? 'You are not assigned to this warehouse.'
      : 'You can only view orders you created.');
  }
  return ok(res, order);
});

async function setOrderStatus(orderId, expectedStatus, nextStatus, session, extra = {}) {
  const options = session ? { session } : undefined;
  const updated = await Order.updateOne(
    { _id: orderId, status: expectedStatus },
    { $set: { status: nextStatus, ...extra } },
    options
  );
  if (updated.matchedCount === 0) {
    const current = await Order.findById(orderId).select('status').lean();
    const error = new Error(
      current
        ? `Order is currently ${current.status}; expected ${expectedStatus}. It may have been changed by another request.`
        : `Order "${orderId}" does not exist.`
    );
    error.status = current ? 409 : 404;
    throw error;
  }
}

async function deductOrderStock(order, session, rollbacks) {
  const ids = order.products.map((line) => line.product._id || line.product);
  const productQuery = Product.find({ _id: { $in: ids } }).select('name sku');
  if (session) productQuery.session(session);
  const products = await productQuery;
  const names = new Map(products.map((product) => [String(product._id), product.name]));
  const warehouseId = order.warehouse?._id || order.warehouse;
  const warehouseName = order.warehouse?.name || 'this warehouse';
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
      const error = new Error(stockShortfallMessage({
        productName: names.get(String(productId)) || 'Product',
        available: current?.quantity || 0,
        requested: line.quantity,
        warehouseName,
      }));
      error.status = 400;
      throw error;
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

async function restoreOrderStock(order, session, rollbacks) {
  const warehouseId = order.warehouse?._id || order.warehouse;
  for (const line of order.products) {
    const productId = line.product._id || line.product;
    await addStockWithCapacity({
      productId,
      warehouseId,
      quantity: line.quantity,
      performedBy: order.createdBy?._id || order.createdBy,
      note: `Order ${order.orderNumber} cancelled`,
      session,
      rollbacks,
    });
  }
}

export const updateStatus = asyncHandler(async (req, res) => {
  const status = String(req.body.status || '');
  if (!['Processing', 'Completed'].includes(status)) {
    return fail(res, 400, 'Status must be Processing or Completed. Use cancel for Cancelled.');
  }
  let order = await populateOrder(Order.findById(req.params.id));
  if (!order) return fail(res, 404, `Order "${req.params.id}" does not exist.`);
  if (!order.warehouse) {
    return fail(res, 400, 'This order has no warehouse assigned and cannot be processed.');
  }
  if (!canManageWarehouse(req.user, order.warehouse?._id || order.warehouse)) {
    return fail(res, 403, 'You are not assigned to this warehouse.');
  }

  const expected = status === 'Processing' ? 'Pending' : 'Processing';
  if (order.status !== expected) {
    if (order.status === 'Cancelled') return fail(res, 400, 'Cancelled orders cannot be processed again.');
    if (order.status === 'Completed') return fail(res, 400, 'Completed orders cannot be processed again.');
    if (status === 'Processing') {
      return fail(res, 400, `Only Pending orders can move to Processing. This order is ${order.status}.`);
    }
    return fail(res, 400, `Only Processing orders can be completed. This order is ${order.status}.`);
  }

  try {
    await withTransaction(async (session, rollbacks) => {
      const extra = {};
      if (status === 'Processing') {
        await deductOrderStock(order, session, rollbacks);
        extra.processedAt = new Date();
      } else {
        extra.completedAt = new Date();
      }
      await setOrderStatus(order._id, expected, status, session, extra);
    });
  } catch (error) {
    return fail(res, error.status || 400, error.message || 'Order could not be processed');
  }

  order = await populateOrder(Order.findById(order._id));
  return ok(res, order, `Order marked ${status}`);
});

export const cancelOrder = asyncHandler(async (req, res) => {
  let order = await populateOrder(Order.findById(req.params.id));
  if (!order) return fail(res, 404, `Order "${req.params.id}" does not exist.`);
  if (req.user.role === 'salesRepresentative' && String(order.createdBy?._id || order.createdBy) !== String(req.user._id)) {
    return fail(res, 403, 'You can only cancel orders you created.');
  }
  if (!['Pending', 'Processing'].includes(order.status)) {
    return fail(res, 400, `Only Pending or Processing orders can be cancelled. This order is ${order.status}.`);
  }

  const expected = order.status;
  try {
    await withTransaction(async (session, rollbacks) => {
      if (expected === 'Processing') {
        await restoreOrderStock(order, session, rollbacks);
      }
      await setOrderStatus(order._id, expected, 'Cancelled', session, { cancelledAt: new Date() });
    });
  } catch (error) {
    return fail(res, error.status || 400, error.message || 'Order could not be cancelled');
  }

  order = await populateOrder(Order.findById(order._id));
  return ok(res, order, 'Order cancelled');
});

export const orderSummary = asyncHandler(async (_req, res) => {
  const [row] = await Order.aggregate([
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

  const summary = row || {};
  const ordersByStatus = {
    Pending: Number(summary.pending) || 0,
    Processing: Number(summary.processing) || 0,
    Completed: Number(summary.completed) || 0,
    Cancelled: Number(summary.cancelled) || 0,
  };

  return ok(res, {
    totalOrders: Number(summary.totalOrders) || 0,
    revenue: Number(summary.revenue) || 0,
    pending: ordersByStatus.Pending,
    processing: ordersByStatus.Processing,
    completed: ordersByStatus.Completed,
    cancelled: ordersByStatus.Cancelled,
    ordersByStatus,
  });
});
