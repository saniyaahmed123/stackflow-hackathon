import { Schema, model } from 'mongoose';

export const ROLES = ['admin', 'warehouseManager', 'supplier', 'salesRepresentative'];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, default: '' },
    role: { type: String, enum: ROLES, required: true, default: 'salesRepresentative' },
    isActive: { type: Boolean, default: true },
    assignedWarehouses: [{ type: Schema.Types.ObjectId, ref: 'Warehouse' }],
    image: { type: String, default: '' },
    imageFileId: { type: String, default: '' },
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export const User = model('User', userSchema);
