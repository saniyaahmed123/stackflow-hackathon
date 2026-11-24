export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export const ok = (res, data, message, status = 200) =>
  res.status(status).json({ success: true, ...(message ? { message } : {}), data });

export const fail = (res, status, message, extra = {}) =>
  res.status(status).json({ success: false, message, ...extra });

export const positiveInt = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

export const nonNegativeInt = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
};

export const priceValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : null;
};

export const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ''));

export const INVALID_QUANTITY = 'Quantity must be a whole number greater than 0';

export const stockShortfallMessage = ({ productName, available, requested, warehouseName }) =>
  `Only ${available} units of ${productName} are available in ${warehouseName}, but you requested ${requested}.`;
