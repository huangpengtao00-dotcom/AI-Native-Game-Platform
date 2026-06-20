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

function numberSetting(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[name];
  const value = raw == null || raw === '' ? fallback : Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${name}: expected number between ${min} and ${max}.`);
  return value;
}

function stringSetting(name, fallback) {
  return String(process.env[name] ?? fallback);
}

function booleanSetting(name, fallback = false) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const normalized = String(raw).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  throw new Error(`Invalid ${name}: expected boolean.`);
}

export function createConfig(overrides = {}) {
  const rootDir = path.resolve(overrides.rootDir ?? process.cwd());
  loadDotEnv(rootDir);
  const dataDir = path.resolve(rootDir, overrides.dataDir ?? process.env.DATA_DIR ?? './data');
  const storageDir = path.resolve(rootDir, overrides.storageDir ?? process.env.STORAGE_DIR ?? './storage/objects');
  const maxUploadMb = Number(overrides.maxUploadMb ?? numberSetting('MAX_UPLOAD_MB', 12, { min: 1, max: 100 }));
  const sessionDays = Number(overrides.sessionDays ?? numberSetting('SESSION_DAYS', 7, { min: 1, max: 60 }));
  const port = Number(overrides.port ?? numberSetting('PORT', 4173, { min: 0, max: 65535 }));
  const host = String(overrides.host ?? stringSetting('HOST', '127.0.0.1'));
  const appOrigin = String(overrides.appOrigin ?? process.env.APP_ORIGIN ?? `http://${host}:${port}`);
  const rateLimitWindowMs = Number(overrides.rateLimitWindowMs ?? numberSetting('RATE_LIMIT_WINDOW_MS', 60000, { min: 1000, max: 3600000 }));
  const authRateLimitMax = Number(overrides.authRateLimitMax ?? numberSetting('AUTH_RATE_LIMIT_MAX', 12, { min: 1, max: 1000 }));
  const writeRateLimitMax = Number(overrides.writeRateLimitMax ?? numberSetting('WRITE_RATE_LIMIT_MAX', 80, { min: 1, max: 5000 }));
  const modelProvider = String(overrides.modelProvider ?? process.env.MODEL_PROVIDER ?? 'local-deterministic-agent');
  const modelWireApi = String(overrides.modelWireApi ?? process.env.MODEL_WIRE_API ?? 'chat-completions');
  const modelBaseUrl = String(overrides.modelBaseUrl ?? process.env.MODEL_BASE_URL ?? '');
  const modelName = String(overrides.modelName ?? process.env.MODEL_NAME ?? '');
  const modelApiKey = String(overrides.modelApiKey ?? process.env.MODEL_API_KEY ?? '');
  const modelTimeoutMs = Number(overrides.modelTimeoutMs ?? numberSetting('MODEL_TIMEOUT_MS', 12000, { min: 1000, max: 60000 }));
  const modelReasoningEffort = String(overrides.modelReasoningEffort ?? process.env.MODEL_REASONING_EFFORT ?? '');
  const modelDisableResponseStorage = overrides.modelDisableResponseStorage ?? booleanSetting('MODEL_DISABLE_RESPONSE_STORAGE', true);

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
    cookieSecure: overrides.cookieSecure ?? booleanSetting('COOKIE_SECURE', false),
    trustProxy: overrides.trustProxy ?? booleanSetting('TRUST_PROXY', false),
    modelProvider,
    modelWireApi,
    modelBaseUrl,
    modelName,
    modelApiKey,
    modelTimeoutMs,
    modelReasoningEffort,
    modelDisableResponseStorage,
    rateLimitWindowMs,
    authRateLimitMax,
    writeRateLimitMax
  };
}
