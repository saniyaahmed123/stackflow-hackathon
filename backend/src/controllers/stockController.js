import { Product } from '../models/Product.js';
import { Warehouse } from '../models/Warehouse.js';
import { Stock } from '../models/Stock.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { assignedWarehouseIds, canManageWarehouse } from '../middleware/auth.js';
import {
  asyncHandler, fail, INVALID_QUANTITY, isObjectId, ok, positiveInt, stockShortfallMessage,
} from '../utils/http.js';

const resolveReferences = async (productId, warehouseId) => {
  if (!isObjectId(productId) || !isObjectId(warehouseId)) {
    return { error: 'Product and Warehouse must be valid ids.' };
  }
  const [product, warehouse] = await Promise.all([
    Product.findById(productId),
    Warehouse.findById(warehouseId),
  ]);
  if (!product) return { error: `Product "${productId}" does not exist.` };
  if (!warehouse) return { error: `Warehouse "${warehouseId}" does not exist.` };
  return { product, warehouse };
};

export const stockIn = asyncHandler(async (req, res) => {
  const quantity = positiveInt(req.body.quantity);
  if (!quantity) return fail(res, 400, INVALID_QUANTITY);
  if (!req.body.warehouseId) return fail(res, 400, 'Warehouse is required.');
  if (!canManageWarehouse(req.user, req.body.warehouseId)) {
    return fail(res, 403, 'You are not assigned to this warehouse.');
  }
  if (!req.body.productId) return fail(res, 400, 'Product is required.');
  const refs = await resolveReferences(req.body.productId, req.body.warehouseId);
  if (refs.error) return fail(res, 400, refs.error);

  const stock = await Stock.findOneAndUpdate(
    { product: refs.product._id, warehouse: refs.warehouse._id },
    { $inc: { quantity } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const transaction = await StockTransaction.create({
    product: refs.product._id,
    warehouse: refs.warehouse._id,
    transactionType: 'stock-in',
    quantity,
    note: String(req.body.note || 'Stock added'),
    performedBy: req.user._id,
  });

  return ok(res, { stock, transaction }, `${quantity} unit(s) added to stock`);
});

export const stockOut = asyncHandler(async (req, res) => {
  const quantity = positiveInt(req.body.quantity);
  if (!quantity) return fail(res, 400, INVALID_QUANTITY);
  if (!req.body.warehouseId) return fail(res, 400, 'Warehouse is required.');
  if (!canManageWarehouse(req.user, req.body.warehouseId)) {
    return fail(res, 403, 'You are not assigned to this warehouse.');
  }
  if (!req.body.productId) return fail(res, 400, 'Product is required.');
  const refs = await resolveReferences(req.body.productId, req.body.warehouseId);
  if (refs.error) return fail(res, 400, refs.error);

  const stock = await Stock.findOneAndUpdate(
    { product: refs.product._id, warehouse: refs.warehouse._id, quantity: { $gte: quantity } },
    { $inc: { quantity: -quantity } },
    { new: true }
  );
  if (!stock) {
    const current = await Stock.findOne({ product: refs.product._id, warehouse: refs.warehouse._id });
    return fail(res, 400, stockShortfallMessage({
      productName: refs.product.name,
      available: current?.quantity || 0,
      requested: quantity,
      warehouseName: refs.warehouse.name,
    }));
  }
  const transaction = await StockTransaction.create({
    product: refs.product._id,
    warehouse: refs.warehouse._id,
    transactionType: 'stock-out',
    quantity,
    note: String(req.body.note || 'Stock removed'),
    performedBy: req.user._id,
  });

  return ok(res, { stock, transaction }, `${quantity} unit(s) removed from stock`);
});

const scopedWarehouseFilter = (req) => {
  if (req.user.role === 'warehouseManager') return { $in: assignedWarehouseIds(req.user) };
  if (req.query.warehouseId) return req.query.warehouseId;
  return undefined;
};

export const listStock = asyncHandler(async (req, res) => {
  const query = {};
  const warehouseFilter = scopedWarehouseFilter(req);
  if (warehouseFilter) query.warehouse = warehouseFilter;
  if (req.query.productId) query.product = req.query.productId;

  const stocks = await Stock.find(query)
    .populate('product', 'name sku category price lowStockLimit imageUrl')
    .populate('warehouse', 'name location')
    .sort({ updatedAt: -1 })
    .lean();

  const data = stocks.map((stock) => ({
    ...stock,
    isLow: Boolean(stock.product && stock.quantity < stock.product.lowStockLimit),
  }));
  return ok(res, data);
});

export const lowStock = asyncHandler(async (req, res) => {
  if (!['admin', 'warehouseManager'].includes(req.user.role)) {
    return fail(res, 403, 'Low-stock reports are available to admins and managers');
  }
  const query = {};
  if (req.user.role === 'warehouseManager') {
    query.warehouse = { $in: assignedWarehouseIds(req.user) };
  } else if (req.query.warehouseId) {
    query.warehouse = req.query.warehouseId;
  }
  const stocks = await Stock.find(query)
    .populate('product', 'name sku category price lowStockLimit imageUrl supplier')
    .populate('warehouse', 'name location')
    .lean();
  const data = stocks
    .filter((stock) => stock.product && stock.quantity < (stock.product.lowStockLimit || 0))
    .map((stock) => ({
      ...stock,
      shortfall: (stock.product.lowStockLimit || 0) - stock.quantity,
    }));
  return ok(res, data);
});
