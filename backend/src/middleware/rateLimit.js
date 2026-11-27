const buckets = new Map();
const WINDOW_MS = 15 * 60 * 1000;

const formatWait = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const parts = [];
  if (minutes) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  if (remainingSeconds) parts.push(`${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}`);
  return parts.join(' ') || 'a moment';
};

const clientKey = (req, identity = '') => {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const resolved = typeof identity === 'function' ? identity(req) : identity;
  return `${req.originalUrl.split('?')[0]}:${forwarded || req.ip || 'unknown'}:${resolved}`;
};

export function rateLimit({
  limit,
  windowMs = WINDOW_MS,
  message = 'Too many requests.',
  countFailures = false,
  failureStatuses = [401, 403],
}) {
  return (req, res, next) => {
    const identity = countFailures ? String(req.body?.email || '').trim().toLowerCase() : '';
    const key = clientKey(req, identity);
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || now - bucket.start >= windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(key, bucket);
    }
    if (buckets.size > 1000) {
      for (const [storedKey, value] of buckets) {
        if (now - value.start >= windowMs) buckets.delete(storedKey);
      }
    }

    const reset = Math.ceil((bucket.start + windowMs - now) / 1000);
    if (bucket.count >= limit) {
      res.set('X-RateLimit-Limit', String(limit));
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', String(reset));
      res.set('Retry-After', String(reset));
      return res.status(429).json({
        success: false,
        message: `${message} Try again in ${formatWait(reset)}.`,
      });
    }

    if (!countFailures) bucket.count += 1;
    const remaining = Math.max(limit - bucket.count, 0);
    res.set('X-RateLimit-Limit', String(limit));
    res.set('X-RateLimit-Remaining', String(remaining));
    res.set('X-RateLimit-Reset', String(reset));

    if (countFailures) {
      res.on('finish', () => {
        if (!failureStatuses.includes(res.statusCode)) return;
        const current = buckets.get(key);
        if (current && current.start === bucket.start) current.count += 1;
      });
    }
    return next();
  };
}

export const loginRateLimit = rateLimit({
  limit: 10,
  message: 'Too many failed login attempts.',
  countFailures: true,
});

export const registerRateLimit = rateLimit({
  limit: 5,
  message: 'Too many registration attempts.',
});

export const passwordRateLimit = rateLimit({
  limit: 10,
  message: 'Too many password change attempts.',
  countFailures: true,
  identity: (req) => String(req.user?._id || ''),
});
