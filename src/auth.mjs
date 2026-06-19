import crypto from 'node:crypto';
import { id, nowIso } from './util.mjs';

const PBKDF2_ITERATIONS = 210000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function validatePassword(password) {
  const value = String(password ?? '');
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (value.length > 128) return 'Password is too long.';
  return null;
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `pbkdf2:${DIGEST}:${PBKDF2_ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [scheme, digest, iterationsRaw, salt, expected] = String(stored ?? '').split(':');
  if (scheme !== 'pbkdf2' || !digest || !iterationsRaw || !salt || !expected) return false;
  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < 100000) return false;
  const expectedBytes = Buffer.from(expected, 'hex');
  const actual = crypto.pbkdf2Sync(String(password), salt, iterations, expectedBytes.length, digest);
  return expectedBytes.length === actual.length && crypto.timingSafeEqual(actual, expectedBytes);
}

export function parseCookies(header) {
  const cookies = new Map();
  for (const chunk of String(header ?? '').split(';')) {
    const eq = chunk.indexOf('=');
    if (eq === -1) continue;
    const key = chunk.slice(0, eq).trim();
    const value = chunk.slice(eq + 1).trim();
    if (key) cookies.set(key, decodeURIComponent(value));
  }
  return cookies;
}

export function createSessionCookie(sessionId, config) {
  const maxAge = Math.floor(config.sessionDays * 24 * 60 * 60);
  const parts = [`sid=${encodeURIComponent(sessionId)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`];
  if (config.cookieSecure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie() {
  return 'sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}

export function publicUser(user) {
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.created_at };
}

export function createSessionRecord(userId, days) {
  const sessionId = id('sess');
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  return { id: sessionId, userId, expiresAt, createdAt: nowIso() };
}