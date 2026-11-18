import { Schema, model } from 'mongoose';

const supplyRequestSchema = new Schema(
  {
    supplier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    quantity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    note: { type: String, default: '' },
    reviewNote: { type: String, default: '' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

supplyRequestSchema.index({ supplier: 1, createdAt: -1 });

supplyRequestSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export const SupplyRequest = model('SupplyRequest', supplyRequestSchema);
