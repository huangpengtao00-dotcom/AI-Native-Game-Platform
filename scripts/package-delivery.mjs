import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outPath = path.resolve(root, '..', 'AI-Native-Game-Platform-interview-package.zip');
const stagingRoot = path.join(root, 'output', 'delivery-package-staging');
const packageRootName = 'AI-Native-Game-Platform';
const packageContainer = path.join(stagingRoot, 'package');
const stagingDir = path.join(packageContainer, packageRootName);
const excludedTop = new Set(['.git', 'data', 'storage', 'node_modules', 'output']);
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

async function stageFiles(files) {
  await fs.rm(stagingRoot, { recursive: true, force: true });
  for (const file of files) {
    const source = path.join(root, file);
    const target = path.join(stagingDir, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
  }
}

function compressStaging() {
  const ps = [
    '$ErrorActionPreference = "Stop"',
    `$source = '${path.join(packageContainer, '*').replace(/'/g, "''")}'`,
    `$dest = '${outPath.replace(/'/g, "''")}'`,
    'Compress-Archive -Path $source -DestinationPath $dest -Force'
  ].join('; ');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', ps], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

async function main() {
  await fs.rm(outPath, { force: true });
  const files = (await collectFiles(root)).sort();
  if (!files.includes('INTERVIEW_SUBMISSION.md')) throw new Error('INTERVIEW_SUBMISSION.md must be included.');
  if (!files.includes('README.md')) throw new Error('README.md must be included.');
  if (files.some((file) => file === '.env' || file.startsWith('.git/') || file.startsWith('data/') || file.startsWith('storage/') || file.startsWith('node_modules/') || file.startsWith('output/'))) {
    throw new Error('Package file list contains excluded runtime or secret paths.');
  }
  await stageFiles(files);
  compressStaging();
  await fs.rm(stagingRoot, { recursive: true, force: true });
  const stat = await fs.stat(outPath);
  console.log(JSON.stringify({ ok: true, zip: outPath, files: files.length, bytes: stat.size }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
