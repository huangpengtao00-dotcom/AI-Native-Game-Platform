import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const syntaxFiles = [
  'server.mjs', 'src/auth.mjs', 'src/storage.mjs', 'src/db.mjs', 'src/env.mjs', 'src/util.mjs',
  'src/model-provider.mjs', 'src/agent.mjs', 'src/seed.mjs', 'src/logger.mjs', 'src/security.mjs', 'src/http.mjs',
  'public/app.js', 'tests/model-provider.test.mjs', 'tests/run-tests.mjs',
  'scripts/project-audit.mjs', 'scripts/model-smoke-test.mjs', 'scripts/package-delivery.mjs', 'scripts/capture-demo.mjs', 'scripts/build-demo-video.mjs'
];
for (const file of syntaxFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

const required = [
  'README.md', 'INTERVIEW_SUBMISSION.md', '.env.example', 'package.json', 'server.mjs',
  'src/http.mjs', 'src/db.mjs', 'src/agent.mjs', 'src/model-provider.mjs', 'src/storage.mjs',
  'public/index.html', 'public/styles.css', 'public/app.js',
  'tests/model-provider.test.mjs', 'tests/run-tests.mjs', 'scripts/package-delivery.mjs',
  'docs/system-design.md', 'docs/data-model.md', 'docs/agent-workflow.md', 'docs/artifact-protocol.md',
  'docs/security.md', 'docs/verification.md', 'docs/completion.md', 'docs/delivery.md',
  'docs/prd-alignment.md', 'docs/ai-collaboration.md', 'docs/strict-requirements-audit.md'
];
const missing = [];
for (const file of required) {
  try { await fs.access(path.join(root, file)); } catch { missing.push(file); }
}
if (missing.length) {
  console.error('Missing required files:', missing.join(', '));
  process.exit(1);
}

const scannedFiles = [
  'public/app.js', 'src/http.mjs', 'src/agent.mjs', 'src/model-provider.mjs', 'src/auth.mjs',
  'src/storage.mjs', 'src/security.mjs', 'src/logger.mjs', 'src/env.mjs', '.env.example',
  'docs/security.md', 'docs/delivery.md', 'docs/prd-alignment.md', 'docs/agent-workflow.md',
  'docs/strict-requirements-audit.md', 'INTERVIEW_SUBMISSION.md', 'package.json'
];
const scanned = await Promise.all(scannedFiles.map((file) => fs.readFile(path.join(root, file), 'utf8')));
const combined = scanned.join('\n');
const securityNeedles = [
  'HttpOnly', 'SameSite=Lax', 'sandbox="allow-scripts"', 'Content-Security-Policy', 'maxUploadBytes',
  'prompt injection', 'X-Request-Id', 'x-csrf-token', 'FixedWindowRateLimiter', '/api/ready',
  'RATE_LIMIT_WINDOW_MS', 'TRUST_PROXY', 'MODEL_API_KEY', 'MODEL_WIRE_API', 'OpenAI-compatible',
  'responses', 'smoke:model', 'package:delivery', 'PRD Alignment', 'Non-Acceptance'
];
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
const leakedSecretPatterns = [/sk-[A-Za-z0-9_-]{20,}/, /MODEL_API_KEY\s*=\s*sk-/];
const leaked = leakedSecretPatterns.filter((pattern) => pattern.test(combined));
if (leaked.length) {
  console.error('Potential API secret found in tracked project text. Refusing audit pass.');
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, requiredFiles: required.length, securityMarkers: securityNeedles.length, syntaxFiles: syntaxFiles.length }, null, 2));

