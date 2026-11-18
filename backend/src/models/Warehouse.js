import { Schema, model } from 'mongoose';

const warehouseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    location: { type: String, required: true, trim: true },
    manager: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    capacity: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

warehouseSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export const Warehouse = model('Warehouse', warehouseSchema);
