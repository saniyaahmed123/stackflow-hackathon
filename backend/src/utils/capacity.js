import { Stock } from '../models/Stock.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { Warehouse } from '../models/Warehouse.js';

export async function addStockWithCapacity({
  productId,
  warehouseId,
  quantity,
  performedBy,
  note,
  date = new Date(),
  session = null,
  rollbacks = [],
}) {
  const options = session ? { session } : {};
  const warehouse = await Warehouse.findById(warehouseId).lean(options);
  if (!warehouse) {
    const error = new Error(`Warehouse "${warehouseId}" does not exist.`);
    error.status = 404;
    throw error;
  }

  const aggregate = Stock.aggregate([
    { $match: { warehouse: warehouse._id } },
    { $group: { _id: null, total: { $sum: '$quantity' } } },
  ]);
  if (session) aggregate.session(session);
  const rows = await aggregate;
  const used = rows[0]?.total || 0;
  const capacity = Number(warehouse.capacity) || 0;
  const remaining = Math.max(capacity - used, 0);

  if (quantity > remaining) {
    const error = new Error(
      `Warehouse capacity exceeded: only ${remaining} unit(s) of space remaining in ${warehouse.name}.`
    );
    error.status = 400;
    throw error;
  }

  await Warehouse.updateOne({ _id: warehouse._id }, { $inc: { __v: 0 } }, options);

  const stock = await Stock.findOneAndUpdate(
    { product: productId, warehouse: warehouse._id },
    { $inc: { quantity } },
    { new: true, upsert: true, setDefaultsOnInsert: true, ...options }
  );

  const transaction = (
    await StockTransaction.create(
      [
        {
          product: productId,
          warehouse: warehouse._id,
          transactionType: 'stock-in',
          quantity,
          note,
          performedBy,
          date,
        },
      ],
      options
    )
  )[0];

  if (!session) {
    rollbacks.push(async () => {
      await Stock.updateOne(
        { product: productId, warehouse: warehouse._id },
        { $inc: { quantity: -quantity } }
      );
      await StockTransaction.deleteOne({ _id: transaction._id });
    });
  }

  return { stock, transaction, remainingAfter: remaining - quantity };
}
