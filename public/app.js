const app = document.querySelector('#app');
const state = {
  user: null,
  csrfToken: null,
  route: location.hash.replace('#', '') || '/home',
  games: [],
  tasks: [],
  activeTask: null,
  playGame: null,
  playState: { status: 'idle', error: '', manifest: null },
  uploadedAssets: [],
  query: '',
  tag: ''
};
let pollTimer = null;

const icons = { home: 'H', create: '+', tasks: 'T', play: '>', docs: 'D' };
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const COVER_ASSETS = {
  memory: '/assets/covers/memory.png',
  reaction: '/assets/covers/reaction.png',
  adventure: '/assets/covers/adventure.png',
  quiz: '/assets/covers/quiz.png'
};

function html(strings, ...values) {
  return strings.reduce((out, part, i) => out + part + (values[i] ?? ''), '');
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function fmtDate(value) {
  if (!value) return 'not published';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

async function api(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body;
  const isBinary = body instanceof Blob || body instanceof ArrayBuffer || ArrayBuffer.isView(body);
  const headers = {
    ...(body && typeof body !== 'string' && !isBinary ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {})
  };
  if (state.csrfToken && MUTATING_METHODS.has(method) && !headers['X-CSRF-Token'] && !headers['x-csrf-token']) {
    headers['X-CSRF-Token'] = state.csrfToken;
  }
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    method,
    headers,
    body: body && typeof body !== 'string' && !isBinary ? JSON.stringify(body) : body
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (data.csrfToken) state.csrfToken = data.csrfToken;
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function navigate(route) {
  state.route = route;
  history.replaceState(null, '', '#' + route);
  render();
  afterRender();
}

async function bootstrap() {
  try {
    const me = await api('/api/me');
    state.user = me.user;
    await loadGames();
    if (state.user) await loadTasks();
  } catch (error) {
    console.error(error);
  }
  render();
  afterRender();
}

async function loadGames() {
  const params = new URLSearchParams({ status: 'published' });
  if (state.query) params.set('q', state.query);
  if (state.tag) params.set('tag', state.tag);
  const data = await api('/api/games?' + params.toString());
  state.games = data.games;
}

async function loadTasks() {
  if (!state.user) return;
  const data = await api('/api/tasks');
  state.tasks = data.tasks;
}

function routeTitle() {
  const map = {
    '/home': ['Published games', 'Browse playable artifacts backed by database metadata.'],
    '/create': ['Create agent', 'Generate a playable bundle from prompt and uploaded material.'],
    '/tasks': ['Generation tasks', 'Inspect Agent progress, logs, failures, and publish state.'],
    '/play': ['Play runtime', 'Manifest-driven iframe loader with sandboxed game execution.'],
    '/docs': ['Delivery notes', 'Architecture, boundaries, and verification summary.']
  };
  return map[state.route] || map['/home'];
}

function renderAuth() {
  app.innerHTML = html`
    <div class="auth-wrap">
      <section class="auth-card">
        <div class="brand"><div class="brand-mark">FP</div><div><div class="brand-title">ForgePlay Agent Platform</div><div class="brand-sub">AI Native game MVP</div></div></div>
        <div><h1>Sign in to create</h1><p class="muted">Use the demo account or register a new creator. Demo: <span class="kbd">creator@example.com</span> / <span class="kbd">password123</span></p></div>
        <div class="auth-tabs"><button id="loginTab" class="active">Login</button><button id="registerTab">Register</button></div>
        <form id="authForm" class="form-row">
          <div class="form-row" id="nameRow" style="display:none"><label>Name</label><input class="input" name="name" value="New Creator"></div>
          <div class="form-row"><label>Email</label><input class="input" name="email" type="email" value="creator@example.com" required></div>
          <div class="form-row"><label>Password</label><input class="input" name="password" type="password" value="password123" required></div>
          <button class="primary" type="submit">Continue</button>
        </form>
        <div class="form-grid">
          <button class="ghost" id="githubLogin">GitHub demo OAuth</button>
          <button class="ghost" id="googleLogin">Google demo OAuth</button>
        </div>
        <div id="authMsg"></div>
      </section>
    </div>`;
}

function renderShell(content) {
  const [title, sub] = routeTitle();
  app.innerHTML = html`
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><div class="brand-mark">FP</div><div><div class="brand-title">ForgePlay</div><div class="brand-sub">Agent game platform</div></div></div>
        <nav class="nav">
          ${navButton('/home', icons.home, 'Home')}
          ${navButton('/create', icons.create, 'Create')}
          ${navButton('/tasks', icons.tasks, 'Tasks')}
          ${navButton('/play', icons.play, 'Play')}
          ${navButton('/docs', icons.docs, 'Docs')}
        </nav>
        <div class="sidebar-foot">
          <div class="user-chip"><strong>${esc(state.user?.name || 'Guest')}</strong><span>${esc(state.user?.email || 'Browsing anonymously')}</span></div>
          ${state.user ? '<button class="ghost" id="logoutBtn">Logout</button>' : '<button class="primary" id="showLogin">Login / Register</button>'}
        </div>
      </aside>
      <main class="main">
        <header class="topbar"><div><div class="page-title">${esc(title)}</div><div class="page-sub">${esc(sub)}</div></div><div class="actions"><button class="ghost" id="refreshBtn">Refresh</button><button class="primary" id="quickCreate">+ Create</button></div></header>
        <section class="content">${content}</section>
      </main>
    </div>`;
}

function navButton(route, icon, label) {
  return `<button data-nav="${route}" class="${state.route === route ? 'active' : ''}"><span class="icon">${icon}</span><span>${label}</span></button>`;
}

function render() {
  clearInterval(pollTimer);
  pollTimer = null;
  if (!state.user && ['/create', '/tasks'].includes(state.route)) return renderAuth();
  if (state.route === '/home') return renderShell(homeView());
  if (state.route === '/create') return renderShell(createView());
  if (state.route === '/tasks') return renderShell(tasksView());
  if (state.route === '/play') return renderShell(playView());
  if (state.route === '/docs') return renderShell(docsView());
  return renderShell(homeView());
}

function homeView() {
  const tags = [...new Set(state.games.flatMap((game) => game.tags || []))].sort();
  return html`
    <div class="toolbar">
      <div class="searchbar"><input class="input" id="searchInput" placeholder="Search title, tag, summary" value="${esc(state.query)}"><button class="secondary" id="searchBtn">Search</button></div>
      <select id="tagFilter" style="max-width:220px"><option value="">All tags</option>${tags.map((tag) => `<option ${state.tag === tag ? 'selected' : ''} value="${esc(tag)}">${esc(tag)}</option>`).join('')}</select>
    </div>
    ${state.games.length ? `<div class="grid">${state.games.map(gameCard).join('')}</div>` : '<div class="empty">No published games match the current filter.</div>'}`;
}

function gameCard(game) {
  const cover = coverAssetFor(game);
  const coverStyle = cover
    ? `background-image:linear-gradient(180deg,rgba(2,6,23,.02),rgba(2,6,23,.34)),url('${cover}');`
    : `background:${esc(game.coverGradient)};`;
  return html`<article class="card game-card">
    <div class="cover" style="${coverStyle}"><span>${esc(game.origin)}</span></div>
    <div class="game-body">
      <div><div class="game-title">${esc(game.title)}</div><div class="hint">by ${esc(game.authorName)} - ${fmtDate(game.publishedAt)}</div></div>
      <p class="summary">${esc(game.summary)}</p>
      <div class="tags">${(game.tags || []).map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')}</div>
      <div class="metrics"><div class="metric"><strong>${game.playCount}</strong><span>plays</span></div><div class="metric"><strong>${game.likeCount}</strong><span>likes</span></div><div class="metric"><strong>${game.favoriteCount}</strong><span>saves</span></div></div>
      <div class="actions"><button class="primary" data-play="${esc(game.id)}">Play</button><button class="ghost" data-detail="${esc(game.id)}">Manifest</button></div>
    </div>
  </article>`;
}

function coverAssetFor(game) {
  const haystack = [game.title, game.summary, ...(game.tags || [])].join(' ').toLowerCase();
  if (haystack.includes('reaction') || haystack.includes('starship')) return COVER_ASSETS.reaction;
  if (haystack.includes('memory') || haystack.includes('robot') || haystack.includes('greenhouse')) return COVER_ASSETS.memory;
  if (haystack.includes('quiz') || haystack.includes('trivia')) return COVER_ASSETS.quiz;
  if (haystack.includes('adventure') || haystack.includes('archive') || haystack.includes('agent')) return COVER_ASSETS.adventure;
  return '';
}

function createView() {
  return html`
    <div class="split">
      <section class="panel">
        <h2>Creator input</h2>
        <form id="createForm" class="form-row">
          <div class="form-row"><label>Game title hint</label><input class="input" name="title" value="Neon Archive Sprint"></div>
          <div class="form-row"><label>Creative prompt</label><textarea name="prompt">Create an interactive adventure where a player repairs a floating archive with memory puzzles, a clear win state, and a short replay loop.</textarea><div class="hint">The local agent turns this into a portable HTML bundle plus manifest.</div></div>
          <div class="form-row"><label>Upload reference material</label><input class="input" id="assetInput" type="file" multiple accept="image/*,video/*,.txt,.json,.pdf"><div class="hint">Uploads are stored under object storage, linked by key and sha256.</div></div>
          <div id="assetList" class="tags">${state.uploadedAssets.map((asset) => `<span class="tag">${esc(asset.filename)}</span>`).join('')}</div>
          <button class="primary" type="submit">Generate playable game</button>
        </form>
        <div id="createMsg"></div>
      </section>
      <section class="panel">
        <h2>Expected Agent chain</h2>
        <table class="table"><tbody>
          <tr><th>1</th><td>Intent analysis and genre selection.</td></tr>
          <tr><th>2</th><td>Safety screen for prompt injection and unsafe file execution.</td></tr>
          <tr><th>3</th><td>Bundle and manifest generation into object storage.</td></tr>
          <tr><th>4</th><td>Database persistence for task, version, game meta, logs.</td></tr>
          <tr><th>5</th><td>Preview, then publish to Home.</td></tr>
        </tbody></table>
      </section>
    </div>`;
}

function tasksView() {
  const rows = state.tasks.map((task) => html`<tr>
    <td><strong>${esc(task.title)}</strong><div class="hint">${esc(task.id)}</div></td>
    <td><span class="status ${esc(task.status)}">${esc(task.status)}</span><div class="progress"><span style="width:${Number(task.progress) || 0}%"></span></div></td>
    <td>${esc(task.currentStep)}</td>
    <td>${task.gameId ? `<button class="ghost" data-play="${esc(task.gameId)}">Preview</button> ${task.gameStatus === 'published' ? '<span class="status published">published</span>' : `<button class="secondary" data-publish="${esc(task.gameId)}">Publish</button>`}` : '-'}</td>
    <td><button class="ghost" data-task="${esc(task.id)}">Logs</button></td>
  </tr>`).join('');
  return html`<section class="panel"><h2>Task history</h2>${state.tasks.length ? `<table class="table"><thead><tr><th>Task</th><th>Status</th><th>Step</th><th>Artifact</th><th>Inspect</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">No tasks yet. Create one to see Agent logs.</div>'}</section>${state.activeTask ? taskDetail(state.activeTask) : ''}`;
}

function taskDetail(task) {
  return html`<section class="panel"><h2>Agent execution log</h2><div class="progress"><span style="width:${Number(task.progress) || 0}%"></span></div><p class="summary">${esc(task.prompt)}</p><div class="log-list">${(task.logs || []).map((log) => `<div class="log-item"><div class="log-head"><span>${esc(log.level)} - ${esc(log.step)}</span><span>${fmtDate(log.createdAt)}</span></div><div>${esc(log.message)}</div></div>`).join('')}</div></section>`;
}

function playView() {
  const game = state.playGame || state.games[0];
  return html`<div class="play-layout">
    <section class="panel"><div class="toolbar"><div><h2>${esc(game?.title || 'Select a game')}</h2><div class="hint">${game ? `Manifest: ${esc(game.manifestUrl)}` : 'Choose a published game from Home.'}</div></div><div class="actions"><button class="ghost" id="backHome">Back home</button>${game ? `<button class="secondary" data-play="${esc(game.id)}">Reload manifest</button>` : ''}</div></div></section>
    <section class="play-frame-wrap" id="playWrap">${playFrameContent()}</section>
  </div>`;
}

function playFrameContent() {
  if (state.playState.status === 'loading') return '<div class="loader"><h2>Loading game files</h2><p>Fetching manifest, validating entry URL, then mounting sandboxed runtime.</p></div>';
  if (state.playState.status === 'failed') return `<div class="loader"><h2>Load failed</h2><p>${esc(state.playState.error)}</p></div>`;
  if (state.playState.status === 'loaded' && state.playState.manifest) {
    const src = esc(state.playState.manifest.entry);
    return `<iframe class="play-frame" title="Game runtime" sandbox="allow-scripts" referrerpolicy="no-referrer" src="${src}"></iframe>`;
  }
  return '<div class="loader"><h2>Runtime idle</h2><p>Pick a game and Play will dynamically load its manifest and bundle.</p></div>';
}

function docsView() {
  return html`<section class="panel"><h2>Delivery boundary</h2><p class="summary">This MVP stores all runtime files inside the project folder: SQLite in <span class="kbd">data/</span>, object artifacts in <span class="kbd">storage/objects</span>, and docs in <span class="kbd">docs/</span>. The product path covers register/login, Create generation, preview, publish, Home discovery, and Play dynamic loading.</p></section>
  <section class="panel"><h2>Reviewer checklist</h2><table class="table"><tbody>
    <tr><th>Architecture</th><td>Frontend, backend, async task runner, database, and storage adapter are separated.</td></tr>
    <tr><th>Security</th><td>HttpOnly SameSite cookies, upload limits, sanitized object keys, sandbox iframe, CSP, and prompt-injection screen.</td></tr>
    <tr><th>Observability</th><td>Task states, Agent logs, audit events, health endpoint, and verification docs.</td></tr>
    <tr><th>Extensibility</th><td>ObjectStorage and AgentOrchestrator boundaries support S3/OSS and real model providers later.</td></tr>
  </tbody></table></section>`;
}

function afterRender() {
  document.querySelectorAll('[data-nav]').forEach((btn) => btn.addEventListener('click', () => navigate(btn.dataset.nav)));
  document.querySelector('#refreshBtn')?.addEventListener('click', async () => { await refreshAll(); });
  document.querySelector('#quickCreate')?.addEventListener('click', () => navigate('/create'));
  document.querySelector('#showLogin')?.addEventListener('click', () => { renderAuth(); wireAuth(); });
  document.querySelector('#logoutBtn')?.addEventListener('click', logout);
  document.querySelector('#searchBtn')?.addEventListener('click', doSearch);
  document.querySelector('#searchInput')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') doSearch(); });
  document.querySelector('#tagFilter')?.addEventListener('change', async (event) => { state.tag = event.target.value; await loadGames(); render(); afterRender(); });
  document.querySelectorAll('[data-play]').forEach((btn) => btn.addEventListener('click', () => loadPlay(btn.dataset.play)));
  document.querySelectorAll('[data-publish]').forEach((btn) => btn.addEventListener('click', () => publish(btn.dataset.publish)));
  document.querySelectorAll('[data-task]').forEach((btn) => btn.addEventListener('click', () => openTask(btn.dataset.task)));
  document.querySelectorAll('[data-detail]').forEach((btn) => btn.addEventListener('click', () => showManifest(btn.dataset.detail)));
  document.querySelector('#backHome')?.addEventListener('click', () => navigate('/home'));
  wireAuth();
  wireCreate();
  if (state.route === '/tasks' && state.tasks.some((task) => ['pending', 'running'].includes(task.status))) {
    pollTimer = setInterval(async () => { await loadTasks(); if (state.activeTask) await openTask(state.activeTask.id, false); render(); afterRender(); }, 1200);
  }
}

function wireAuth() {
  const form = document.querySelector('#authForm');
  if (!form) return;
  let mode = 'login';
  const setMode = (next) => {
    mode = next;
    document.querySelector('#loginTab').classList.toggle('active', mode === 'login');
    document.querySelector('#registerTab').classList.toggle('active', mode === 'register');
    document.querySelector('#nameRow').style.display = mode === 'register' ? 'grid' : 'none';
  };
  document.querySelector('#loginTab').addEventListener('click', () => setMode('login'));
  document.querySelector('#registerTab').addEventListener('click', () => setMode('register'));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(form);
    try {
      const data = await api(mode === 'login' ? '/api/auth/login' : '/api/auth/register', { method: 'POST', body: { email: fd.get('email'), password: fd.get('password'), name: fd.get('name') } });
      state.user = data.user;
      await refreshAll();
      navigate('/home');
    } catch (error) { document.querySelector('#authMsg').innerHTML = `<div class="alert error">${esc(error.message)}</div>`; }
  });
  document.querySelector('#githubLogin').addEventListener('click', () => oauth('github'));
  document.querySelector('#googleLogin').addEventListener('click', () => oauth('google'));
}

async function oauth(provider) {
  try {
    const data = await api(`/api/auth/oauth/${provider}`, { method: 'POST', body: { email: `${provider}.creator@example.com` } });
    state.user = data.user;
    await refreshAll();
    navigate('/home');
  } catch (error) { document.querySelector('#authMsg').innerHTML = `<div class="alert error">${esc(error.message)}</div>`; }
}

function wireCreate() {
  const form = document.querySelector('#createForm');
  if (!form) return;
  document.querySelector('#assetInput').addEventListener('change', uploadSelectedAssets);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(form);
    const msg = document.querySelector('#createMsg');
    msg.innerHTML = '<div class="alert">Generation queued. Agent logs will appear in Tasks.</div>';
    try {
      const data = await api('/api/tasks', { method: 'POST', body: { title: fd.get('title'), prompt: fd.get('prompt'), assetIds: state.uploadedAssets.map((asset) => asset.id) } });
      state.activeTask = data.task;
      state.uploadedAssets = [];
      await loadTasks();
      navigate('/tasks');
    } catch (error) { msg.innerHTML = `<div class="alert error">${esc(error.message)}</div>`; }
  });
}

async function uploadSelectedAssets(event) {
  const msg = document.querySelector('#createMsg');
  const files = Array.from(event.target.files || []).slice(0, 5);
  for (const file of files) {
    try {
      msg.innerHTML = `<div class="alert">Uploading ${esc(file.name)}</div>`;
      const data = await api('/api/assets', { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Filename': encodeURIComponent(file.name) }, body: await file.arrayBuffer() });
      state.uploadedAssets.push(data.asset);
    } catch (error) { msg.innerHTML = `<div class="alert error">${esc(error.message)}</div>`; }
  }
  render();
  afterRender();
}

async function doSearch() {
  state.query = document.querySelector('#searchInput')?.value || '';
  await loadGames();
  render();
  afterRender();
}

async function refreshAll() {
  await loadGames();
  if (state.user) await loadTasks();
  render();
  afterRender();
}

async function logout() {
  await api('/api/auth/logout', { method: 'POST', body: {} });
  state.csrfToken = null;
  state.user = null;
  state.tasks = [];
  state.activeTask = null;
  navigate('/home');
}

async function openTask(taskId, rerender = true) {
  const data = await api(`/api/tasks/${taskId}`);
  state.activeTask = data.task;
  if (rerender) { render(); afterRender(); }
}

async function publish(gameId) {
  try {
    await api(`/api/games/${gameId}/publish`, { method: 'POST', body: {} });
    await refreshAll();
  } catch (error) { alert(error.message); }
}

async function showManifest(gameId) {
  try {
    const data = await api(`/api/games/${gameId}/manifest`);
    alert(JSON.stringify(data.manifest, null, 2));
  } catch (error) { alert(error.message); }
}

async function loadPlay(gameId) {
  const game = state.games.find((item) => item.id === gameId) || state.tasks.find((task) => task.gameId === gameId);
  state.playGame = state.games.find((item) => item.id === gameId) || { id: gameId, title: game?.gameTitle || 'Preview game', manifestUrl: '' };
  state.playState = { status: 'loading', error: '', manifest: null };
  navigate('/play');
  try {
    const data = await api(`/api/games/${gameId}/manifest`);
    const entry = data.manifest?.entry;
    if (!entry || !entry.startsWith('/objects/')) throw new Error('Manifest entry must point to object storage.');
    state.playGame = data.game;
    state.playState = { status: 'loaded', error: '', manifest: data.manifest };
  } catch (error) {
    state.playState = { status: 'failed', error: error.message, manifest: null };
  }
  render();
  afterRender();
}

window.addEventListener('hashchange', () => { state.route = location.hash.replace('#', '') || '/home'; render(); afterRender(); });
bootstrap();
