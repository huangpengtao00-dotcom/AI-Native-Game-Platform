import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRuntime } from '../src/http.mjs';

const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeplay-test-'));
const runtime = await createRuntime({ rootDir: process.cwd(), dataDir: path.join(tmpRoot, 'data'), storageDir: path.join(tmpRoot, 'objects'), port: 0, host: '127.0.0.1', appOrigin: 'http://127.0.0.1:0' });
const address = await new Promise((resolve) => runtime.server.listen(0, '127.0.0.1', () => resolve(runtime.server.address())));
const base = `http://127.0.0.1:${address.port}`;
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const cookies = new Map();
let csrfToken = '';

function cookieHeader() {
  return Array.from(cookies.entries()).map(([name, value]) => `${name}=${value}`).join('; ');
}

function splitSetCookie(header) {
  if (!header) return [];
  return header.split(/,(?=\s*[^;,\s]+=)/g).map((part) => part.trim()).filter(Boolean);
}

function storeCookies(res) {
  const lines = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : splitSetCookie(res.headers.get('set-cookie'));
  for (const line of lines) {
    const [pair] = line.split(';');
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (!value) cookies.delete(name);
    else cookies.set(name, value);
  }
}

async function request(route, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...(cookieHeader() ? { Cookie: cookieHeader() } : {}), ...(options.headers || {}) };
  if (options.csrf !== false && csrfToken && MUTATING_METHODS.has(method) && !headers['X-CSRF-Token']) headers['X-CSRF-Token'] = csrfToken;
  const res = await fetch(base + route, { ...options, method, headers });
  assert.ok(res.headers.get('x-request-id'), `${route} should include X-Request-Id`);
  storeCookies(res);
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (data.csrfToken) csrfToken = data.csrfToken;
  if (!res.ok) {
    const error = new Error(`${res.status} ${data.error || text}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

try {
  const health = await request('/api/health');
  assert.equal(health.ok, true);
  assert.ok(health.stats.publishedGames >= 3, 'seed should create three published games');

  const seededGames = await request('/api/games?status=published');
  const seededCreateGame = seededGames.games.find((game) => game.origin === 'create-agent');
  assert.ok(seededGames.games.length >= 3, 'fresh seed should expose at least three published games');
  assert.ok(seededCreateGame, 'fresh seed should include one Create-flow published game');
  assert.ok(seededCreateGame.manifestUrl?.startsWith('/objects/'), 'seeded Create-flow game should use object manifest');

  const ready = await request('/api/ready');
  assert.equal(ready.ok, true);
  assert.equal(ready.checks.database, true);
  assert.equal(ready.checks.objectStorage, true);

  await assert.rejects(() => request('/api/tasks'), /401 Authentication required/);

  const unique = Date.now();
  const reg = await request('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `creator.${unique}@example.com`, password: 'password123', name: 'Test Creator' }) });
  assert.equal(reg.user.role, 'creator');
  assert.ok(csrfToken, 'register should return a CSRF token');

  await assert.rejects(
    () => request('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', csrf: false }),
    /403 CSRF token missing or invalid/
  );

  await assert.rejects(
    () => request('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/x-msdownload', 'X-Filename': 'bad.exe' }, body: 'not allowed' }),
    /415 Unsupported upload type/
  );

  const upload = await request('/api/assets', { method: 'POST', headers: { 'Content-Type': 'text/plain', 'X-Filename': 'notes.txt' }, body: 'reference material' });
  assert.ok(upload.asset.id);
  assert.ok(upload.asset.sha256);

  const created = await request('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Automated Test Game', prompt: 'Create a reaction game that proves manifest loading and a clear win condition.', assetIds: [upload.asset.id] }) });
  assert.equal(created.task.status, 'pending');

  let task = created.task;
  for (let i = 0; i < 30 && !['succeeded', 'failed'].includes(task.status); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    task = (await request(`/api/tasks/${created.task.id}`)).task;
  }
  assert.equal(task.status, 'succeeded');
  assert.ok(task.logs.length >= 4, 'agent logs should be visible');
  assert.ok(task.gameId, 'task should create a game');

  const beforePublish = await request(`/api/games/${task.gameId}`);
  assert.equal(beforePublish.game.status, 'draft');

  const published = await request(`/api/games/${task.gameId}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(published.game.status, 'published');

  const manifest = await request(`/api/games/${task.gameId}/manifest`);
  assert.ok(manifest.manifest.entry.startsWith('/objects/'));
  assert.equal(manifest.manifest.runtime, 'sandboxed-html-v1');

  const bundleRes = await fetch(base + manifest.manifest.entry, { headers: { Cookie: cookieHeader() } });
  assert.equal(bundleRes.status, 200);
  assert.match(await bundleRes.text(), /AI Agent Generated Bundle/);

  const games = await request('/api/games?status=published');
  assert.ok(games.games.some((game) => game.id === task.gameId), 'published Create game should be visible on Home');

  console.log(JSON.stringify({ ok: true, base, tmpRoot, createdGame: task.gameId, publishedGames: games.games.length }, null, 2));
} finally {
  await runtime.close();
  runtime.store.close();
  for (let i = 0; i < 5; i += 1) {
    try { await fs.rm(tmpRoot, { recursive: true, force: true }); break; }
    catch (error) { if (i === 4) throw error; await new Promise((resolve) => setTimeout(resolve, 120)); }
  }
}
