import { Schema, model } from 'mongoose';

const stockSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    quantity: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

stockSchema.index({ product: 1, warehouse: 1 }, { unique: true });

stockSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export const Stock = model('Stock', stockSchema);
