import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentOrchestrator } from './agent.mjs';
import { clearSessionCookie, createSessionCookie, createSessionRecord, normalizeEmail, parseCookies, publicUser, validateEmail, validatePassword, verifyPassword } from './auth.mjs';
import { DataStore } from './db.mjs';
import { createConfig } from './env.mjs';
import { seedDemoData } from './seed.mjs';
import { LocalObjectStorage } from './storage.mjs';
import { clampText, contentTypeFor, requireInside, sanitizeFilename, sha256 } from './util.mjs';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function securityHeaders(extra = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    ...extra
  };
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, securityHeaders({
    'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : Buffer.isBuffer(body) ? 'application/octet-stream' : 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    ...headers
  }));
  res.end(payload);
}

function sendJson(res, status, body, headers = {}) {
  send(res, status, body, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
}

async function readJson(req, maxBytes = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, 'Request body too large.');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'Invalid JSON body.'); }
}

async function readUpload(req, config) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > config.maxUploadBytes) throw new HttpError(413, `Upload exceeds ${Math.round(config.maxUploadBytes / 1024 / 1024)}MB limit.`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function mapTask(task, logs = []) {
  if (!task) return null;
  return {
    id: task.id,
    status: task.status,
    title: task.title,
    prompt: task.prompt,
    currentStep: task.current_step,
    progress: task.progress,
    gameId: task.game_id,
    gameTitle: task.game_title,
    gameStatus: task.game_status,
    artifactManifestKey: task.artifact_manifest_key,
    error: task.error,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    completedAt: task.completed_at,
    logs: logs.map((log) => ({ id: log.id, level: log.level, step: log.step, message: log.message, meta: log.meta, createdAt: log.created_at }))
  };
}

function mapGame(game) {
  return {
    id: game.id,
    title: game.title,
    summary: game.summary,
    coverGradient: game.cover_gradient,
    status: game.status,
    tags: game.tags,
    authorName: game.author_name,
    origin: game.origin,
    playCount: game.play_count,
    likeCount: game.like_count,
    favoriteCount: game.favorite_count,
    manifestUrl: game.manifestUrl,
    bundleUrl: game.bundleUrl,
    createdAt: game.created_at,
    publishedAt: game.published_at,
    modelProvider: game.model_provider
  };
}

export async function createRuntime(overrides = {}) {
  const config = createConfig(overrides);
  const store = new DataStore(config);
  store.migrate();
  const storage = new LocalObjectStorage(config.storageDir);
  await storage.init();
  await fs.mkdir(config.publicDir, { recursive: true });
  await seedDemoData({ store, storage, config });
  const agent = new AgentOrchestrator({ store, storage, config });

  async function currentUser(req) {
    const sid = parseCookies(req.headers.cookie).get('sid');
    if (!sid) return null;
    const session = store.getSession(sid);
    if (!session || new Date(session.expires_at).getTime() < Date.now()) {
      if (session) store.deleteSession(sid);
      return null;
    }
    store.touchSession(sid);
    return { id: session.user_id, email: session.email, name: session.name, role: session.role, sessionId: sid };
  }

  async function requireUser(req) {
    const user = await currentUser(req);
    if (!user) throw new HttpError(401, 'Authentication required.');
    return user;
  }

  async function handleApi(req, res, url) {
    const user = await currentUser(req);
    const method = req.method ?? 'GET';

    if (method === 'GET' && url.pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, time: new Date().toISOString(), stats: store.dashboardStats() });
    }

    if (method === 'GET' && url.pathname === '/api/me') {
      return sendJson(res, 200, { user: publicUser(user) });
    }

    if (method === 'POST' && url.pathname === '/api/auth/register') {
      const body = await readJson(req);
      const email = normalizeEmail(body.email);
      const password = String(body.password ?? '');
      const name = clampText(body.name, 48, email.split('@')[0] || 'Creator');
      if (!validateEmail(email)) throw new HttpError(400, 'Use a valid email address.');
      const passwordError = validatePassword(password);
      if (passwordError) throw new HttpError(400, passwordError);
      if (store.getUserByEmail(email)) throw new HttpError(409, 'Email is already registered.');
      const created = store.createUser({ email, password, name, role: 'creator' });
      const session = createSessionRecord(created.id, config.sessionDays);
      store.createSession(session);
      store.audit({ actorId: created.id, type: 'auth.register', message: `Registered ${email}` });
      return sendJson(res, 201, { user: publicUser(created) }, { 'Set-Cookie': createSessionCookie(session.id, config) });
    }

    if (method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readJson(req);
      const found = store.getUserByEmail(body.email);
      if (!found || !verifyPassword(body.password, found.password_hash)) throw new HttpError(401, 'Email or password is incorrect.');
      const session = createSessionRecord(found.id, config.sessionDays);
      store.createSession(session);
      store.audit({ actorId: found.id, type: 'auth.login', message: `Logged in ${found.email}` });
      return sendJson(res, 200, { user: publicUser(found) }, { 'Set-Cookie': createSessionCookie(session.id, config) });
    }

    if (method === 'POST' && url.pathname === '/api/auth/logout') {
      if (user?.sessionId) store.deleteSession(user.sessionId);
      return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
    }

    if (method === 'POST' && url.pathname.startsWith('/api/auth/oauth/')) {
      const provider = url.pathname.split('/').pop();
      if (!['github', 'google'].includes(provider)) throw new HttpError(404, 'Unknown OAuth provider.');
      const body = await readJson(req);
      const demoEmail = normalizeEmail(body.email || `${provider}-demo@example.com`);
      const oauthUser = store.upsertOAuthUser({ provider, providerUserId: `${provider}-demo-user`, email: demoEmail, name: `${provider[0].toUpperCase()}${provider.slice(1)} Demo` });
      const session = createSessionRecord(oauthUser.id, config.sessionDays);
      store.createSession(session);
      store.audit({ actorId: oauthUser.id, type: `auth.oauth.${provider}`, message: `Demo OAuth login via ${provider}` });
      return sendJson(res, 200, { user: publicUser(oauthUser), demo: true, note: 'Demo OAuth callback. Replace with real provider exchange in production.' }, { 'Set-Cookie': createSessionCookie(session.id, config) });
    }

    if (method === 'GET' && url.pathname === '/api/games') {
      const games = store.listGames({ status: url.searchParams.get('status') ?? 'published', query: url.searchParams.get('q') ?? '', tag: url.searchParams.get('tag') ?? '' }).map(mapGame);
      return sendJson(res, 200, { games });
    }

    const gameMatch = url.pathname.match(/^\/api\/games\/([^/]+)$/);
    if (method === 'GET' && gameMatch) {
      const game = store.getGame(gameMatch[1]);
      if (!game) throw new HttpError(404, 'Game not found.');
      return sendJson(res, 200, { game: mapGame(game) });
    }

    const manifestMatch = url.pathname.match(/^\/api\/games\/([^/]+)\/manifest$/);
    if (method === 'GET' && manifestMatch) {
      const game = store.getGame(manifestMatch[1]);
      if (!game || !game.manifest_key) throw new HttpError(404, 'Game manifest not found.');
      if (game.status !== 'published' && game.author_id !== user?.id) throw new HttpError(403, 'This game is not published.');
      const manifest = JSON.parse((await storage.read(game.manifest_key)).toString('utf8'));
      store.incrementPlayCount(game.id);
      return sendJson(res, 200, { manifest, game: mapGame(store.getGame(game.id)) });
    }

    if (method === 'GET' && url.pathname === '/api/tasks') {
      const actor = await requireUser(req);
      const tasks = store.listTasksForUser(actor.id).map((task) => mapTask(task));
      return sendJson(res, 200, { tasks });
    }

    if (method === 'POST' && url.pathname === '/api/assets') {
      const actor = await requireUser(req);
      const filename = sanitizeFilename(req.headers['x-filename'] || 'upload.bin');
      const mime = clampText(req.headers['content-type'], 80, 'application/octet-stream');
      const allowed = /^(image\/|video\/|text\/plain|application\/pdf|application\/json|application\/octet-stream)/.test(mime);
      if (!allowed) throw new HttpError(415, 'Unsupported upload type.');
      const buffer = await readUpload(req, config);
      if (buffer.length === 0) throw new HttpError(400, 'Upload cannot be empty.');
      const digest = sha256(buffer);
      const key = `uploads/${actor.id}/${Date.now()}-${filename}`;
      const object = await storage.putBuffer(key, buffer);
      const asset = store.createAsset({ userId: actor.id, taskId: null, objectKey: object.key, filename, mime, size: buffer.length, sha256: digest });
      store.audit({ actorId: actor.id, type: 'asset.uploaded', message: `Uploaded ${filename}`, meta: { assetId: asset.id, size: buffer.length } });
      return sendJson(res, 201, { asset: { id: asset.id, filename, mime, size: buffer.length, sha256: digest, objectKey: object.key } });
    }

    if (method === 'POST' && url.pathname === '/api/tasks') {
      const actor = await requireUser(req);
      const body = await readJson(req);
      const prompt = clampText(body.prompt, 2000, 'Create a compact interactive adventure with a clear win state.');
      if (prompt.length < 10) throw new HttpError(400, 'Creative prompt must be at least 10 characters.');
      const title = clampText(body.title, 80, prompt.slice(0, 56));
      const assetIds = Array.isArray(body.assetIds) ? body.assetIds.slice(0, 10).map(String) : [];
      const task = store.createTask({ userId: actor.id, title, prompt });
      store.linkAssetsToTask(assetIds, task.id, actor.id);
      store.addLog({ taskId: task.id, level: 'info', step: 'queued', message: 'Task queued by creator.', meta: { assetIds } });
      store.audit({ actorId: actor.id, type: 'generation.created', message: `Created generation task ${task.id}`, meta: { promptLength: prompt.length } });
      agent.enqueue(task.id);
      return sendJson(res, 202, { task: mapTask(store.getTask(task.id), store.listLogs(task.id)) });
    }

    const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (method === 'GET' && taskMatch) {
      const actor = await requireUser(req);
      const task = store.getTask(taskMatch[1]);
      if (!task) throw new HttpError(404, 'Task not found.');
      if (task.user_id !== actor.id) throw new HttpError(403, 'Cannot view another user task.');
      return sendJson(res, 200, { task: mapTask(task, store.listLogs(task.id)) });
    }

    const publishMatch = url.pathname.match(/^\/api\/games\/([^/]+)\/publish$/);
    if (method === 'POST' && publishMatch) {
      const actor = await requireUser(req);
      const game = store.publishGame(publishMatch[1], actor.id);
      if (!game) throw new HttpError(404, 'Game not found.');
      store.audit({ actorId: actor.id, type: 'game.published', message: `Published ${game.title}`, meta: { gameId: game.id } });
      return sendJson(res, 200, { game: mapGame(game) });
    }

    throw new HttpError(404, 'API route not found.');
  }

  async function serveStatic(req, res, url) {
    if (url.pathname.startsWith('/objects/')) {
      const key = decodeURIComponent(url.pathname.slice('/objects/'.length));
      const filePath = storage.resolve(key);
      const body = await fs.readFile(filePath);
      return send(res, 200, body, {
        'Content-Type': contentTypeFor(filePath),
        'Cache-Control': 'public, max-age=60',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob:; media-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'"
      });
    }

    let relative = decodeURIComponent(url.pathname);
    if (relative === '/' || !path.extname(relative)) relative = '/index.html';
    const filePath = requireInside(config.publicDir, path.join(config.publicDir, relative));
    const body = await fs.readFile(filePath);
    return send(res, 200, body, {
      'Content-Type': contentTypeFor(filePath),
      'Cache-Control': filePath.endsWith('index.html') ? 'no-store' : 'public, max-age=60',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"
    });
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', config.appOrigin);
      if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
      return await serveStatic(req, res, url);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : error.code === 'ENOENT' ? 404 : 500;
      if (status >= 500) console.error(error);
      return sendJson(res, status, { error: status >= 500 ? 'Internal server error.' : error.message });
    }
  });

  return {
    config,
    store,
    storage,
    agent,
    server,
    listen: () => new Promise((resolve) => server.listen(config.port, config.host, () => resolve(server.address()))),
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}