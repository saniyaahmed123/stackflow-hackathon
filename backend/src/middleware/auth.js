import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { asyncHandler, fail } from '../utils/http.js';

export const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpires });

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return fail(res, 401, 'Authentication required');

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('assignedWarehouses', 'name location');
    if (!user) return fail(res, 401, 'Invalid or expired token');
    req.user = user;
    return next();
  } catch {
    return fail(res, 401, 'Invalid or expired token');
  }
});

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return fail(res, 401, 'Authentication required');
  if (!roles.includes(req.user.role)) return fail(res, 403, 'You do not have permission for this action');
  return next();
};

export const adminOnly = authorize('admin');

export const canManageWarehouse = (user, warehouseId) => {
  if (!user || !warehouseId) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'warehouseManager') return false;
  const target = String(warehouseId);
  return (user.assignedWarehouses || []).some((warehouse) =>
    String(warehouse?._id || warehouse) === target
  );
};

export const assignedWarehouseIds = (user) =>
  (user.assignedWarehouses || []).map((warehouse) => warehouse?._id || warehouse);
