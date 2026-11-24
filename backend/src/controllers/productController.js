import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { Stock } from '../models/Stock.js';
import { Warehouse } from '../models/Warehouse.js';
import { deleteImageKitFile, isImageKitUrl } from '../config/imagekit.js';
import { assignedWarehouseIds } from '../middleware/auth.js';
import { asyncHandler, fail, isObjectId, ok, priceValue } from '../utils/http.js';
import { listOptions, paginateArray, setPaginationHeaders, sortArray } from '../utils/list.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const canWriteProducts = (user) => ['admin', 'warehouseManager'].includes(user?.role);

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
  if (req.query.archived === 'true' || req.query.archived === 'false') {
    query.archived = req.query.archived === 'true';
  }

  if (req.user.role === 'supplier') query.supplier = req.user._id;
  if (req.user.role === 'warehouseManager' && req.query.managedOnly === 'true') {
    const ids = assignedWarehouseIds(req.user);
    const withStock = await Stock.find({ warehouse: { $in: ids } }).distinct('product');
    query._id = { $in: withStock };
  }

  const opts = listOptions(req, {
    sortFields: {
      createdAt: 'createdAt',
      name: 'name',
      sku: 'sku',
      category: 'category',
      price: 'price',
      availableStock: 'availableStock',
    },
    defaultSort: { createdAt: -1 },
  });
  const products = await Product.find(query)
    .populate('supplier', 'name email image')
    .populate('createdBy', 'name email')
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

  data = sortArray(data, opts.sort);
  setPaginationHeaders(res, opts.page, opts.limit, data.length);
  return ok(res, paginateArray(data, opts.page, opts.limit));
});

export const productAvailability = asyncHandler(async (req, res) => {
  if (!['admin', 'salesRepresentative', 'warehouseManager'].includes(req.user.role)) {
    return fail(res, 403, 'Product availability is available to admins, sales reps and managers');
  }
  if (!isObjectId(req.params.id)) return fail(res, 400, 'Product must be a valid id.');
  const product = await Product.findById(req.params.id).lean();
  if (!product) return fail(res, 404, 'Product not found');

  const warehouseQuery = {};
  const assigned = req.user.role === 'warehouseManager' ? assignedWarehouseIds(req.user).map(String) : null;
  if (assigned) warehouseQuery._id = { $in: assigned };
  if (req.query.warehouseId && isObjectId(req.query.warehouseId)) {
    if (assigned && !assigned.includes(String(req.query.warehouseId))) return ok(res, []);
    warehouseQuery._id = req.query.warehouseId;
  }
  if (req.query.warehouse) {
    warehouseQuery.name = new RegExp(escapeRegex(req.query.warehouse), 'i');
  }

  const warehouses = await Warehouse.find(warehouseQuery).sort({ name: 1 }).lean();
  const [stocks, usageRows] = await Promise.all([
    Stock.find({ product: product._id }).lean(),
    Stock.aggregate([{ $group: { _id: '$warehouse', total: { $sum: '$quantity' } } }]),
  ]);
  const stockMap = new Map(stocks.map((stock) => [String(stock.warehouse), stock.quantity || 0]));
  const usageMap = new Map(usageRows.map((row) => [String(row._id), row.total || 0]));

  const data = warehouses.map((warehouse) => ({
    warehouseId: String(warehouse._id),
    warehouseName: warehouse.name,
    availableQuantity: stockMap.get(String(warehouse._id)) || 0,
    remainingCapacity: Math.max((Number(warehouse.capacity) || 0) - (usageMap.get(String(warehouse._id)) || 0), 0),
  }));
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
  const archived = req.body.archived === true || req.body.archived === 'true';

  if (!canWriteProducts(req.user)) {
    return fail(res, 403, 'Only admins and warehouse managers can create products.');
  }
  if (!name) return fail(res, 400, 'Name is required.');
  if (!sku) return fail(res, 400, 'SKU is required.');
  if (price === null) return fail(res, 400, 'Price is required and must be a non-negative number.');
  if (!Number.isInteger(lowStockLimit) || lowStockLimit < 0) {
    return fail(res, 400, 'Low stock limit must be a whole number of 0 or greater.');
  }
  if (await Product.exists({ sku })) return fail(res, 409, `A product with SKU "${sku}" already exists.`);

  let supplier = null;
  if (req.body.supplier) {
    if (!isObjectId(req.body.supplier)) return fail(res, 400, 'Supplier must be a valid supplier id.');
    const found = await User.findOne({ _id: req.body.supplier, role: 'supplier' });
    if (!found) return fail(res, 404, `Supplier "${req.body.supplier}" does not exist.`);
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
    archived,
    supplier,
    createdBy: req.user._id,
    ...image.fields,
  });

  return ok(res, product, 'Product created', 201);
});

export const updateProduct = asyncHandler(async (req, res) => {
  if (!canWriteProducts(req.user)) {
    return fail(res, 403, 'Only admins and warehouse managers can edit products.');
  }
  const product = await Product.findById(req.params.id);
  if (!product) return fail(res, 404, `Product "${req.params.id}" does not exist.`);

  if (req.body.name !== undefined) product.name = String(req.body.name).trim();
  if (req.body.description !== undefined) product.description = String(req.body.description);
  if (req.body.category !== undefined) product.category = String(req.body.category).trim() || 'General';
  if (req.body.price !== undefined) {
    const price = priceValue(req.body.price);
    if (price === null) return fail(res, 400, 'Price must be a non-negative number.');
    product.price = price;
  }
  if (req.body.lowStockLimit !== undefined) {
    const limit = Number(req.body.lowStockLimit);
    if (!Number.isInteger(limit) || limit < 0) {
      return fail(res, 400, 'Low stock limit must be a whole number of 0 or greater.');
    }
    product.lowStockLimit = limit;
  }
  if (req.body.archived !== undefined) {
    product.archived = req.body.archived === true || req.body.archived === 'true';
  }
  if (req.body.sku !== undefined) {
    const sku = String(req.body.sku).trim().toUpperCase();
    if (!sku) return fail(res, 400, 'SKU is required.');
    if (await Product.exists({ sku, _id: { $ne: product._id } })) {
      return fail(res, 409, `A product with SKU "${sku}" already exists.`);
    }
    product.sku = sku;
  }
  if (req.body.supplier !== undefined) {
    if (req.body.supplier) {
      if (!isObjectId(req.body.supplier)) return fail(res, 400, 'Supplier must be a valid supplier id.');
      const found = await User.findOne({ _id: req.body.supplier, role: 'supplier' });
      if (!found) return fail(res, 404, `Supplier "${req.body.supplier}" does not exist.`);
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
  if (req.user.role !== 'admin') {
    return fail(res, 403, 'Only admins can delete products.');
  }
  const product = await Product.findById(req.params.id);
  if (!product) return fail(res, 404, `Product "${req.params.id}" does not exist.`);
  await Stock.deleteMany({ product: product._id });
  await deleteImageKitFile(product.imageFileId);
  await product.deleteOne();
  return ok(res, { id: product._id }, 'Product deleted');
});
