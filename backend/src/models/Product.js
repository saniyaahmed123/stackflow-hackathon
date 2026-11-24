import { Schema, model } from 'mongoose';

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    category: { type: String, default: 'General', trim: true },
    price: { type: Number, required: true, min: 0 },
    lowStockLimit: { type: Number, default: 5, min: 0 },
    archived: { type: Boolean, default: false },
    imageUrl: { type: String, default: '' },
    imageFileId: { type: String, default: '' },
    supplier: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', sku: 'text', category: 'text' });

productSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export const Product = model('Product', productSchema);
