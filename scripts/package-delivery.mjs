import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { finished } from 'node:stream/promises';

const root = process.cwd();
const outPath = path.resolve(root, '..', 'AI-Native-Game-Platform-interview-package.zip');
const packageRootName = 'AI-Native-Game-Platform';
const excludedTop = new Set(['.git', '.playwright-cli', 'data', 'storage', 'node_modules', 'output']);
const excludedNames = new Set(['.env']);

function shouldInclude(relativePath, dirent) {
  const normalized = relativePath.replace(/\\/g, '/');
  const top = normalized.split('/')[0];
  if (excludedTop.has(top)) return false;
  if (excludedNames.has(dirent.name)) return false;
  if (/^(console-|page-).+\.(log|yml)$/.test(dirent.name)) return false;
  if (normalized === 'delivery/media/frames' || normalized.startsWith('delivery/media/frames/')) return false;
  if (normalized === 'delivery/media/walkthrough-frames' || normalized.startsWith('delivery/media/walkthrough-frames/')) return false;
  if (normalized.endsWith('.sqlite') || normalized.endsWith('.sqlite-wal') || normalized.endsWith('.sqlite-shm')) return false;
  return true;
}

async function collectFiles(dir, prefix = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.join(prefix, entry.name);
    if (!shouldInclude(relative, entry)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(full, relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return {
    dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function writeChunk(stream, chunk, state) {
  if (!stream.write(chunk)) await once(stream, 'drain');
  state.offset += chunk.length;
}

async function writeZip(files) {
  await fs.rm(outPath, { force: true });
  const stream = createWriteStream(outPath);
  const state = { offset: 0 };
  const central = [];

  try {
    for (const file of files) {
      const source = path.join(root, file);
      const entryName = `${packageRootName}/${file.replace(/\\/g, '/')}`;
      const name = Buffer.from(entryName, 'utf8');
      const data = await fs.readFile(source);
      const stat = await fs.stat(source);
      const { dosDate, dosTime } = dosDateTime(stat.mtime);
      const checksum = crc32(data);
      const localOffset = state.offset;
      await writeChunk(stream, Buffer.concat([
        u32(0x04034b50),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(dosTime),
        u16(dosDate),
        u32(checksum),
        u32(data.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        name
      ]), state);
      await writeChunk(stream, data, state);
      central.push(Buffer.concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(dosTime),
        u16(dosDate),
        u32(checksum),
        u32(data.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(localOffset),
        name
      ]));
    }

    const centralStart = state.offset;
    for (const entry of central) await writeChunk(stream, entry, state);
    const centralSize = state.offset - centralStart;
    await writeChunk(stream, Buffer.concat([
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(central.length),
      u16(central.length),
      u32(centralSize),
      u32(centralStart),
      u16(0)
    ]), state);
  } finally {
    stream.end();
    await finished(stream);
  }
}

async function main() {
  const files = (await collectFiles(root)).sort();
  if (!files.includes('INTERVIEW_SUBMISSION.md')) throw new Error('INTERVIEW_SUBMISSION.md must be included.');
  if (!files.includes('README.md')) throw new Error('README.md must be included.');
  if (files.some((file) => file === '.env' || file.startsWith('.git/') || file.startsWith('data/') || file.startsWith('storage/') || file.startsWith('node_modules/') || file.startsWith('output/'))) {
    throw new Error('Package file list contains excluded runtime or secret paths.');
  }
  await writeZip(files);
  const stat = await fs.stat(outPath);
  console.log(JSON.stringify({ ok: true, zip: outPath, files: files.length, bytes: stat.size, root: packageRootName }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
