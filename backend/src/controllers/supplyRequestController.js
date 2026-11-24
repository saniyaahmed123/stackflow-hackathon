import { SupplyRequest } from '../models/SupplyRequest.js';
import { Product } from '../models/Product.js';
import { Warehouse } from '../models/Warehouse.js';
import { assignedWarehouseIds } from '../middleware/auth.js';
import { addStockWithCapacity } from '../utils/capacity.js';
import { withTransaction } from '../utils/transaction.js';
import { asyncHandler, fail, INVALID_QUANTITY, isObjectId, ok, positiveInt } from '../utils/http.js';
import { listOptions, setPaginationHeaders } from '../utils/list.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const populateRequest = (query) =>
  query
    .populate('supplier', 'name email image')
    .populate('product', 'name sku imageUrl category')
    .populate('warehouse', 'name location')
    .populate('reviewedBy', 'name email');

export const createRequest = asyncHandler(async (req, res) => {
  const quantity = positiveInt(req.body.quantity);
  if (!quantity) return fail(res, 400, INVALID_QUANTITY);
  if (!req.body.productId) return fail(res, 400, 'Product is required.');
  if (!req.body.warehouseId) return fail(res, 400, 'Warehouse is required.');
  if (!isObjectId(req.body.productId) || !isObjectId(req.body.warehouseId)) {
    return fail(res, 400, 'Product and Warehouse must be valid ids.');
  }
  const [product, warehouse] = await Promise.all([
    Product.findById(req.body.productId),
    Warehouse.findById(req.body.warehouseId),
  ]);
  if (!product) return fail(res, 404, `Product "${req.body.productId}" does not exist.`);
  if (!warehouse) return fail(res, 404, `Warehouse "${req.body.warehouseId}" does not exist.`);
  if (String(product.supplier) !== String(req.user._id)) {
    return fail(res, 403, 'You can only request supplies for your own products.');
  }

  const request = await SupplyRequest.create({
    supplier: req.user._id,
    product: product._id,
    warehouse: warehouse._id,
    quantity,
    note: String(req.body.note || ''),
    status: 'Pending',
  });
  return ok(res, await populateRequest(SupplyRequest.findById(request._id)), 'Supply request submitted', 201);
});

export const listRequests = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user.role === 'supplier') query.supplier = req.user._id;
  else if (req.user.role === 'warehouseManager') query.warehouse = { $in: assignedWarehouseIds(req.user) };
  else if (req.user.role === 'salesRepresentative') {
    return fail(res, 403, 'Sales representatives cannot view supply requests');
  }
  if (['Pending', 'Approved', 'Rejected'].includes(req.query.status)) query.status = req.query.status;
  if (req.query.productId && isObjectId(req.query.productId)) query.product = req.query.productId;
  if (req.user.role === 'admin') {
    if (req.query.warehouseId && isObjectId(req.query.warehouseId)) query.warehouse = req.query.warehouseId;
    if (req.query.supplierId && isObjectId(req.query.supplierId)) query.supplier = req.query.supplierId;
  }
  if (req.query.q) {
    const pattern = new RegExp(escapeRegex(req.query.q), 'i');
    const products = await Product.find({ name: pattern }).select('_id');
    query.$or = [{ note: pattern }, { reviewNote: pattern }, { product: { $in: products.map((item) => item._id) } }];
  }

  const opts = listOptions(req, {
    sortFields: { createdAt: 'createdAt', updatedAt: 'updatedAt', status: 'status', quantity: 'quantity' },
    defaultSort: { createdAt: -1 },
  });
  const total = await SupplyRequest.countDocuments(query);
  const requests = await populateRequest(SupplyRequest.find(query))
    .sort(opts.sort)
    .skip(opts.skip)
    .limit(opts.limit);
  setPaginationHeaders(res, opts.page, opts.limit, total);
  return ok(res, requests);
});

export const getRequest = asyncHandler(async (req, res) => {
  const request = await populateRequest(SupplyRequest.findById(req.params.id));
  if (!request) return fail(res, 404, 'Supply request not found');
  if (req.user.role === 'supplier' && String(request.supplier?._id || request.supplier) !== String(req.user._id)) {
    return fail(res, 403, 'You can only view your own supply requests');
  }
  if (req.user.role === 'salesRepresentative') return fail(res, 403, 'Not allowed');
  return ok(res, request);
});

export const reviewRequest = asyncHandler(async (req, res) => {
  const status = String(req.body.status || '');
  if (!['Approved', 'Rejected'].includes(status)) return fail(res, 400, 'Status must be Approved or Rejected.');

  const reason = String(req.body.note || '').trim();
  if (status === 'Rejected' && reason.length < 5) {
    return fail(res, 400, 'A rejection reason of at least 5 characters is required.');
  }

  const request = await SupplyRequest.findById(req.params.id);
  if (!request) return fail(res, 404, `Supply request "${req.params.id}" does not exist.`);
  if (request.status !== 'Pending') {
    return fail(res, 400, `This request has already been ${request.status.toLowerCase()} and cannot be reviewed again.`);
  }

  try {
    await withTransaction(async (session, rollbacks) => {
      if (status === 'Approved') {
        await addStockWithCapacity({
          productId: request.product,
          warehouseId: request.warehouse,
          quantity: request.quantity,
          performedBy: req.user._id,
          note: `Supply request approved${request.note ? `: ${request.note}` : ''}`,
          session,
          rollbacks,
        });
      }
      const options = session ? { session } : undefined;
      const updated = await SupplyRequest.updateOne(
        { _id: request._id, status: 'Pending' },
        {
          $set: {
            status,
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
            reviewNote: reason,
          },
        },
        options
      );
      if (updated.matchedCount === 0) {
        const current = await SupplyRequest.findById(request._id).select('status').lean();
        const error = new Error(
          current ? `This request has already been ${String(current.status).toLowerCase()}.` : 'Supply request not found.'
        );
        error.status = 409;
        throw error;
      }
    });
  } catch (error) {
    return fail(res, error.status || 400, error.message || 'Could not review request');
  }

  return ok(res, await populateRequest(SupplyRequest.findById(request._id)), `Request ${status.toLowerCase()}`);
});
