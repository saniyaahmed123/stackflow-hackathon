const parsePositive = (value, fallback) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
};

export function listOptions(req, {
  defaultLimit = 50,
  maxLimit = 500,
  sortFields = {},
  defaultSort = { createdAt: -1 },
} = {}) {
  const page = parsePositive(req.query.page, 1);
  const limit = Math.min(parsePositive(req.query.limit, defaultLimit), maxLimit);
  const sortParam = String(req.query.sort || '').trim();
  const [field, direction] = sortParam.split(':');
  const mapped = sortFields[field];
  const sort = mapped
    ? { [mapped]: String(direction).toLowerCase() === 'asc' ? 1 : -1 }
    : { ...defaultSort };

  return { page, limit, skip: (page - 1) * limit, sort, sortParam };
}

export function setPaginationHeaders(res, page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  res.set('X-Total-Count', String(total));
  res.set('X-Page', String(page));
  res.set('X-Per-Page', String(limit));
  res.set('X-Total-Pages', String(totalPages || 0));
}

export function paginateArray(items, page, limit) {
  return items.slice((page - 1) * limit, page * limit);
}

export function sortArray(items, sort) {
  const entries = Object.entries(sort);
  if (!entries.length) return items;

  return [...items].sort((a, b) => {
    for (const [key, direction] of entries) {
      const left = a?.[key];
      const right = b?.[key];
      if (left === right) continue;
      if (left === undefined || left === null) return 1;
      if (right === undefined || right === null) return -1;
      if (left > right) return direction;
      if (left < right) return -direction;
    }
    return 0;
  });
}
