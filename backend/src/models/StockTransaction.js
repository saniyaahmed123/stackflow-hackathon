import { Schema, model } from 'mongoose';

const stockTransactionSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    transactionType: { type: String, enum: ['stock-in', 'stock-out'], required: true },
    quantity: { type: Number, required: true, min: 1 },
    note: { type: String, default: '' },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    date: { type: Date, default: Date.now },
    transferId: { type: Schema.Types.ObjectId, default: null, select: false, index: true },
    linkedTransaction: { type: Schema.Types.ObjectId, ref: 'StockTransaction', default: null, select: false },
    transferDirection: { type: String, enum: ['out', 'in'], default: null, select: false },
    counterpartyWarehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', default: null, select: false },
  },
  { timestamps: true }
);

stockTransactionSchema.index({ date: -1 });

stockTransactionSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export const StockTransaction = model('StockTransaction', stockTransactionSchema);
