import { Schema, model } from 'mongoose';

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, default: '' },
    products: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    processedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

orderSchema.index({ createdBy: 1, createdAt: -1 });

orderSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export const Order = model('Order', orderSchema);
