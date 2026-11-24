import { Warehouse } from '../models/Warehouse.js';
import { User } from '../models/User.js';
import { Stock } from '../models/Stock.js';
import { assignedWarehouseIds, canManageWarehouse } from '../middleware/auth.js';
import { asyncHandler, fail, isObjectId, nonNegativeInt, ok } from '../utils/http.js';
import { listOptions, setPaginationHeaders } from '../utils/list.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const populate = (query) => query.populate('manager', 'name email role image');

export const listWarehouses = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user.role === 'warehouseManager') {
    query._id = { $in: assignedWarehouseIds(req.user) };
  }
  if (req.query.q) {
    const pattern = new RegExp(escapeRegex(req.query.q), 'i');
    query.$or = [{ name: pattern }, { location: pattern }];
  }
  if (req.query.location) query.location = new RegExp(`^${escapeRegex(req.query.location)}$`, 'i');
  if (req.query.manager && isObjectId(req.query.manager)) query.manager = req.query.manager;

  const opts = listOptions(req, {
    sortFields: { createdAt: 'createdAt', name: 'name', location: 'location', capacity: 'capacity' },
    defaultSort: { createdAt: -1 },
  });
  const total = await Warehouse.countDocuments(query);
  const warehouses = await populate(Warehouse.find(query))
    .sort(opts.sort)
    .skip(opts.skip)
    .limit(opts.limit);
  setPaginationHeaders(res, opts.page, opts.limit, total);
  return ok(res, warehouses);
});

export const getWarehouse = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return fail(res, 400, 'Warehouse must be a valid id.');
  const warehouse = await populate(Warehouse.findById(req.params.id));
  if (!warehouse) return fail(res, 404, 'Warehouse not found');
  if (req.user.role === 'warehouseManager' && !canManageWarehouse(req.user, warehouse._id)) {
    return fail(res, 403, 'You are not assigned to this warehouse.');
  }
  return ok(res, warehouse);
});

export const createWarehouse = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const location = String(req.body.location || '').trim();
  const capacity = req.body.capacity === undefined || req.body.capacity === '' ? 0 : nonNegativeInt(req.body.capacity);
  if (!name) return fail(res, 400, 'Warehouse name is required.');
  if (!location) return fail(res, 400, 'Warehouse location is required.');
  if (capacity === null) return fail(res, 400, 'Capacity must be a whole number of 0 or greater.');
  if (await Warehouse.exists({ name })) return fail(res, 409, `A warehouse named "${name}" already exists.`);

  let manager = null;
  if (req.body.manager) {
    const found = await User.findOne({ _id: req.body.manager, role: 'warehouseManager' });
    if (!found) return fail(res, 404, `Manager "${req.body.manager}" does not exist or is not a warehouse manager.`);
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
    if (await Warehouse.exists({ name, _id: { $ne: warehouse._id } })) return fail(res, 409, `A warehouse named "${name}" already exists.`);
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
      if (!found) return fail(res, 404, `Manager "${req.body.manager}" does not exist or is not a warehouse manager.`);
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
  const stock = await Stock.findOne({ warehouse: warehouse._id, quantity: { $gt: 0 } }).populate('product', 'name');
  if (stock) {
    return fail(res, 400, `Cannot delete "${warehouse.name}" because it still holds ${stock.quantity} units of ${stock.product?.name || 'a product'}. Move or remove that stock first.`);
  }
  await Stock.deleteMany({ warehouse: warehouse._id });
  await User.updateMany({ assignedWarehouses: warehouse._id }, { $pull: { assignedWarehouses: warehouse._id } });
  await warehouse.deleteOne();
  return ok(res, { id: warehouse._id }, 'Warehouse deleted');
});
