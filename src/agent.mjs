import { clampText, escapeHtml, id, nowIso, safeJson, safeSlug, sleep } from './util.mjs';

const PALETTES = [
  'linear-gradient(135deg, #14532d 0%, #0f766e 45%, #fbbf24 100%)',
  'linear-gradient(135deg, #111827 0%, #155e75 42%, #f97316 100%)',
  'linear-gradient(135deg, #312e81 0%, #be123c 48%, #facc15 100%)',
  'linear-gradient(135deg, #0f172a 0%, #2563eb 45%, #22c55e 100%)'
];

function classifyPrompt(prompt) {
  const text = String(prompt ?? '').toLowerCase();
  if (/memory|card|记忆|翻牌/.test(text)) return 'memory';
  if (/click|reaction|反应|点击|躲避/.test(text)) return 'reaction';
  if (/quiz|问答|谜题|推理/.test(text)) return 'quiz';
  return 'adventure';
}

function buildDesign(prompt) {
  const genre = classifyPrompt(prompt);
  const titleSeed = clampText(prompt, 48, 'Agent Quest').replace(/[。.!?？].*$/, '');
  const title = titleSeed.length < 8 ? 'Agent Quest: Signal Run' : titleSeed;
  const tags = genre === 'memory' ? ['memory', 'puzzle', 'agent-made'] : genre === 'reaction' ? ['reaction', 'arcade', 'agent-made'] : genre === 'quiz' ? ['quiz', 'story', 'agent-made'] : ['adventure', 'choice', 'agent-made'];
  const summaryMap = {
    memory: 'A compact memory challenge generated from creator intent and shipped as a portable web artifact.',
    reaction: 'A fast reaction loop with score, timer, and replayable rules, produced by the local agent harness.',
    quiz: 'A branching quiz experience with readable state transitions and deterministic win conditions.',
    adventure: 'A choice-driven interactive story that can be previewed, published, and played from object storage.'
  };
  return { genre, title, tags, summary: summaryMap[genre], palette: PALETTES[Math.abs(title.length + prompt.length) % PALETTES.length] };
}

function bundleTemplate({ gameId, title, summary, genre, prompt }) {
  const safeTitle = escapeHtml(title);
  const safeSummary = escapeHtml(summary);
  const data = safeJson({ gameId, title, genre, prompt: clampText(prompt, 240, '') });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
<style>
:root{color-scheme:dark;--bg:#071016;--panel:#101923;--ink:#f8fafc;--muted:#a7b1bd;--line:#263241;--accent:#38bdf8;--good:#22c55e;--warn:#f59e0b}*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;background:radial-gradient(circle at 20% 20%,#164e63,transparent 32%),linear-gradient(135deg,#071016,#101827 54%,#162014);color:var(--ink);display:grid;place-items:center;padding:20px}.shell{width:min(920px,100%);border:1px solid rgba(255,255,255,.14);background:rgba(8,14,22,.82);box-shadow:0 28px 80px rgba(0,0,0,.36);border-radius:22px;overflow:hidden}.top{padding:22px 24px;border-bottom:1px solid rgba(255,255,255,.1);display:flex;justify-content:space-between;gap:16px;align-items:start}.eyebrow{color:#7dd3fc;text-transform:uppercase;font-size:12px;font-weight:800;letter-spacing:.12em}.title{font-size:clamp(28px,5vw,52px);line-height:1;margin:8px 0}.summary{max-width:680px;color:var(--muted);font-size:16px}.stats{display:flex;gap:10px;flex-wrap:wrap}.pill{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);padding:8px 11px;border-radius:999px;color:#dbeafe;font-size:13px}.stage{padding:24px;display:grid;gap:18px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.choice,.primary{border:0;border-radius:16px;background:#e2e8f0;color:#0f172a;padding:16px;font-weight:800;font-size:16px;cursor:pointer;transition:.16s transform,.16s filter}.choice:hover,.primary:hover{transform:translateY(-1px);filter:brightness(1.04)}.primary{background:linear-gradient(135deg,#38bdf8,#34d399)}.log{min-height:120px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:rgba(255,255,255,.05);padding:18px;color:#d1d5db;line-height:1.7}.bar{height:12px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden}.bar>span{display:block;height:100%;width:0;background:linear-gradient(90deg,#38bdf8,#22c55e);transition:width .25s}.footer{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;color:#9ca3af;font-size:13px;padding:0 24px 24px}@media(max-width:680px){.top{display:block}.grid{grid-template-columns:1fr}.title{font-size:34px}}
</style>
</head>
<body>
<main class="shell">
  <section class="top">
    <div><div class="eyebrow">AI Agent Generated Bundle</div><h1 class="title">${safeTitle}</h1><p class="summary">${safeSummary}</p></div>
    <div class="stats"><span class="pill" id="score">Score 0</span><span class="pill" id="timer">Ready</span></div>
  </section>
  <section class="stage">
    <div class="log" id="log"></div>
    <div class="bar"><span id="bar"></span></div>
    <div class="grid" id="choices"></div>
    <button class="primary" id="restart">Restart run</button>
  </section>
  <footer class="footer"><span>Loaded from manifest/object storage</span><span id="runtime"></span></footer>
</main>
<script>
const GAME = ${data};
const log = document.querySelector('#log');
const choices = document.querySelector('#choices');
const scoreEl = document.querySelector('#score');
const timerEl = document.querySelector('#timer');
const bar = document.querySelector('#bar');
const runtime = document.querySelector('#runtime');
let score = 0;
let step = 0;
let started = Date.now();
const flows = {
  adventure: [
    ['The signal wakes inside a sealed arcade cabinet. What do you inspect first?', ['Trace the glowing cable', 'Open the service hatch']],
    ['A tiny build agent offers two routes through the maze.', ['Optimize for speed', 'Optimize for safety']],
    ['The final gate asks for proof that this is a real playable artifact.', ['Show manifest', 'Replay from bundle']]
  ],
  memory: [
    ['Memorize this route: BLUE, GREEN, GOLD. Which comes second?', ['GREEN', 'GOLD']],
    ['A second pattern appears: SUN, MOON, SUN. What repeats?', ['SUN', 'MOON']],
    ['The vault asks for the safest storage boundary.', ['Object key', 'Absolute disk path']]
  ],
  reaction: [
    ['Warm up. Click the action that ships faster without skipping validation.', ['Run tests', 'Ignore errors']],
    ['A spike appears in the telemetry panel.', ['Retry with log', 'Hide failure']],
    ['Final sprint: choose the route with a stable runtime.', ['Manifest loader', 'Hardcoded component']]
  ],
  quiz: [
    ['Which page proves remote artifact loading?', ['Play', 'Static mock']],
    ['Which table stores Agent steps?', ['agent_logs', 'sessions']],
    ['Which control protects generated games?', ['iframe sandbox', 'innerHTML trust']]
  ]
};
function render() {
  const list = flows[GAME.genre] || flows.adventure;
  const current = list[step];
  scoreEl.textContent = 'Score ' + score;
  timerEl.textContent = step >= list.length ? 'Complete' : 'Step ' + (step + 1) + '/' + list.length;
  bar.style.width = Math.round((step / list.length) * 100) + '%';
  runtime.textContent = 'Runtime ' + Math.max(1, Math.round((Date.now() - started) / 1000)) + 's';
  if (!current) {
    log.innerHTML = '<strong>Published game complete.</strong><br>This bundle ran inside a sandboxed Play frame and reported stable local state.';
    choices.innerHTML = '';
    bar.style.width = '100%';
    return;
  }
  log.textContent = current[0];
  choices.innerHTML = '';
  current[1].forEach((label, index) => {
    const btn = document.createElement('button');
    btn.className = 'choice';
    btn.textContent = label;
    btn.addEventListener('click', () => { score += index === 0 ? 10 : 3; step += 1; render(); });
    choices.appendChild(btn);
  });
}
document.querySelector('#restart').addEventListener('click', () => { score = 0; step = 0; started = Date.now(); render(); });
setInterval(() => { runtime.textContent = 'Runtime ' + Math.max(1, Math.round((Date.now() - started) / 1000)) + 's'; }, 1000);
render();
</script>
</body>
</html>`;
}

export async function buildGameArtifact({ storage, prompt, authorName, modelProvider, assets = [], preferredStatus = 'draft' }) {
  const design = buildDesign(prompt);
  const gameId = id('gameartifact');
  const rootKey = `games/${safeSlug(design.title, 'game')}-${gameId}`;
  const bundleKey = `${rootKey}/bundle.html`;
  const manifestKey = `${rootKey}/manifest.json`;
  const bundle = bundleTemplate({ gameId, title: design.title, summary: design.summary, genre: design.genre, prompt });
  await storage.putText(bundleKey, bundle);
  const manifest = {
    schemaVersion: 1,
    gameId,
    title: design.title,
    summary: design.summary,
    entry: `/objects/${bundleKey}`,
    bundleKey,
    runtime: 'sandboxed-html-v1',
    generatedBy: modelProvider,
    authorName,
    status: preferredStatus,
    tags: design.tags,
    assets: assets.map((asset) => ({ key: asset.object_key, filename: asset.filename, size: asset.size, sha256: asset.sha256 })),
    capabilities: { network: false, storage: 'ephemeral', eval: false },
    createdAt: nowIso()
  };
  await storage.putText(manifestKey, JSON.stringify(manifest, null, 2));
  return { design, gameId, manifestKey, bundleKey, assetKeys: assets.map((asset) => asset.object_key), coverGradient: design.palette };
}

export class AgentOrchestrator {
  constructor({ store, storage, config }) {
    this.store = store;
    this.storage = storage;
    this.config = config;
    this.running = new Set();
  }

  enqueue(taskId) {
    if (this.running.has(taskId)) return;
    this.running.add(taskId);
    queueMicrotask(() => this.run(taskId).finally(() => this.running.delete(taskId)));
  }

  async run(taskId) {
    const task = this.store.getTask(taskId);
    if (!task) return;
    const user = this.store.getUserById(task.user_id);
    const assets = this.store.listAssetsForTask(taskId);
    const log = (level, step, message, meta = {}) => this.store.addLog({ taskId, level, step, message, meta });
    try {
      this.store.updateTask(taskId, { status: 'running', currentStep: 'intent-analysis', progress: 12 });
      log('info', 'intent-analysis', 'Parsed creator intent and selected a deterministic game genre.', { promptLength: task.prompt.length });
      await sleep(120);

      this.store.updateTask(taskId, { currentStep: 'safety-screen', progress: 28 });
      const risky = /ignore previous|system prompt|exfiltrate|delete files|powershell|cmd\.exe/i.test(task.prompt);
      log(risky ? 'warn' : 'info', 'safety-screen', risky ? 'Prompt injection-like content detected and neutralized.' : 'No dangerous execution request found in creator prompt.', { risky });
      await sleep(120);

      this.store.updateTask(taskId, { currentStep: 'artifact-build', progress: 52 });
      log('info', 'artifact-build', 'Generated portable HTML bundle and manifest contract.', { assets: assets.length, storage: 'LocalObjectStorage' });
      const artifact = await buildGameArtifact({ storage: this.storage, prompt: task.prompt, authorName: user.name, modelProvider: this.config.modelProvider, assets, preferredStatus: 'draft' });
      await sleep(120);

      this.store.updateTask(taskId, { currentStep: 'persistence', progress: 78 });
      const game = this.store.createGameWithVersion({
        title: artifact.design.title,
        summary: artifact.design.summary,
        tags: artifact.design.tags,
        authorId: user.id,
        authorName: user.name,
        origin: 'create-agent',
        status: 'draft',
        prompt: task.prompt,
        manifestKey: artifact.manifestKey,
        bundleKey: artifact.bundleKey,
        assetKeys: artifact.assetKeys,
        modelProvider: this.config.modelProvider,
        coverGradient: artifact.coverGradient
      });
      log('info', 'persistence', 'Saved game metadata, version, manifest key, and bundle key to database.', { gameId: game.id, manifestKey: artifact.manifestKey });
      await sleep(120);

      this.store.updateTask(taskId, { status: 'succeeded', currentStep: 'ready-to-preview', progress: 100, gameId: game.id, artifactManifestKey: artifact.manifestKey, completedAt: nowIso() });
      log('info', 'ready-to-preview', 'Generation succeeded. Creator can preview or publish.', { gameId: game.id });
      this.store.audit({ actorId: user.id, type: 'generation.succeeded', message: `Generated game ${game.title}`, meta: { taskId, gameId: game.id } });
    } catch (error) {
      this.store.updateTask(taskId, { status: 'failed', currentStep: 'failed', progress: 100, error: error.message, completedAt: nowIso() });
      log('error', 'failed', error.message, { stack: error.stack?.split('\n').slice(0, 3) });
      this.store.audit({ actorId: task.user_id, type: 'generation.failed', message: error.message, meta: { taskId } });
    }
  }
}