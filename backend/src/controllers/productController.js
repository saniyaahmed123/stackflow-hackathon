import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { Stock } from '../models/Stock.js';
import { deleteImageKitFile, isImageKitUrl } from '../config/imagekit.js';
import { assignedWarehouseIds } from '../middleware/auth.js';
import { asyncHandler, fail, isObjectId, ok, priceValue } from '../utils/http.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveImage = (body, existing = {}) => {
  const hasUrl = Object.prototype.hasOwnProperty.call(body, 'imageUrl');
  const hasId = Object.prototype.hasOwnProperty.call(body, 'imageFileId');
  if (!hasUrl && !hasId) return { fields: {}, oldFileId: null };

  const url = String(body.imageUrl || '');
  const fileId = String(body.imageFileId || '');
  if (!url && !fileId) {
    return { fields: { imageUrl: '', imageFileId: '' }, oldFileId: existing.imageFileId || null };
  }
  if (!url || !fileId || !isImageKitUrl(url)) {
    const error = new Error('Images must be uploaded through ImageKit, not supplied as arbitrary URLs');
    error.status = 400;
    throw error;
  }
  return {
    fields: { imageUrl: url, imageFileId: fileId },
    oldFileId: existing.imageFileId && existing.imageFileId !== fileId ? existing.imageFileId : null,
  };
};

const stockTotals = async () => {
  const rows = await Stock.aggregate([{ $group: { _id: '$product', total: { $sum: '$quantity' } } }]);
  return new Map(rows.map((row) => [String(row._id), row.total]));
};

export const listProducts = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.q) {
    const pattern = new RegExp(escapeRegex(req.query.q), 'i');
    query.$or = [{ name: pattern }, { sku: pattern }, { category: pattern }];
  }
  if (req.query.category) query.category = new RegExp(`^${escapeRegex(req.query.category)}$`, 'i');
  if (req.query.supplier) query.supplier = req.query.supplier;

  if (req.user.role === 'supplier') query.supplier = req.user._id;
  if (req.user.role === 'warehouseManager' && req.query.managedOnly === 'true') {
    const ids = assignedWarehouseIds(req.user);
    const withStock = await Stock.find({ warehouse: { $in: ids } }).distinct('product');
    query._id = { $in: withStock };
  }

  const products = await Product.find(query)
    .populate('supplier', 'name email image')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();
  const totals = await stockTotals();
  let data = products.map((product) => ({
    ...product,
    availableStock: totals.get(String(product._id)) || 0,
  }));
  if (req.query.available === 'true') data = data.filter((product) => product.availableStock > 0);
  if (req.query.lowStock === 'true') {
    data = data.filter((product) => product.availableStock < (product.lowStockLimit || 0));
  }
  return ok(res, data);
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('supplier', 'name email image')
    .populate('createdBy', 'name email');
  if (!product) return fail(res, 404, 'Product not found');
  const stocks = await Stock.find({ product: product._id }).populate('warehouse', 'name location').lean();
  const availableStock = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
  return ok(res, { ...product.toJSON(), stocks, availableStock });
});

export const createProduct = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const sku = String(req.body.sku || '').trim().toUpperCase();
  const price = priceValue(req.body.price);
  const lowStockLimit = Number(req.body.lowStockLimit ?? 5);

  if (!name || !sku) return fail(res, 400, 'Name and SKU are required');
  if (price === null) return fail(res, 400, 'A valid price is required');
  if (!Number.isInteger(lowStockLimit) || lowStockLimit < 0) {
    return fail(res, 400, 'lowStockLimit must be a non-negative integer');
  }
  if (await Product.exists({ sku })) return fail(res, 409, 'SKU already exists');

  let supplier = null;
  if (req.body.supplier) {
    if (!isObjectId(req.body.supplier)) return fail(res, 400, 'Invalid supplier');
    const found = await User.findOne({ _id: req.body.supplier, role: 'supplier' });
    if (!found) return fail(res, 400, 'Supplier not found');
    supplier = found._id;
  }

  let image;
  try {
    image = resolveImage(req.body);
  } catch (error) {
    return fail(res, error.status || 400, error.message);
  }

  const product = await Product.create({
    name,
    sku,
    description: String(req.body.description || ''),
    category: String(req.body.category || 'General').trim() || 'General',
    price,
    lowStockLimit,
    supplier,
    createdBy: req.user._id,
    ...image.fields,
  });

  return ok(res, product, 'Product created', 201);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return fail(res, 404, 'Product not found');

  if (req.body.name !== undefined) product.name = String(req.body.name).trim();
  if (req.body.description !== undefined) product.description = String(req.body.description);
  if (req.body.category !== undefined) product.category = String(req.body.category).trim() || 'General';
  if (req.body.price !== undefined) {
    const price = priceValue(req.body.price);
    if (price === null) return fail(res, 400, 'Invalid price');
    product.price = price;
  }
  if (req.body.lowStockLimit !== undefined) {
    const limit = Number(req.body.lowStockLimit);
    if (!Number.isInteger(limit) || limit < 0) return fail(res, 400, 'Invalid lowStockLimit');
    product.lowStockLimit = limit;
  }
  if (req.body.sku !== undefined) {
    const sku = String(req.body.sku).trim().toUpperCase();
    if (!sku) return fail(res, 400, 'SKU cannot be empty');
    if (await Product.exists({ sku, _id: { $ne: product._id } })) return fail(res, 409, 'SKU already exists');
    product.sku = sku;
  }
  if (req.body.supplier !== undefined) {
    if (req.body.supplier) {
      if (!isObjectId(req.body.supplier)) return fail(res, 400, 'Invalid supplier');
      const found = await User.findOne({ _id: req.body.supplier, role: 'supplier' });
      if (!found) return fail(res, 400, 'Supplier not found');
      product.supplier = found._id;
    } else {
      product.supplier = null;
    }
  }

  let image;
  try {
    image = resolveImage(req.body, product);
  } catch (error) {
    return fail(res, error.status || 400, error.message);
  }
  Object.assign(product, image.fields);
  await product.save();
  await deleteImageKitFile(image.oldFileId);

  return ok(res, product, 'Product updated');
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return fail(res, 404, 'Product not found');
  await Stock.deleteMany({ product: product._id });
  await deleteImageKitFile(product.imageFileId);
  await product.deleteOne();
  return ok(res, { id: product._id }, 'Product deleted');
});
