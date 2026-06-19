import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hashPassword, normalizeEmail } from './auth.mjs';
import { id, nowIso, parseJsonField } from './util.mjs';

export class DataStore {
  constructor(config) {
    this.config = config;
    fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
    this.db = new DatabaseSync(config.dbPath);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  }

  close() { this.db.close(); }
  get(sql, params = {}) { return this.db.prepare(sql).get(params); }
  all(sql, params = {}) { return this.db.prepare(sql).all(params); }
  run(sql, params = {}) { return this.db.prepare(sql).run(params); }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
        name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'creator', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS oauth_accounts (
        provider TEXT NOT NULL, provider_user_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (provider, provider_user_id)
      );
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT NOT NULL, cover_gradient TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('draft', 'published', 'archived')), tags_json TEXT NOT NULL,
        author_id TEXT REFERENCES users(id) ON DELETE SET NULL, author_name TEXT NOT NULL, origin TEXT NOT NULL DEFAULT 'seed',
        play_count INTEGER NOT NULL DEFAULT 0, like_count INTEGER NOT NULL DEFAULT 0, favorite_count INTEGER NOT NULL DEFAULT 0,
        latest_version_id TEXT, created_at TEXT NOT NULL, published_at TEXT, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS game_versions (
        id TEXT PRIMARY KEY, game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE, version INTEGER NOT NULL,
        manifest_key TEXT NOT NULL, bundle_key TEXT NOT NULL, asset_keys_json TEXT NOT NULL,
        prompt TEXT NOT NULL, model_provider TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(game_id, version)
      );
      CREATE TABLE IF NOT EXISTS generation_tasks (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'succeeded', 'failed')),
        title TEXT NOT NULL, prompt TEXT NOT NULL, current_step TEXT NOT NULL, progress INTEGER NOT NULL DEFAULT 0,
        game_id TEXT REFERENCES games(id) ON DELETE SET NULL, artifact_manifest_key TEXT, error TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, completed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS agent_logs (
        id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES generation_tasks(id) ON DELETE CASCADE,
        level TEXT NOT NULL CHECK(level IN ('debug', 'info', 'warn', 'error')), step TEXT NOT NULL,
        message TEXT NOT NULL, meta_json TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        task_id TEXT REFERENCES generation_tasks(id) ON DELETE SET NULL, object_key TEXT NOT NULL,
        filename TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, sha256 TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY, actor_id TEXT REFERENCES users(id) ON DELETE SET NULL, type TEXT NOT NULL,
        message TEXT NOT NULL, meta_json TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_games_status_published ON games(status, published_at DESC);
      CREATE INDEX IF NOT EXISTS idx_tasks_user_created ON generation_tasks(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_logs_task_created ON agent_logs(task_id, created_at ASC);
      CREATE INDEX IF NOT EXISTS idx_assets_task ON assets(task_id);
    `);
  }

  tx(fn) {
    this.db.exec('BEGIN IMMEDIATE;');
    try { const result = fn(); this.db.exec('COMMIT;'); return result; }
    catch (error) { this.db.exec('ROLLBACK;'); throw error; }
  }

  createUser({ email, password, name, role = 'creator' }) {
    const now = nowIso();
    const user = { id: id('usr'), email: normalizeEmail(email), passwordHash: hashPassword(password), name, role, now };
    this.run(`INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
      VALUES ($id, $email, $passwordHash, $name, $role, $now, $now)`, {
      $id: user.id, $email: user.email, $passwordHash: user.passwordHash, $name: user.name, $role: user.role, $now: now
    });
    return this.getUserById(user.id);
  }

  upsertOAuthUser({ provider, providerUserId, email, name }) {
    const existing = this.get(`SELECT u.* FROM oauth_accounts oa JOIN users u ON u.id = oa.user_id WHERE oa.provider = $provider AND oa.provider_user_id = $providerUserId`, { $provider: provider, $providerUserId: providerUserId });
    if (existing) return existing;
    const found = this.getUserByEmail(email);
    const user = found ?? this.createUser({ email, password: id('oauth-password'), name, role: 'creator' });
    this.run(`INSERT OR IGNORE INTO oauth_accounts (provider, provider_user_id, user_id, email, created_at)
      VALUES ($provider, $providerUserId, $userId, $email, $createdAt)`, {
      $provider: provider, $providerUserId: providerUserId, $userId: user.id, $email: normalizeEmail(email), $createdAt: nowIso()
    });
    return this.getUserById(user.id);
  }

  getUserByEmail(email) { return this.get('SELECT * FROM users WHERE email = $email', { $email: normalizeEmail(email) }); }
  getUserById(userId) { return this.get('SELECT * FROM users WHERE id = $id', { $id: userId }); }

  createSession({ id: sessionId, userId, expiresAt, createdAt }) {
    this.run(`INSERT INTO sessions (id, user_id, expires_at, created_at, last_seen_at) VALUES ($id, $userId, $expiresAt, $createdAt, $createdAt)`, {
      $id: sessionId, $userId: userId, $expiresAt: expiresAt, $createdAt: createdAt
    });
  }
  getSession(sessionId) { return this.get(`SELECT s.*, u.email, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = $id`, { $id: sessionId }); }
  touchSession(sessionId) { this.run('UPDATE sessions SET last_seen_at = $now WHERE id = $id', { $id: sessionId, $now: nowIso() }); }
  deleteSession(sessionId) { this.run('DELETE FROM sessions WHERE id = $id', { $id: sessionId }); }

  createTask({ userId, title, prompt }) {
    const now = nowIso();
    const taskId = id('task');
    this.run(`INSERT INTO generation_tasks (id, user_id, status, title, prompt, current_step, progress, created_at, updated_at)
      VALUES ($id, $userId, 'pending', $title, $prompt, 'queued', 0, $now, $now)`, {
      $id: taskId, $userId: userId, $title: title, $prompt: prompt, $now: now
    });
    return this.getTask(taskId);
  }

  updateTask(taskId, fields) {
    const map = { status: 'status', currentStep: 'current_step', progress: 'progress', gameId: 'game_id', artifactManifestKey: 'artifact_manifest_key', error: 'error', completedAt: 'completed_at' };
    const sets = [];
    const params = { $id: taskId, $updatedAt: nowIso() };
    for (const [key, column] of Object.entries(map)) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) { sets.push(`${column} = $${key}`); params[`$${key}`] = fields[key]; }
    }
    sets.push('updated_at = $updatedAt');
    this.run(`UPDATE generation_tasks SET ${sets.join(', ')} WHERE id = $id`, params);
    return this.getTask(taskId);
  }

  getTask(taskId) { return this.get(`SELECT t.*, g.title AS game_title, g.status AS game_status FROM generation_tasks t LEFT JOIN games g ON g.id = t.game_id WHERE t.id = $id`, { $id: taskId }); }
  listTasksForUser(userId) { return this.all(`SELECT t.*, g.title AS game_title, g.status AS game_status FROM generation_tasks t LEFT JOIN games g ON g.id = t.game_id WHERE t.user_id = $userId ORDER BY t.created_at DESC`, { $userId: userId }); }

  addLog({ taskId, level = 'info', step, message, meta = {} }) {
    const row = { id: id('log'), taskId, level, step, message, metaJson: JSON.stringify(meta), createdAt: nowIso() };
    this.run(`INSERT INTO agent_logs (id, task_id, level, step, message, meta_json, created_at)
      VALUES ($id, $taskId, $level, $step, $message, $metaJson, $createdAt)`, {
      $id: row.id, $taskId: taskId, $level: level, $step: step, $message: message, $metaJson: row.metaJson, $createdAt: row.createdAt
    });
    return row;
  }
  listLogs(taskId) { return this.all('SELECT * FROM agent_logs WHERE task_id = $taskId ORDER BY created_at ASC', { $taskId: taskId }).map((log) => ({ ...log, meta: parseJsonField(log.meta_json, {}) })); }

  createAsset(asset) {
    const row = { id: id('asset'), createdAt: nowIso(), ...asset };
    this.run(`INSERT INTO assets (id, user_id, task_id, object_key, filename, mime, size, sha256, created_at)
      VALUES ($id, $userId, $taskId, $objectKey, $filename, $mime, $size, $sha256, $createdAt)`, {
      $id: row.id, $userId: row.userId, $taskId: row.taskId ?? null, $objectKey: row.objectKey, $filename: row.filename,
      $mime: row.mime, $size: row.size, $sha256: row.sha256, $createdAt: row.createdAt
    });
    return row;
  }
  linkAssetsToTask(assetIds, taskId, userId) { for (const assetId of assetIds) this.run('UPDATE assets SET task_id = $taskId WHERE id = $assetId AND user_id = $userId', { $taskId: taskId, $assetId: assetId, $userId: userId }); }
  listAssetsForTask(taskId) { return this.all('SELECT * FROM assets WHERE task_id = $taskId ORDER BY created_at ASC', { $taskId: taskId }); }

  createGameWithVersion({ title, summary, tags, authorId, authorName, origin, status, prompt, manifestKey, bundleKey, assetKeys, modelProvider, coverGradient }) {
    const now = nowIso();
    const gameId = id('game');
    const versionId = id('ver');
    this.tx(() => {
      this.run(`INSERT INTO games (id, title, summary, cover_gradient, status, tags_json, author_id, author_name, origin, created_at, published_at, updated_at)
        VALUES ($id, $title, $summary, $coverGradient, $status, $tagsJson, $authorId, $authorName, $origin, $now, $publishedAt, $now)`, {
        $id: gameId, $title: title, $summary: summary, $coverGradient: coverGradient, $status: status,
        $tagsJson: JSON.stringify(tags), $authorId: authorId, $authorName: authorName, $origin: origin, $now: now, $publishedAt: status === 'published' ? now : null
      });
      this.run(`INSERT INTO game_versions (id, game_id, version, manifest_key, bundle_key, asset_keys_json, prompt, model_provider, created_at)
        VALUES ($id, $gameId, 1, $manifestKey, $bundleKey, $assetKeysJson, $prompt, $modelProvider, $createdAt)`, {
        $id: versionId, $gameId: gameId, $manifestKey: manifestKey, $bundleKey: bundleKey,
        $assetKeysJson: JSON.stringify(assetKeys ?? []), $prompt: prompt, $modelProvider: modelProvider, $createdAt: now
      });
      this.run('UPDATE games SET latest_version_id = $versionId WHERE id = $gameId', { $versionId: versionId, $gameId: gameId });
    });
    return this.getGame(gameId);
  }

  publishGame(gameId, userId) {
    const game = this.getGame(gameId);
    if (!game) return null;
    if (game.author_id !== userId) throw new Error('Only the owner can publish this game.');
    const now = nowIso();
    this.run(`UPDATE games SET status = 'published', published_at = COALESCE(published_at, $now), updated_at = $now WHERE id = $id`, { $id: gameId, $now: now });
    return this.getGame(gameId);
  }
  incrementPlayCount(gameId) { this.run('UPDATE games SET play_count = play_count + 1, updated_at = $now WHERE id = $id', { $id: gameId, $now: nowIso() }); }

  listGames({ status = 'published', query = '', tag = '' } = {}) {
    const rows = this.all(`SELECT g.*, v.manifest_key, v.bundle_key, v.prompt, v.model_provider, v.asset_keys_json FROM games g LEFT JOIN game_versions v ON v.id = g.latest_version_id
      WHERE ($status = '' OR g.status = $status)
        AND ($query = '' OR lower(g.title || ' ' || g.summary || ' ' || g.tags_json) LIKE '%' || lower($query) || '%')
      ORDER BY COALESCE(g.published_at, g.created_at) DESC`, { $status: status, $query: query });
    return rows.map((row) => this.mapGame(row)).filter((game) => !tag || game.tags.includes(tag));
  }
  getGame(gameId) { const row = this.get(`SELECT g.*, v.manifest_key, v.bundle_key, v.prompt, v.model_provider, v.asset_keys_json FROM games g LEFT JOIN game_versions v ON v.id = g.latest_version_id WHERE g.id = $id`, { $id: gameId }); return row ? this.mapGame(row) : null; }
  mapGame(row) { return { ...row, tags: parseJsonField(row.tags_json, []), assetKeys: parseJsonField(row.asset_keys_json, []), manifestUrl: row.manifest_key ? `/objects/${row.manifest_key}` : null, bundleUrl: row.bundle_key ? `/objects/${row.bundle_key}` : null }; }

  audit({ actorId = null, type, message, meta = {} }) {
    this.run(`INSERT INTO audit_events (id, actor_id, type, message, meta_json, created_at)
      VALUES ($id, $actorId, $type, $message, $metaJson, $createdAt)`, { $id: id('audit'), $actorId: actorId, $type: type, $message: message, $metaJson: JSON.stringify(meta), $createdAt: nowIso() });
  }
  dashboardStats() { return { users: this.get('SELECT COUNT(*) AS count FROM users').count, games: this.get('SELECT COUNT(*) AS count FROM games').count, publishedGames: this.get("SELECT COUNT(*) AS count FROM games WHERE status = 'published'").count, tasks: this.get('SELECT COUNT(*) AS count FROM generation_tasks').count, succeededTasks: this.get("SELECT COUNT(*) AS count FROM generation_tasks WHERE status = 'succeeded'").count }; }
}