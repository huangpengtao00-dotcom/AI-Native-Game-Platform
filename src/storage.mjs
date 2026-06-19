import fs from 'node:fs/promises';
import path from 'node:path';
import { contentTypeFor, requireInside, safeSlug } from './util.mjs';

const ALLOWED_EXTENSIONS = new Set(['.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.txt', '.mp4', '.webm']);

export class LocalObjectStorage {
  constructor(rootDir) {
    this.rootDir = path.resolve(rootDir);
  }

  async init() {
    await fs.mkdir(this.rootDir, { recursive: true });
  }

  normalizeKey(key) {
    const raw = String(key ?? '').replace(/\\/g, '/');
    const parts = raw.split('/').filter(Boolean);
    if (parts.length === 0) throw new Error('Object key is empty.');
    return parts.map((part, index) => {
      const ext = path.extname(part).toLowerCase();
      const stem = part.slice(0, part.length - ext.length);
      const clean = safeSlug(stem || part, index === parts.length - 1 ? 'object' : 'folder');
      if (index === parts.length - 1 && ALLOWED_EXTENSIONS.has(ext)) return clean + ext;
      return clean;
    }).join('/');
  }

  resolve(key) {
    const normalized = this.normalizeKey(key);
    return requireInside(this.rootDir, path.join(this.rootDir, normalized));
  }

  async putText(key, content) {
    const normalized = this.normalizeKey(key);
    const filePath = this.resolve(normalized);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
    return { key: normalized, url: `/objects/${normalized}`, contentType: contentTypeFor(filePath), size: Buffer.byteLength(content) };
  }

  async putBuffer(key, buffer) {
    const normalized = this.normalizeKey(key);
    const filePath = this.resolve(normalized);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    return { key: normalized, url: `/objects/${normalized}`, contentType: contentTypeFor(filePath), size: buffer.length };
  }

  async read(key) {
    return fs.readFile(this.resolve(key));
  }

  async stat(key) {
    return fs.stat(this.resolve(key));
  }

  async exists(key) {
    try {
      await this.stat(key);
      return true;
    } catch {
      return false;
    }
  }
}