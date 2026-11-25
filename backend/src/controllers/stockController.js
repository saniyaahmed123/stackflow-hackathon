import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Warehouse } from '../models/Warehouse.js';
import { Stock } from '../models/Stock.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { assignedWarehouseIds, canManageWarehouse } from '../middleware/auth.js';
import { addStockWithCapacity } from '../utils/capacity.js';
import { withTransaction } from '../utils/transaction.js';
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

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const queryWithSession = (query, session) => (session ? query.session(session) : query);

const transferTransactionView = (transaction) => ({
  id: String(transaction._id),
  productId: String(transaction.product),
  warehouseId: String(transaction.warehouse),
  transactionType: transaction.transactionType,
  quantity: Number(transaction.quantity),
  note: transaction.note,
  performedBy: transaction.performedBy ? String(transaction.performedBy) : null,
  date: transaction.date,
  transferId: transaction.transferId ? String(transaction.transferId) : null,
  linkedTransaction: transaction.linkedTransaction ? String(transaction.linkedTransaction) : null,
  transferDirection: transaction.transferDirection || null,
  counterpartyWarehouse: transaction.counterpartyWarehouse ? String(transaction.counterpartyWarehouse) : null,
});

const resolveTransferReferences = async (productId, sourceId, destinationId) => {
  if (!isObjectId(productId) || !isObjectId(sourceId) || !isObjectId(destinationId)) {
    return { error: 'Product, source warehouse and destination warehouse must be valid ids.' };
  }
  const [product, source, destination] = await Promise.all([
    Product.findById(productId),
    Warehouse.findById(sourceId),
    Warehouse.findById(destinationId),
  ]);
  if (!product) return { error: `Product "${productId}" does not exist.` };
  if (!source) return { error: `Source warehouse "${sourceId}" does not exist.` };
  if (!destination) return { error: `Destination warehouse "${destinationId}" does not exist.` };
  return { product, source, destination };
};

const assertDestinationCapacity = async (warehouse, quantity, session) => {
  const aggregate = Stock.aggregate([
    { $match: { warehouse: warehouse._id } },
    { $group: { _id: null, total: { $sum: '$quantity' } } },
  ]);
  if (session) aggregate.session(session);
  const rows = await aggregate;
  const used = Number(rows[0]?.total) || 0;
  const remaining = Math.max((Number(warehouse.capacity) || 0) - used, 0);
  if (quantity > remaining) {
    throw httpError(
      400,
      `Warehouse capacity exceeded: only ${remaining} unit(s) of space remaining in ${warehouse.name}.`
    );
  }
  return remaining - quantity;
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

  let result;
  try {
    result = await withTransaction(async (session, rollbacks) => addStockWithCapacity({
      productId: refs.product._id,
      warehouseId: refs.warehouse._id,
      quantity,
      performedBy: req.user._id,
      note: String(req.body.note || 'Stock added'),
      session,
      rollbacks,
    }));
  } catch (error) {
    return fail(res, error.status || 400, error.message);
  }

  return ok(res, { stock: result.stock, transaction: result.transaction }, `${quantity} unit(s) added to stock`);
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

export const transferStock = asyncHandler(async (req, res) => {
  const quantity = positiveInt(req.body.quantity);
  if (!quantity) return fail(res, 400, INVALID_QUANTITY);

  const productId = req.body.product || req.body.productId;
  const sourceId =
    req.body.sourceWarehouse || req.body.sourceWarehouseId || req.body.fromWarehouse || req.body.fromWarehouseId;
  const destinationId =
    req.body.destinationWarehouse ||
    req.body.destinationWarehouseId ||
    req.body.toWarehouse ||
    req.body.toWarehouseId;

  if (!productId) return fail(res, 400, 'Product is required.');
  if (!sourceId) return fail(res, 400, 'Source warehouse is required.');
  if (!destinationId) return fail(res, 400, 'Destination warehouse is required.');
  if (String(sourceId) === String(destinationId)) {
    return fail(res, 400, 'Source and destination warehouses must be different.');
  }
  if (!canManageWarehouse(req.user, sourceId)) {
    return fail(res, 403, 'You are not assigned to the source warehouse.');
  }

  const refs = await resolveTransferReferences(productId, sourceId, destinationId);
  if (refs.error) return fail(res, 400, refs.error);

  const transferId = new mongoose.Types.ObjectId();
  const date = new Date();
  let result;

  try {
    result = await withTransaction(async (session, rollbacks) => {
      const options = session ? { session } : {};

      await Warehouse.updateOne({ _id: refs.destination._id }, { $inc: { __v: 0 } }, options);

      const sourceStock = await Stock.findOneAndUpdate(
        { product: refs.product._id, warehouse: refs.source._id, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } },
        { new: true, ...options }
      );
      if (!sourceStock) {
        const current = await queryWithSession(
          Stock.findOne({ product: refs.product._id, warehouse: refs.source._id }).select('quantity'),
          session
        );
        throw httpError(
          400,
          stockShortfallMessage({
            productName: refs.product.name,
            available: current?.quantity || 0,
            requested: quantity,
            warehouseName: refs.source.name,
          })
        );
      }
      rollbacks.push(async () => {
        await Stock.updateOne({ _id: sourceStock._id }, { $inc: { quantity } });
      });

      const remainingAfter = await assertDestinationCapacity(refs.destination, quantity, session);

      const existingDestinationStock = await queryWithSession(
        Stock.findOne({ product: refs.product._id, warehouse: refs.destination._id }).select('_id'),
        session
      );
      const destinationStock = await Stock.findOneAndUpdate(
        { product: refs.product._id, warehouse: refs.destination._id },
        { $inc: { quantity } },
        { new: true, upsert: true, setDefaultsOnInsert: true, ...options }
      );
      if (existingDestinationStock) {
        rollbacks.push(async () => {
          await Stock.updateOne({ _id: destinationStock._id }, { $inc: { quantity: -quantity } });
        });
      } else {
        rollbacks.push(async () => {
          await Stock.deleteOne({ _id: destinationStock._id });
        });
      }

      const [stockOutTransaction] = await StockTransaction.create(
        [
          {
            product: refs.product._id,
            warehouse: refs.source._id,
            transactionType: 'stock-out',
            quantity,
            note: `Transfer to ${refs.destination.name}`,
            performedBy: req.user._id,
            date,
            transferId,
            transferDirection: 'out',
            counterpartyWarehouse: refs.destination._id,
          },
        ],
        options
      );
      rollbacks.push(async () => {
        await StockTransaction.deleteOne({ _id: stockOutTransaction._id });
      });

      const [stockInTransaction] = await StockTransaction.create(
        [
          {
            product: refs.product._id,
            warehouse: refs.destination._id,
            transactionType: 'stock-in',
            quantity,
            note: `Transfer from ${refs.source.name}`,
            performedBy: req.user._id,
            date,
            transferId,
            transferDirection: 'in',
            counterpartyWarehouse: refs.source._id,
            linkedTransaction: stockOutTransaction._id,
          },
        ],
        options
      );
      rollbacks.push(async () => {
        await StockTransaction.deleteOne({ _id: stockInTransaction._id });
      });

      await StockTransaction.updateOne(
        { _id: stockOutTransaction._id },
        { $set: { linkedTransaction: stockInTransaction._id } },
        options
      );
      stockOutTransaction.linkedTransaction = stockInTransaction._id;

      return { sourceStock, destinationStock, stockOutTransaction, stockInTransaction, remainingAfter };
    }, 8);
  } catch (error) {
    return fail(res, error.status || 409, error.message || 'Stock transfer failed.');
  }

  return ok(
    res,
    {
      transferId: String(transferId),
      product: { id: String(refs.product._id), name: refs.product.name, sku: refs.product.sku },
      sourceWarehouse: { id: String(refs.source._id), name: refs.source.name },
      destinationWarehouse: { id: String(refs.destination._id), name: refs.destination.name },
      quantity,
      sourceStock: { id: String(result.sourceStock._id), quantity: Number(result.sourceStock.quantity) },
      destinationStock: { id: String(result.destinationStock._id), quantity: Number(result.destinationStock.quantity) },
      remainingDestinationSpace: Number(result.remainingAfter),
      stockOutTransaction: transferTransactionView(result.stockOutTransaction),
      stockInTransaction: transferTransactionView(result.stockInTransaction),
    },
    `${quantity} unit(s) transferred from ${refs.source.name} to ${refs.destination.name}`,
    201
  );
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
    .filter((stock) => stock.product && (Number(stock.quantity) === 0 || Number(stock.quantity) < (Number(stock.product.lowStockLimit) || 0)))
    .map((stock) => {
      const threshold = Number(stock.product.lowStockLimit) || 0;
      const quantity = Number(stock.quantity) || 0;
      const unitsBelowThreshold = Math.max(threshold - quantity, 0);
      return {
        ...stock,
        threshold,
        lowStock: quantity === 0 || quantity < threshold,
        outOfStock: quantity === 0,
        unitsBelowThreshold,
        shortfall: unitsBelowThreshold,
      };
    });
  return ok(res, data);
});
