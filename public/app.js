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
  if (!value) return '未发布';
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
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
  if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
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
    '/home': ['游戏大厅', 'AI 生成的横版游戏，从对象存储发布并运行。'],
    '/create': ['创作工坊', '设计、生成、检查并发布可玩的横版游戏。'],
    '/tasks': ['智能体控制台', '查看模型设计、构建日志、产物持久化和发布状态。'],
    '/play': ['试玩运行时', '通过 manifest 加载的 16:9 沙盒对象运行时。'],
    '/docs': ['交付系统', '架构、运维、风险与验证证据。']
  };
  return map[state.route] || map['/home'];
}

function renderAuth() {
  app.innerHTML = html`
    <div class="auth-wrap">
      <section class="auth-card">
        <div class="brand"><div class="brand-mark">FP</div><div><div class="brand-title">ForgePlay 智能体平台</div><div class="brand-sub">AI 原生游戏 MVP</div></div></div>
        <div><h1>登录后开始创作</h1><p class="muted">使用演示账号或注册新创作者。演示：<span class="kbd">creator@example.com</span> / <span class="kbd">password123</span></p></div>
        <div class="auth-tabs"><button id="loginTab" class="active">登录</button><button id="registerTab">注册</button></div>
        <form id="authForm" class="form-row">
          <div class="form-row" id="nameRow" style="display:none"><label>昵称</label><input class="input" name="name" value="新创作者"></div>
          <div class="form-row"><label>邮箱</label><input class="input" name="email" type="email" value="creator@example.com" required></div>
          <div class="form-row"><label>密码</label><input class="input" name="password" type="password" value="password123" required></div>
          <button class="primary" type="submit">继续</button>
        </form>
        <div class="form-grid">
          <button class="ghost" id="githubLogin">GitHub 演示 OAuth</button>
          <button class="ghost" id="googleLogin">Google 演示 OAuth</button>
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
        <div class="brand"><div class="brand-mark">FP</div><div><div class="brand-title">ForgePlay</div><div class="brand-sub">智能体游戏平台</div></div></div>
        <nav class="nav">
          ${navButton('/home', icons.home, '大厅')}
          ${navButton('/create', icons.create, '创作')}
          ${navButton('/tasks', icons.tasks, '任务')}
          ${navButton('/play', icons.play, '试玩')}
          ${navButton('/docs', icons.docs, '文档')}
        </nav>
        <div class="sidebar-foot">
          <div class="user-chip"><strong>${esc(state.user?.name || '访客')}</strong><span>${esc(state.user?.email || '匿名浏览')}</span></div>
          ${state.user ? '<button class="ghost" id="logoutBtn">退出</button>' : '<button class="primary" id="showLogin">登录 / 注册</button>'}
        </div>
      </aside>
      <main class="main">
        <header class="topbar"><div><div class="page-title">${esc(title)}</div><div class="page-sub">${esc(sub)}</div></div><div class="actions"><button class="ghost" id="refreshBtn">刷新</button><button class="primary" id="quickCreate">+ 创作</button></div></header>
        <section class="content">${content}</section>
      </main>
    </div>`;
}

function navButton(route, icon, label) {
  return `<button data-nav="${route}" class="${state.route === route ? 'active' : ''}"><span class="icon">${icon}</span><span>${label}</span></button>`;
}

function statusLabel(value) {
  return {
    pending: '排队中',
    running: '生成中',
    succeeded: '已完成',
    failed: '失败',
    draft: '草稿',
    published: '已发布'
  }[value] || value;
}

function stepLabel(value) {
  return {
    queued: '已排队',
    'intent-analysis': '意图分析',
    'model-design': '模型设计',
    'safety-screen': '安全筛查',
    'artifact-build': '产物构建',
    persistence: '持久化',
    'ready-to-preview': '可预览',
    published: '已发布',
    failed: '失败'
  }[value] || value;
}

function isLiveTask(task) {
  return task && ['pending', 'running'].includes(task.status);
}

function runningTasks() {
  return state.tasks.filter(isLiveTask);
}

function liveTaskCandidates() {
  const byId = new Map();
  if (isLiveTask(state.activeTask)) byId.set(state.activeTask.id, state.activeTask);
  for (const task of runningTasks()) byId.set(task.id, task);
  return [...byId.values()];
}

function progressValue(task) {
  return Math.max(0, Math.min(100, Number(task?.progress) || 0));
}

function taskWaitCopy(task) {
  if (!task) return '等待智能体接收任务。';
  if (task.status === 'pending') return '任务已进入队列，正在等待智能体执行。';
  if (task.currentStep === 'model-design') return '外部模型正在生成设计 JSON，通常需要 10-60 秒。';
  if (task.currentStep === 'artifact-build') return '正在构建可运行 HTML bundle 与 manifest。';
  if (task.currentStep === 'persistence') return '正在写入数据库和对象存储。';
  if (task.status === 'running') return '智能体正在执行，页面会自动刷新状态。';
  if (task.status === 'succeeded') return '生成已完成，可以预览或发布。';
  if (task.status === 'failed') return '生成失败，请查看日志定位原因。';
  return '任务状态已更新。';
}

function taskLivePanel(tasks) {
  if (!tasks.length) return '';
  const task = tasks[0];
  const percent = progressValue(task);
  return html`<section class="panel task-live">
    <div class="task-live-head"><span class="status-dot"></span><div><div class="eyebrow">智能体正在运行</div><h2>${esc(task.title)}</h2></div></div>
    <div class="task-live-meta"><span>${esc(statusLabel(task.status))}</span><span>${esc(stepLabel(task.currentStep))}</span><span>${percent}%</span><span>自动刷新中</span></div>
    <div class="progress"><span style="width:${percent}%"></span></div>
    <p class="summary">${esc(taskWaitCopy(task))}</p>
    <div class="actions"><button class="secondary" data-task="${esc(task.id)}">查看实时日志</button></div>
  </section>`;
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
  const featured = state.games[0];
  const heroCover = featured ? coverAssetFor(featured) : '';
  const heroStyle = heroCover ? `--hero-cover:url('${heroCover}')` : '';
  return html`
    <section class="hero" style="${heroStyle}">
      <div class="hero-inner">
        <div>
          <div class="eyebrow">ForgePlay Studio · AI 原生游戏平台</div>
          <h1>用 AI 智能体生成可玩的横版游戏</h1>
          <p class="hero-copy">输入游戏想法，智能体会设计并构建可移植 HTML 产物，发布到数据库驱动的游戏大厅，再从对象存储加载到沙盒运行时中试玩。</p>
          <div class="actions"><button class="primary" data-nav="/create">创建游戏</button>${featured ? `<button class="secondary" data-play="${esc(featured.id)}">试玩精选</button>` : ''}<button class="ghost" data-nav="/docs">查看架构</button></div>
        </div>
        <aside class="hero-panel">
          <div class="eyebrow">运行时栈</div>
          <div class="status-grid">
            <div class="status-cell"><strong>${state.games.length}</strong><span>已发布</span></div>
            <div class="status-cell"><strong>16:9</strong><span>横版运行</span></div>
            <div class="status-cell"><strong>API</strong><span>模型就绪</span></div>
          </div>
          <p class="summary">每次试玩都会拉取 manifest，挂载 <span class="kbd">/objects/.../bundle.html</span>，并把生成代码隔离在 iframe 沙盒中。</p>
        </aside>
      </div>
    </section>
    <div class="toolbar">
      <div class="searchbar"><input class="input" id="searchInput" placeholder="搜索游戏、类型、标签" value="${esc(state.query)}"><button class="secondary" id="searchBtn">搜索</button></div>
      <select id="tagFilter" style="max-width:220px"><option value="">全部标签</option>${tags.map((tag) => `<option ${state.tag === tag ? 'selected' : ''} value="${esc(tag)}">${esc(tag)}</option>`).join('')}</select>
    </div>
    ${state.games.length ? `<div class="rail">${state.games.map(gameCard).join('')}</div>` : '<div class="empty">当前筛选下没有已发布游戏。</div>'}`;
}

function gameCard(game) {
  const cover = coverAssetFor(game);
  const coverStyle = cover
    ? `background-image:linear-gradient(180deg,rgba(2,6,23,.02),rgba(2,6,23,.34)),url('${cover}');`
    : `background:${esc(game.coverGradient)};`;
  return html`<article class="card game-card">
    <div class="cover" style="${coverStyle}"><span>${esc(game.origin)}</span></div>
    <div class="game-body">
      <div><div class="game-title">${esc(game.title)}</div><div class="hint">作者 ${esc(game.authorName)} · ${fmtDate(game.publishedAt)}</div></div>
      <p class="summary">${esc(game.summary)}</p>
      <div class="tags">${(game.tags || []).map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')}</div>
      <div class="metrics"><div class="metric"><strong>${game.playCount}</strong><span>试玩</span></div><div class="metric"><strong>${game.likeCount}</strong><span>喜欢</span></div><div class="metric"><strong>${game.favoriteCount}</strong><span>收藏</span></div></div>
      <div class="actions"><button class="primary" data-play="${esc(game.id)}">试玩</button><button class="ghost" data-detail="${esc(game.id)}">Manifest</button></div>
    </div>
  </article>`;
}

function coverAssetFor(game) {
  const haystack = [game.title, game.summary, ...(game.tags || [])].join(' ').toLowerCase();
  if (haystack.includes('reaction') || haystack.includes('starship') || haystack.includes('反应') || haystack.includes('星舰')) return COVER_ASSETS.reaction;
  if (haystack.includes('memory') || haystack.includes('robot') || haystack.includes('greenhouse') || haystack.includes('记忆') || haystack.includes('机器人') || haystack.includes('温室')) return COVER_ASSETS.memory;
  if (haystack.includes('quiz') || haystack.includes('trivia') || haystack.includes('问答') || haystack.includes('谜题')) return COVER_ASSETS.quiz;
  if (haystack.includes('adventure') || haystack.includes('archive') || haystack.includes('agent') || haystack.includes('冒险') || haystack.includes('档案') || haystack.includes('智能体') || haystack.includes('特工')) return COVER_ASSETS.adventure;
  return '';
}

function createView() {
  return html`
    <div class="studio">
      <section class="panel">
        <div class="eyebrow">AI 创作流水线</div>
        <h2>创作工坊</h2>
        <form id="createForm" class="form-row">
          <div class="form-row"><label>游戏标题提示</label><input class="input" name="title" value="信号奔跑：霓虹中继"></div>
          <div class="form-row"><label>创意提示词</label><textarea name="prompt">创建一个高级横版卷轴街机游戏。玩家需要修复霓虹中继，在平台间跳跃，收集能量核心，避开危险，并抵达最终闸门，拥有明确胜利状态。</textarea><div class="hint">配置 fighting API 变量后，智能体会请求模型设计 JSON，再构建沙盒 Canvas 产物。</div></div>
          <div class="form-row"><label>参考素材</label><input class="input" id="assetInput" type="file" multiple accept="image/*,video/*,.txt,.json,.pdf"><div class="hint">文件会带 sha256 元数据保存为对象 key，并关联到生成任务。</div></div>
          <div id="assetList" class="tags">${state.uploadedAssets.map((asset) => `<span class="tag">${esc(asset.filename)}</span>`).join('')}</div>
          <button class="primary" type="submit">生成横版游戏</button>
        </form>
        <div id="createMsg"></div>
      </section>
      <section class="panel studio-preview">
        <div style="position:relative;z-index:1">
          <div class="eyebrow">可玩产物目标</div>
          <h2>16:9 Canvas 运行时</h2>
          <p class="summary">生成产物包含键盘控制、横向摄像机、可收集核心、危险物、终点闸门、分数、计时、重开，以及沙盒安全渲染。</p>
          <div class="tags"><span class="tag">manifest 驱动</span><span class="tag">对象存储</span><span class="tag">iframe 沙盒</span><span class="tag">模型设计日志</span></div>
        </div>
        <div class="mock-stage"></div>
      </section>
    </div>`;
}

function tasksView() {
  const liveTasks = liveTaskCandidates();
  const rows = state.tasks.map((task) => {
    const percent = progressValue(task);
    return html`<tr>
      <td><strong>${esc(task.title)}</strong><div class="hint">${esc(task.id)}</div></td>
      <td><span class="status ${esc(task.status)}">${esc(statusLabel(task.status))}</span><div class="task-progress-line"><div class="progress"><span style="width:${percent}%"></span></div><span>${percent}%</span></div><div class="hint">${esc(taskWaitCopy(task))}</div></td>
      <td>${esc(stepLabel(task.currentStep))}</td>
      <td>${task.gameId ? `<button class="ghost" data-play="${esc(task.gameId)}">预览试玩</button> ${task.gameStatus === 'published' ? '<span class="status published">已发布</span>' : `<button class="secondary" data-publish="${esc(task.gameId)}">发布并试玩</button>`}` : '<span class="hint">等待产物</span>'}</td>
      <td><button class="ghost" data-task="${esc(task.id)}">日志</button></td>
    </tr>`;
  }).join('');
  return html`${taskLivePanel(liveTasks)}<section class="panel"><h2>任务历史</h2>${state.tasks.length ? `<table class="table"><thead><tr><th>任务</th><th>状态</th><th>步骤</th><th>产物</th><th>检查</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">还没有任务。创建一个游戏后可查看智能体日志。</div>'}</section>${state.activeTask ? taskDetail(state.activeTask) : ''}`;
}

function taskDetail(task) {
  const percent = progressValue(task);
  const actions = task.gameId ? `<div class="actions"><button class="primary" data-play="${esc(task.gameId)}">预览试玩</button>${task.gameStatus === 'published' ? '<span class="status published">已发布</span>' : `<button class="secondary" data-publish="${esc(task.gameId)}">发布并试玩</button>`}</div>` : '';
  return html`<section class="panel task-detail"><div class="task-detail-head"><div><div class="eyebrow">实时执行日志</div><h2>智能体执行日志</h2></div><span class="status ${esc(task.status)}">${esc(statusLabel(task.status))}</span></div><div class="task-live-meta"><span>${esc(stepLabel(task.currentStep))}</span><span>${percent}%</span><span>${['pending', 'running'].includes(task.status) ? '自动刷新中' : '已停止刷新'}</span></div><div class="progress"><span style="width:${percent}%"></span></div><p class="summary">${esc(taskWaitCopy(task))}</p>${actions}<p class="summary">${esc(task.prompt)}</p><div class="log-list">${(task.logs || []).map((log) => `<div class="log-item"><div class="log-head"><span>${esc(log.level)} · ${esc(stepLabel(log.step))}</span><span>${fmtDate(log.createdAt)}</span></div><div>${esc(log.message)}</div></div>`).join('')}</div></section>`;
}

function playView() {
  const game = state.playGame || state.games[0];
  return html`<div class="play-layout">
    <section class="panel"><div class="toolbar"><div><div class="eyebrow">沙盒对象运行时</div><h2>${esc(game?.title || '选择一个游戏')}</h2><div class="hint">${game ? `Manifest：${esc(game.manifestUrl || '通过 API 加载')}` : '请从游戏大厅选择一个已发布游戏。'}</div></div><div class="actions"><button class="ghost" id="backHome">游戏大厅</button>${game ? `<button class="secondary" data-play="${esc(game.id)}">重新加载</button>` : ''}</div></div></section>
    <section class="play-frame-wrap" id="playWrap">${playFrameContent()}</section>
  </div>`;
}

function playFrameContent() {
  if (state.playState.status === 'loading') return '<div class="loader"><h2>正在加载游戏文件</h2><p>正在获取 manifest、校验入口 URL，并挂载沙盒运行时。</p></div>';
  if (state.playState.status === 'failed') return `<div class="loader"><h2>加载失败</h2><p>${esc(state.playState.error)}</p></div>`;
  if (state.playState.status === 'loaded' && state.playState.manifest) {
    const src = esc(state.playState.manifest.entry);
    return `<iframe class="play-frame" title="游戏运行时" sandbox="allow-scripts" referrerpolicy="no-referrer" src="${src}"></iframe>`;
  }
  return '<div class="loader"><h2>准备加载</h2><p>正在等待选择游戏；进入试玩页时会自动加载第一个已发布游戏。</p></div>';
}

function preferredPlayGameId() {
  if (state.activeTask?.gameId) return state.activeTask.gameId;
  const latestTaskGame = state.tasks.find((task) => task.gameId)?.gameId;
  if (latestTaskGame) return latestTaskGame;
  return state.games[0]?.id || '';
}
function docsView() {
  return html`<section class="panel"><div class="eyebrow">工程交付</div><h2>提交边界</h2><p class="summary">运行时状态保留在项目文件夹内：SQLite 位于 <span class="kbd">data/</span>，对象产物位于 <span class="kbd">storage/objects</span>，交付证据位于 <span class="kbd">docs/</span>。默认演示不需要 Docker 或全局安装。</p></section>
  <section class="panel"><h2>评审清单</h2><table class="table"><tbody>
    <tr><th>产品</th><td>游戏大厅、创作工坊、智能体控制台和试玩运行时组成完整产品工作流。</td></tr>
    <tr><th>游戏运行时</th><td>生成 bundle 是可玩的 16:9 Canvas 横版游戏，并通过 manifest 从对象存储加载。</td></tr>
    <tr><th>安全</th><td>包含 HttpOnly SameSite Cookie、CSRF、上传限制、对象 key 清洗、iframe 沙盒、CSP 和提示词注入筛查。</td></tr>
    <tr><th>工程化</th><td>包含模型供应商契约测试、本地审计、API 冒烟测试、CI 工作流、运维手册和风险登记。</td></tr>
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
  if (state.route === '/play' && state.playState.status === 'idle' && !state.playGame) {
    const gameId = preferredPlayGameId();
    if (gameId) queueMicrotask(() => loadPlay(gameId));
  }
  const liveTasks = liveTaskCandidates();
  if (state.route === '/tasks' && liveTasks.length) {
    if (!state.activeTask) queueMicrotask(() => openTask(liveTasks[0].id));
    pollTimer = setInterval(async () => {
      await loadTasks();
      const freshLiveTasks = runningTasks();
      const stillActive = state.activeTask && state.tasks.some((task) => task.id === state.activeTask.id);
      const activeId = stillActive ? state.activeTask.id : freshLiveTasks[0]?.id;
      if (activeId) await openTask(activeId, false);
      render();
      afterRender();
    }, 1200);
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
    const submit = form.querySelector('button[type="submit"]');
    if (submit) { submit.disabled = true; submit.textContent = '正在提交任务'; }
    msg.innerHTML = '<div class="alert loading"><span class="status-dot"></span><div><strong>正在创建生成任务</strong><span>提交后会进入智能体控制台，外部模型设计阶段可能需要 10-60 秒。</span></div></div>';
    try {
      const data = await api('/api/tasks', { method: 'POST', body: { title: fd.get('title'), prompt: fd.get('prompt'), assetIds: state.uploadedAssets.map((asset) => asset.id) } });
      state.activeTask = data.task;
      state.uploadedAssets = [];
      msg.innerHTML = '<div class="alert loading"><span class="status-dot"></span><div><strong>生成任务已开始</strong><span>正在打开智能体控制台并自动刷新执行进度。</span></div></div>';
      navigate('/tasks');
      await loadTasks();
      await openTask(data.task.id, false);
      render();
      afterRender();
    } catch (error) {
      msg.innerHTML = `<div class="alert error">${esc(error.message)}</div>`;
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = '生成横版游戏'; }
    }
  });
}

async function uploadSelectedAssets(event) {
  const msg = document.querySelector('#createMsg');
  const files = Array.from(event.target.files || []).slice(0, 5);
  for (const file of files) {
    try {
      msg.innerHTML = `<div class="alert">正在上传 ${esc(file.name)}</div>`;
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
    const data = await api(`/api/games/${gameId}/publish`, { method: 'POST', body: {} });
    await loadGames();
    if (state.user) await loadTasks();
    await loadPlay(data.game?.id || gameId);
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
  state.playGame = state.games.find((item) => item.id === gameId) || { id: gameId, title: game?.gameTitle || '预览游戏', manifestUrl: '' };
  state.playState = { status: 'loading', error: '', manifest: null };
  navigate('/play');
  try {
    const data = await api(`/api/games/${gameId}/manifest`);
    const entry = data.manifest?.entry;
    if (!entry || !entry.startsWith('/objects/')) throw new Error('Manifest 入口必须指向对象存储。');
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

