import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRuntime } from '../src/http.mjs';

const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeplay-test-'));
const runtime = await createRuntime({ rootDir: process.cwd(), dataDir: path.join(tmpRoot, 'data'), storageDir: path.join(tmpRoot, 'objects'), port: 0, host: '127.0.0.1', appOrigin: 'http://127.0.0.1:0' });
const address = await new Promise((resolve) => runtime.server.listen(0, '127.0.0.1', () => resolve(runtime.server.address())));
const base = `http://127.0.0.1:${address.port}`;
let cookie = '';

async function request(route, options = {}) {
  const res = await fetch(base + route, { ...options, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}) } });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`${res.status} ${data.error || text}`);
  return data;
}

try {
  const health = await request('/api/health');
  assert.equal(health.ok, true);
  assert.ok(health.stats.publishedGames >= 3, 'seed should create three published games');

  const unique = Date.now();
  const reg = await request('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `creator.${unique}@example.com`, password: 'password123', name: 'Test Creator' }) });
  assert.equal(reg.user.role, 'creator');

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

  const bundleRes = await fetch(base + manifest.manifest.entry, { headers: { Cookie: cookie } });
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