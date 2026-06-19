import fs from 'node:fs';
import path from 'node:path';

export function loadDotEnv(rootDir) {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

export function createConfig(overrides = {}) {
  const rootDir = path.resolve(overrides.rootDir ?? process.cwd());
  loadDotEnv(rootDir);
  const dataDir = path.resolve(rootDir, overrides.dataDir ?? process.env.DATA_DIR ?? './data');
  const storageDir = path.resolve(rootDir, overrides.storageDir ?? process.env.STORAGE_DIR ?? './storage/objects');
  const maxUploadMb = Number(overrides.maxUploadMb ?? process.env.MAX_UPLOAD_MB ?? 12);
  const sessionDays = Number(overrides.sessionDays ?? process.env.SESSION_DAYS ?? 7);
  const port = Number(overrides.port ?? process.env.PORT ?? 4173);
  const host = String(overrides.host ?? process.env.HOST ?? '127.0.0.1');
  const appOrigin = String(overrides.appOrigin ?? process.env.APP_ORIGIN ?? `http://${host}:${port}`);

  return {
    rootDir,
    publicDir: path.join(rootDir, 'public'),
    docsDir: path.join(rootDir, 'docs'),
    dataDir,
    dbPath: path.join(dataDir, 'app.sqlite'),
    storageDir,
    port,
    host,
    appOrigin,
    sessionDays,
    maxUploadBytes: Math.max(1, maxUploadMb) * 1024 * 1024,
    cookieSecure: String(overrides.cookieSecure ?? process.env.COOKIE_SECURE ?? 'false') === 'true',
    modelProvider: String(overrides.modelProvider ?? process.env.MODEL_PROVIDER ?? 'local-deterministic-agent')
  };
}