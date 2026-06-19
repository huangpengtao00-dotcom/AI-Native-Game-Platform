import crypto from 'node:crypto';
import path from 'node:path';

export function nowIso() {
  return new Date().toISOString();
}

export function id(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(10).toString('hex')}`;
}

export function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function safeSlug(value, fallback = 'item') {
  const slug = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || fallback;
}

export function sanitizeFilename(name) {
  const base = path.basename(String(name ?? 'upload.bin')).replace(/[\x00-\x1f<>:"/\\|?*]+/g, '_');
  const trimmed = base.replace(/\s+/g, ' ').trim().slice(0, 96);
  return trimmed || 'upload.bin';
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export function parseJsonField(value, fallback) {
  if (value == null || value === '') return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

export function clampText(value, max, fallback = '') {
  const text = String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  return (text || fallback).slice(0, max);
}

export function requireInside(root, candidate) {
  const base = path.resolve(root);
  const full = path.resolve(candidate);
  if (full !== base && !full.startsWith(base + path.sep)) throw new Error(`Path escapes root: ${candidate}`);
  return full;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const table = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.txt': 'text/plain; charset=utf-8',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm'
  };
  return table[ext] ?? 'application/octet-stream';
}