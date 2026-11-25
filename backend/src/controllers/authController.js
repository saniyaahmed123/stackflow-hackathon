import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { isImageKitUrl } from '../config/imagekit.js';
import { signToken } from '../middleware/auth.js';
import { asyncHandler, fail, ok } from '../utils/http.js';

const PUBLIC_ROLES = ['supplier', 'warehouseManager', 'salesRepresentative'];

export const register = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!name) return fail(res, 400, 'Name is required.');
  if (!email) return fail(res, 400, 'Email is required.');
  if (!password) return fail(res, 400, 'Password is required.');
  if (password.length < 6) return fail(res, 400, 'Password must be at least 6 characters.');
  if (await User.exists({ email })) return fail(res, 409, `An account with email "${email}" already exists.`);

  const requestedRole = String(req.body.role || 'salesRepresentative');
  if (requestedRole === 'admin' && req.user?.role !== 'admin') {
    return fail(res, 403, 'Admin accounts can only be created by an administrator.');
  }
  const role = requestedRole === 'admin'
    ? 'admin'
    : PUBLIC_ROLES.includes(requestedRole)
      ? requestedRole
      : 'salesRepresentative';

  const image = String(req.body.image || '');
  const imageFileId = String(req.body.imageFileId || '');
  if ((image || imageFileId) && (!image || !imageFileId || !isImageKitUrl(image))) {
    return fail(res, 400, 'Profile images must be uploaded through ImageKit');
  }

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    phone: String(req.body.phone || ''),
    role,
    image,
    imageFileId,
  });

  return ok(res, { token: signToken(user), user }, 'Account created', 201);
});

export const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email) return fail(res, 400, 'Email is required.');
  if (!password) return fail(res, 400, 'Password is required.');

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return fail(res, 401, 'Invalid email or password');
  }
  if (user.isActive === false) {
    return fail(res, 403, 'This account is deactivated. Please contact an administrator.');
  }

  return ok(res, { token: signToken(user), user: user.toJSON() }, 'Logged in');
});

export const me = asyncHandler(async (req, res) => ok(res, req.user));
