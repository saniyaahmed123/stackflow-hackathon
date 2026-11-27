import bcrypt from 'bcryptjs';
import { User, ROLES } from '../models/User.js';
import { isImageKitUrl } from '../config/imagekit.js';
import { Warehouse } from '../models/Warehouse.js';
import { asyncHandler, fail, isObjectId, ok } from '../utils/http.js';
import { listOptions, setPaginationHeaders } from '../utils/list.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const booleanValue = (value) => {
  if (value === true || String(value).toLowerCase() === 'true') return true;
  if (value === false || String(value).toLowerCase() === 'false') return false;
  return null;
};

const adminChangeError = async (req, user, nextRole, nextActive) => {
  const actingOnSelf = String(req.user._id) === String(user._id);
  const demoting = nextRole !== undefined && nextRole !== 'admin';
  const deactivating = nextActive === false;

  if (actingOnSelf && demoting) return 'You cannot demote your own admin account.';
  if (user.role === 'admin' && user.isActive !== false && (demoting || deactivating)) {
    const activeAdmins = await User.countDocuments({ role: 'admin', isActive: { $ne: false } });
    if (activeAdmins <= 1) {
      return deactivating
        ? 'The last active admin cannot be deactivated.'
        : 'The last active admin cannot be demoted.';
    }
  }
  if (actingOnSelf && deactivating) return 'You cannot deactivate your own account.';
  return null;
};

export const createUser = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '');
  const password = String(req.body.password || '');
  const role = String(req.body.role || 'salesRepresentative');

  if (!name) return fail(res, 400, 'Name is required.');
  if (!email) return fail(res, 400, 'Email is required.');
  if (password.length < 6) return fail(res, 400, 'Password must be at least 6 characters.');
  if (!ROLES.includes(role)) return fail(res, 400, 'Invalid role.');
  if (await User.exists({ email })) return fail(res, 409, `An account with email "${email}" already exists.`);

  let isActive = true;
  if (req.body.isActive !== undefined) {
    isActive = booleanValue(req.body.isActive);
    if (isActive === null) return fail(res, 400, 'isActive must be true or false');
  }

  let assignedWarehouses = [];
  if (req.body.assignedWarehouses !== undefined) {
    if (!Array.isArray(req.body.assignedWarehouses)) {
      return fail(res, 400, 'assignedWarehouses must be an array of warehouse ids');
    }
    if (role !== 'warehouseManager' && req.body.assignedWarehouses.length > 0) {
      return fail(res, 400, 'Only warehouse managers can be assigned to warehouses');
    }
    assignedWarehouses = role === 'warehouseManager' ? req.body.assignedWarehouses : [];
    if (assignedWarehouses.some((id) => !isObjectId(id))) {
      return fail(res, 400, 'assignedWarehouses must be an array of warehouse ids');
    }
    const count = await Warehouse.countDocuments({ _id: { $in: assignedWarehouses } });
    if (count !== assignedWarehouses.length) return fail(res, 400, 'One or more warehouses do not exist');
  }

  const image = String(req.body.image || '');
  const imageFileId = String(req.body.imageFileId || '');
  if ((image || imageFileId) && (!image || !imageFileId || !isImageKitUrl(image))) {
    return fail(res, 400, 'Profile images must be uploaded through ImageKit');
  }

  const user = await User.create({
    name,
    email,
    phone,
    password: await bcrypt.hash(password, 10),
    role,
    isActive,
    assignedWarehouses,
    image,
    imageFileId,
  });

  const populated = await User.findById(user._id)
    .select('-password')
    .populate('assignedWarehouses', 'name location');
  return ok(res, populated, 'User created', 201);
});

export const listUsers = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.role && ROLES.includes(req.query.role)) query.role = req.query.role;
  if (req.query.isActive === 'true' || req.query.isActive === 'false') {
    query.isActive = req.query.isActive === 'true';
  }
  if (req.query.q) {
    const pattern = new RegExp(escapeRegex(req.query.q), 'i');
    query.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }

  const opts = listOptions(req, {
    sortFields: { createdAt: 'createdAt', name: 'name', email: 'email', role: 'role' },
    defaultSort: { createdAt: -1 },
  });
  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .select('-password')
    .populate('assignedWarehouses', 'name location')
    .sort(opts.sort)
    .skip(opts.skip)
    .limit(opts.limit);
  setPaginationHeaders(res, opts.page, opts.limit, total);
  return ok(res, users);
});

export const listSuppliers = asyncHandler(async (_req, res) => {
  const suppliers = await User.find({ role: 'supplier' }).select('name email image').sort({ name: 1 });
  return ok(res, suppliers);
});

export const listSupplierSummaries = asyncHandler(async (_req, res) => {
  const suppliers = await User.aggregate([
    { $match: { role: 'supplier' } },
    {
      $lookup: {
        from: 'products',
        let: { supplierId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$supplier', '$$supplierId'] } } },
          { $project: { name: 1, sku: 1, category: 1, price: 1, imageUrl: 1 } },
          { $sort: { name: 1 } },
        ],
        as: 'products',
      },
    },
    {
      $lookup: {
        from: 'supplyrequests',
        let: { supplierId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$supplier', '$$supplierId'] } } },
          { $group: { _id: null, total: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } } } },
        ],
        as: 'requestCounts',
      },
    },
    {
      $lookup: {
        from: 'supplyrequests',
        let: { supplierId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$supplier', '$$supplierId'] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 5 },
          { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'product' } },
          { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
          { $lookup: { from: 'warehouses', localField: 'warehouse', foreignField: '_id', as: 'warehouse' } },
          { $unwind: { path: '$warehouse', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              status: 1, quantity: 1, createdAt: 1, reviewNote: 1, reviewedAt: 1,
              productName: '$product.name', warehouseName: '$warehouse.name',
            },
          },
        ],
        as: 'recentRequests',
      },
    },
    {
      $addFields: {
        productCount: { $size: '$products' },
        totalRequests: { $ifNull: [{ $arrayElemAt: ['$requestCounts.total', 0] }, 0] },
        pendingRequests: { $ifNull: [{ $arrayElemAt: ['$requestCounts.pending', 0] }, 0] },
      },
    },
    { $sort: { name: 1 } },
    { $project: { requestCounts: 0, password: 0, __v: 0 } },
  ]);
  return ok(res, suppliers);
});

export const getUser = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && String(req.user._id) !== req.params.id) {
    return fail(res, 403, 'You can only view your own profile');
  }
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('assignedWarehouses', 'name location');
  if (!user) return fail(res, 404, 'User not found');
  return ok(res, user);
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return fail(res, 404, 'User not found');

  const { name, email, phone, role, isActive, assignedWarehouses, password, image, imageFileId } = req.body;
  const nextRole = role === undefined ? undefined : String(role);
  let nextActive;
  if (isActive !== undefined) {
    nextActive = booleanValue(isActive);
    if (nextActive === null) return fail(res, 400, 'isActive must be true or false');
  }
  if (nextRole !== undefined && !ROLES.includes(nextRole)) return fail(res, 400, 'Invalid role');
  const effectiveRole = nextRole !== undefined ? nextRole : user.role;
  if (assignedWarehouses !== undefined && !Array.isArray(assignedWarehouses)) {
    return fail(res, 400, 'assignedWarehouses must be an array of warehouse ids');
  }
  if (effectiveRole !== 'warehouseManager' && assignedWarehouses?.length > 0) {
    return fail(res, 400, 'Only warehouse managers can be assigned to warehouses');
  }
  const guardError = await adminChangeError(req, user, nextRole, nextActive);
  if (guardError) return fail(res, 400, guardError);

  if (name !== undefined) user.name = String(name).trim();
  if (phone !== undefined) user.phone = String(phone);
  if (email !== undefined) {
    const normalized = String(email).trim().toLowerCase();
    const duplicate = await User.findOne({ email: normalized, _id: { $ne: user._id } });
    if (duplicate) return fail(res, 409, `Email "${normalized}" is already in use by another account.`);
    user.email = normalized;
  }
  if (nextRole !== undefined) user.role = nextRole;
  if (nextActive !== undefined) user.isActive = nextActive;
  if (effectiveRole !== 'warehouseManager') {
    user.assignedWarehouses = [];
  } else if (assignedWarehouses !== undefined) {
    if (assignedWarehouses.some((id) => !isObjectId(id))) {
      return fail(res, 400, 'assignedWarehouses must be an array of warehouse ids');
    }
    const count = await Warehouse.countDocuments({ _id: { $in: assignedWarehouses } });
    if (count !== assignedWarehouses.length) return fail(res, 400, 'One or more warehouses do not exist');
    user.assignedWarehouses = assignedWarehouses;
  }
  const imageChanged = image !== undefined && String(image) !== user.image;
  const fileIdChanged = imageFileId !== undefined && String(imageFileId) !== user.imageFileId;
  if (imageChanged || fileIdChanged) {
    const nextImage = String(image ?? user.image);
    const nextFileId = String(imageFileId ?? user.imageFileId);
    if ((nextImage || nextFileId) && (!nextImage || !nextFileId || !isImageKitUrl(nextImage))) {
      return fail(res, 400, 'Profile images must be uploaded through ImageKit');
    }
    user.image = nextImage;
    user.imageFileId = nextFileId;
  }
  if (password !== undefined) {
    if (String(password).length < 6) return fail(res, 400, 'Password must be at least 6 characters');
    user.password = await bcrypt.hash(String(password), 10);
  }

  await user.save();
  const populated = await User.findById(user._id)
    .select('-password')
    .populate('assignedWarehouses', 'name location');
  return ok(res, populated, 'User updated');
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { name, email, phone, image, imageFileId } = req.body;

  if (name !== undefined) user.name = String(name).trim();
  if (phone !== undefined) user.phone = String(phone);
  if (email !== undefined) {
    const normalized = String(email).trim().toLowerCase();
    const duplicate = await User.findOne({ email: normalized, _id: { $ne: user._id } });
    if (duplicate) return fail(res, 409, `Email "${normalized}" is already in use by another account.`);
    user.email = normalized;
  }
  const imageChanged = image !== undefined && String(image) !== user.image;
  const fileIdChanged = imageFileId !== undefined && String(imageFileId) !== user.imageFileId;
  if (imageChanged || fileIdChanged) {
    const nextImage = String(image ?? user.image);
    const nextFileId = String(imageFileId ?? user.imageFileId);
    if ((nextImage || nextFileId) && (!nextImage || !nextFileId || !isImageKitUrl(nextImage))) {
      return fail(res, 400, 'Profile images must be uploaded through ImageKit');
    }
    user.image = nextImage;
    user.imageFileId = nextFileId;
  }
  await user.save();
  const updated = await User.findById(user._id).select('-password').populate('assignedWarehouses', 'name location');
  return ok(res, updated, 'Profile updated');
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.user._id) === req.params.id) return fail(res, 400, 'You cannot delete your own account');
  const user = await User.findById(req.params.id);
  if (!user) return fail(res, 404, 'User not found');
  if (user.role === 'admin' && user.isActive !== false) {
    const activeAdmins = await User.countDocuments({ role: 'admin', isActive: { $ne: false } });
    if (activeAdmins <= 1) return fail(res, 400, 'The last active admin cannot be deleted.');
  }
  await user.deleteOne();
  return ok(res, { id: user._id }, 'User deleted');
});
