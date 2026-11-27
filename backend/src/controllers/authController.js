import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { asyncHandler, fail, ok } from '../utils/http.js';

const PUBLIC_ROLES = ['salesRepresentative', 'supplier'];

export const register = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const password = String(req.body.password || '');
  const role = String(req.body.role || 'salesRepresentative');

  if (!name) return fail(res, 400, 'Name is required.');
  if (!email) return fail(res, 400, 'Email is required.');
  if (!phone) return fail(res, 400, 'Phone is required.');
  if (!password) return fail(res, 400, 'Password is required.');
  if (password.length < 6) return fail(res, 400, 'Password must be at least 6 characters.');
  if (!PUBLIC_ROLES.includes(role)) return fail(res, 403, 'This role cannot self-register.');
  if (await User.exists({ email })) return fail(res, 409, `An account with email "${email}" already exists.`);

  const user = await User.create({
    name,
    email,
    phone,
    password: await bcrypt.hash(password, 10),
    role,
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

export const changePassword = asyncHandler(async (req, res) => {
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');
  const confirmPassword = String(req.body.confirmPassword ?? newPassword);

  if (!currentPassword) return fail(res, 400, 'Current password is required.');
  if (!newPassword) return fail(res, 400, 'New password is required.');
  if (newPassword.length < 6) return fail(res, 400, 'New password must be at least 6 characters.');
  if (newPassword !== confirmPassword) return fail(res, 400, 'Passwords do not match.');
  if (newPassword === currentPassword) return fail(res, 400, 'Choose a password different from the current one.');

  const user = await User.findById(req.user._id).select('+password');
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return fail(res, 401, 'Current password is incorrect.');
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  return ok(res, { changed: true }, 'Password updated');
});

export const me = asyncHandler(async (req, res) => ok(res, req.user));
