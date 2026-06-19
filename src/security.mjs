import crypto from 'node:crypto';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_EXEMPT = new Set(['/api/auth/login', '/api/auth/register', '/api/auth/oauth/github', '/api/auth/oauth/google']);

export function createCsrfToken() {
  return crypto.randomBytes(24).toString('base64url');
}

export function createCsrfCookie(token, config) {
  const parts = [`csrf=${encodeURIComponent(token)}`, 'Path=/', 'SameSite=Lax', `Max-Age=${Math.floor(config.sessionDays * 24 * 60 * 60)}`];
  if (config.cookieSecure) parts.push('Secure');
  return parts.join('; ');
}

export function clearCsrfCookie() {
  return 'csrf=; Path=/; SameSite=Lax; Max-Age=0';
}

export function appendSetCookie(headers, cookie) {
  if (!cookie) return headers;
  const current = headers['Set-Cookie'];
  if (!current) return { ...headers, 'Set-Cookie': cookie };
  return { ...headers, 'Set-Cookie': Array.isArray(current) ? [...current, cookie] : [current, cookie] };
}

export function shouldCheckCsrf(method, pathname) {
  return MUTATING_METHODS.has(method) && !CSRF_EXEMPT.has(pathname);
}

export function assertCsrf({ method, pathname, cookies, headers, user }) {
  if (!user || !shouldCheckCsrf(method, pathname)) return;
  const cookieToken = cookies.get('csrf');
  const headerToken = headers['x-csrf-token'];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    const error = new Error('CSRF token missing or invalid.');
    error.status = 403;
    throw error;
  }
}

export class FixedWindowRateLimiter {
  constructor({ windowMs, max, keyPrefix = 'rl' }) {
    this.windowMs = windowMs;
    this.max = max;
    this.keyPrefix = keyPrefix;
    this.buckets = new Map();
  }

  check(key, now = Date.now()) {
    const bucketKey = `${this.keyPrefix}:${key}`;
    const current = this.buckets.get(bucketKey);
    if (!current || current.resetAt <= now) {
      this.buckets.set(bucketKey, { count: 1, resetAt: now + this.windowMs });
      return { ok: true, remaining: this.max - 1, resetAt: now + this.windowMs };
    }
    current.count += 1;
    return { ok: current.count <= this.max, remaining: Math.max(0, this.max - current.count), resetAt: current.resetAt };
  }

  sweep(now = Date.now()) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

export function clientIp(req, config = {}) {
  if (config.trustProxy) {
    const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
    if (forwarded) return forwarded;
  }
  return req.socket.remoteAddress || 'unknown';
}
