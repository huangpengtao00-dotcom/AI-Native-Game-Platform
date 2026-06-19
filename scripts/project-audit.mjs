import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const syntaxFiles = ['server.mjs', 'src/auth.mjs', 'src/storage.mjs', 'src/db.mjs', 'src/env.mjs', 'src/util.mjs', 'src/agent.mjs', 'src/seed.mjs', 'src/logger.mjs', 'src/security.mjs', 'src/http.mjs', 'public/app.js', 'tests/run-tests.mjs', 'scripts/project-audit.mjs'];
for (const file of syntaxFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}
const required = [
  'README.md', '.env.example', 'server.mjs', 'src/http.mjs', 'src/db.mjs', 'src/agent.mjs', 'src/storage.mjs',
  'public/index.html', 'public/styles.css', 'public/app.js',
  'docs/system-design.md', 'docs/data-model.md', 'docs/agent-workflow.md', 'docs/artifact-protocol.md', 'docs/security.md', 'docs/verification.md', 'docs/completion.md', 'docs/delivery.md', 'docs/prd-alignment.md', 'docs/ai-collaboration.md'
];
const missing = [];
for (const file of required) {
  try { await fs.access(path.join(root, file)); } catch { missing.push(file); }
}
if (missing.length) {
  console.error('Missing required files:', missing.join(', '));
  process.exit(1);
}
const scannedFiles = ['public/app.js', 'src/http.mjs', 'src/agent.mjs', 'src/auth.mjs', 'src/storage.mjs', 'src/security.mjs', 'src/logger.mjs', 'src/env.mjs', '.env.example', 'docs/security.md', 'docs/delivery.md', 'docs/prd-alignment.md'];
const scanned = await Promise.all(scannedFiles.map((file) => fs.readFile(path.join(root, file), 'utf8')));
const securityNeedles = ['HttpOnly', 'SameSite=Lax', 'sandbox="allow-scripts"', 'Content-Security-Policy', 'maxUploadBytes', 'prompt injection', 'X-Request-Id', 'x-csrf-token', 'FixedWindowRateLimiter', '/api/ready', 'RATE_LIMIT_WINDOW_MS', 'TRUST_PROXY', 'PRD Alignment', 'Non-Acceptance'];
const combined = scanned.join('\\n');
const absent = securityNeedles.filter((needle) => !combined.includes(needle));
if (absent.length) {
  console.error('Audit markers missing:', absent.join(', '));
  process.exit(1);
}
const mojibake = ['\u95b3', '\u74ba', '\u9225?'].filter((needle) => combined.includes(needle));
if (mojibake.length) {
  console.error('Encoding artifacts found:', mojibake.join(', '));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, requiredFiles: required.length, securityMarkers: securityNeedles.length }, null, 2));
