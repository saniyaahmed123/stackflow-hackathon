import { StockTransaction } from '../models/StockTransaction.js';
import { Product } from '../models/Product.js';
import { assignedWarehouseIds } from '../middleware/auth.js';
import { asyncHandler, fail, ok } from '../utils/http.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listTransactions = asyncHandler(async (req, res) => {
  if (!['admin', 'warehouseManager'].includes(req.user.role)) {
    return fail(res, 403, 'Stock history is available to admins and managers');
  }
  const query = {};
  if (req.user.role === 'warehouseManager') {
    query.warehouse = { $in: assignedWarehouseIds(req.user) };
  } else if (req.query.warehouseId) {
    query.warehouse = req.query.warehouseId;
  }
  if (['stock-in', 'stock-out'].includes(req.query.type)) query.transactionType = req.query.type;
  if (req.query.productId) query.product = req.query.productId;
  if (req.query.from || req.query.to) {
    query.date = {};
    if (req.query.from) query.date.$gte = new Date(req.query.from);
    if (req.query.to) query.date.$lte = new Date(req.query.to);
  }
  if (req.query.q) {
    const pattern = new RegExp(escapeRegex(req.query.q), 'i');
    const products = await Product.find({ name: pattern }).select('_id');
    query.$or = [{ note: pattern }, { product: { $in: products.map((item) => item._id) } }];
  }

  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  const transactions = await StockTransaction.find(query)
    .populate('product', 'name sku imageUrl category')
    .populate('warehouse', 'name location')
    .populate('performedBy', 'name email role')
    .sort({ date: -1 })
    .limit(limit)
    .lean();
  return ok(res, transactions);
});
