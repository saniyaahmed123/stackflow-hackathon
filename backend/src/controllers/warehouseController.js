import { Warehouse } from '../models/Warehouse.js';
import { User } from '../models/User.js';
import { Stock } from '../models/Stock.js';
import { assignedWarehouseIds } from '../middleware/auth.js';
import { asyncHandler, fail, nonNegativeInt, ok } from '../utils/http.js';

const populate = (query) => query.populate('manager', 'name email role image');

export const listWarehouses = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user.role === 'warehouseManager') {
    query._id = { $in: assignedWarehouseIds(req.user) };
  }
  const warehouses = await populate(Warehouse.find(query)).sort({ createdAt: -1 });
  return ok(res, warehouses);
});

export const getWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await populate(Warehouse.findById(req.params.id));
  if (!warehouse) return fail(res, 404, 'Warehouse not found');
  return ok(res, warehouse);
});

export const createWarehouse = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const location = String(req.body.location || '').trim();
  const capacity = req.body.capacity === undefined || req.body.capacity === '' ? 0 : nonNegativeInt(req.body.capacity);
  if (!name || !location) return fail(res, 400, 'Name and location are required');
  if (capacity === null) return fail(res, 400, 'Capacity must be a non-negative number');
  if (await Warehouse.exists({ name })) return fail(res, 409, 'Warehouse name already exists');

  let manager = null;
  if (req.body.manager) {
    const found = await User.findOne({ _id: req.body.manager, role: 'warehouseManager' });
    if (!found) return fail(res, 400, 'Manager must be an existing warehouseManager');
    manager = found._id;
  }

  const warehouse = await Warehouse.create({ name, location, capacity, manager });
  if (manager) await User.findByIdAndUpdate(manager, { $addToSet: { assignedWarehouses: warehouse._id } });
  return ok(res, warehouse, 'Warehouse created', 201);
});

export const updateWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await Warehouse.findById(req.params.id);
  if (!warehouse) return fail(res, 404, 'Warehouse not found');

  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) return fail(res, 400, 'Name is required');
    if (await Warehouse.exists({ name, _id: { $ne: warehouse._id } })) return fail(res, 409, 'Name already exists');
    warehouse.name = name;
  }
  if (req.body.location !== undefined) warehouse.location = String(req.body.location).trim();
  if (req.body.capacity !== undefined) {
    const capacity = nonNegativeInt(req.body.capacity);
    if (capacity === null) return fail(res, 400, 'Invalid capacity');
    warehouse.capacity = capacity;
  }
  if (req.body.manager !== undefined) {
    const previous = warehouse.manager;
    if (req.body.manager) {
      const found = await User.findOne({ _id: req.body.manager, role: 'warehouseManager' });
      if (!found) return fail(res, 400, 'Manager must be an existing warehouseManager');
      warehouse.manager = found._id;
      await User.findByIdAndUpdate(found._id, { $addToSet: { assignedWarehouses: warehouse._id } });
    } else {
      warehouse.manager = null;
    }
    if (previous && String(previous) !== String(warehouse.manager || '')) {
      await User.findByIdAndUpdate(previous, { $pull: { assignedWarehouses: warehouse._id } });
    }
  }

  await warehouse.save();
  return ok(res, warehouse, 'Warehouse updated');
});

export const deleteWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await Warehouse.findById(req.params.id);
  if (!warehouse) return fail(res, 404, 'Warehouse not found');
  const stock = await Stock.findOne({ warehouse: warehouse._id, quantity: { $gt: 0 } });
  if (stock) return fail(res, 400, 'Cannot delete a warehouse that still holds stock');
  await Stock.deleteMany({ warehouse: warehouse._id });
  await User.updateMany({ assignedWarehouses: warehouse._id }, { $pull: { assignedWarehouses: warehouse._id } });
  await warehouse.deleteOne();
  return ok(res, { id: warehouse._id }, 'Warehouse deleted');
});
