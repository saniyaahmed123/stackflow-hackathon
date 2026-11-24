import { SupplyRequest } from '../models/SupplyRequest.js';
import { Product } from '../models/Product.js';
import { Warehouse } from '../models/Warehouse.js';
import { Stock } from '../models/Stock.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { assignedWarehouseIds } from '../middleware/auth.js';
import { withTransaction } from '../utils/transaction.js';
import { asyncHandler, fail, INVALID_QUANTITY, isObjectId, ok, positiveInt } from '../utils/http.js';

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
  const requests = await populateRequest(SupplyRequest.find(query)).sort({ createdAt: -1 });
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
        const options = session ? { session } : {};
        const stock = await Stock.findOneAndUpdate(
          { product: request.product, warehouse: request.warehouse },
          { $inc: { quantity: request.quantity } },
          { new: true, upsert: true, setDefaultsOnInsert: true, ...options }
        );
        const txData = {
          product: request.product,
          warehouse: request.warehouse,
          transactionType: 'stock-in',
          quantity: request.quantity,
          note: `Supply request approved${request.note ? `: ${request.note}` : ''}`,
          performedBy: req.user._id,
          date: new Date(),
        };
        const transaction = session
          ? (await StockTransaction.create([txData], { session }))[0]
          : await StockTransaction.create(txData);
        if (!session) {
          rollbacks.push(async () => {
            await Stock.updateOne(
              { product: request.product, warehouse: request.warehouse },
              { $inc: { quantity: -request.quantity } }
            );
            await StockTransaction.deleteOne({ _id: transaction._id });
          });
        }
        void stock;
      }
      request.status = status;
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      request.reviewNote = reason;
      await request.save(session ? { session } : undefined);
    });
  } catch (error) {
    return fail(res, 400, error.message || 'Could not review request');
  }

  return ok(res, await populateRequest(SupplyRequest.findById(request._id)), `Request ${status.toLowerCase()}`);
});
