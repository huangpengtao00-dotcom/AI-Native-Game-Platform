const app = document.querySelector('#app');
const state = {
  user: null,
  csrfToken: null,
  route: location.hash.replace('#', '') || '/intro',
  games: [],
  tasks: [],
  activeTask: null,
  playGame: null,
  playState: { status: 'idle', error: '', manifest: null },
  uploadedAssets: [],
  query: '',
  tag: '',
  selectedTemplate: 'fps'
};
let pollTimer = null;
let scrollDynamicsBound = false;

const iconPaths = {
  home: ['M3 10.5 12 3l9 7.5', 'M5 10v10h14V10', 'M9 20v-6h6v6'],
  create: ['M15 4V2', 'M15 16v-2', 'M8 9h2', 'M20 9h2', 'M17.8 6.2l1.4-1.4', 'M10.8 13.2l-1.4 1.4', 'M10.8 4.8 9.4 3.4', 'M17.8 11.8l1.4 1.4', 'M14.5 8.5 4 19l-1-1 10.5-10.5'],
  tasks: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3.5 6l1 1 2-2', 'M3.5 12l1 1 2-2', 'M3.5 18l1 1 2-2'],
  play: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M10 8.5v7l5.5-3.5L10 8.5Z'],
  docs: ['M6 2h8l4 4v16H6z', 'M14 2v5h5', 'M9 13h6', 'M9 17h6'],
  refresh: ['M20 7v5h-5', 'M4 17v-5h5', 'M18.2 9A7 7 0 0 0 6.1 6.8L4 12', 'M5.8 15A7 7 0 0 0 17.9 17.2L20 12'],
  expand: ['M15 3h6v6', 'M21 3l-7 7', 'M9 21H3v-6', 'M3 21l7-7'],
  search: ['M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z', 'M21 21l-4.3-4.3'],
  manifest: ['M7 3h7l4 4v14H7z', 'M14 3v5h5', 'M10 13h6', 'M10 17h4'],
  log: ['M4 4h16v16H4z', 'M8 9l3 3-3 3', 'M13 15h4'],
  publish: ['M12 16V4', 'M7 9l5-5 5 5', 'M5 20h14'],
  login: ['M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4', 'M10 17l5-5-5-5', 'M15 12H3'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  key: ['M21 2l-2 2', 'M15.5 7.5l2 2', 'M7 14a4 4 0 1 1 5.7-5.7L22 18v4h-4v-3h-3v-3h-3.3A4 4 0 0 1 7 14Z'],
  branch: ['M6 3v12', 'M18 9a3 3 0 1 0-3-3', 'M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M18 9c0 5-12 4-12 9'],
  upload: ['M12 15V3', 'M7 8l5-5 5 5', 'M4 21h16'],
  sparkles: ['M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z', 'M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z', 'M5 4l.7 1.8L7.5 6.5 5.7 7.2 5 9l-.7-1.8-1.8-.7 1.8-.7L5 4Z'],
  arrowLeft: ['M19 12H5', 'M12 19l-7-7 7-7']
};

function icon(name, label = '') {
  const paths = iconPaths[name] || iconPaths.sparkles;
  const attrs = label ? 'role="img" aria-label="' + esc(label) + '"' : 'aria-hidden="true"';
  return '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" ' + attrs + '><g>' + paths.map((d) => '<path d="' + d + '"></path>').join('') + '</g></svg>';
}

function buttonIcon(name, label) {
  return icon(name) + '<span>' + esc(label) + '</span>';
}
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const HERO_ASSET = '/assets/covers/hero-4k.png';
const COVER_ASSETS = {
  memory: '/assets/covers/memory.png',
  reaction: '/assets/covers/reaction.png',
  adventure: '/assets/covers/adventure.png',
  quiz: '/assets/covers/quiz.png',
  rhythm: '/assets/covers/rhythm.png',
  stealth: '/assets/covers/stealth.png',
  shooter: '/assets/covers/shooter.png',
  gravity: '/assets/covers/gravity.png'
};
const GAME_TYPE_CATALOG = [
  {
    id: 'fps',
    label: '小型 FPS',
    eyebrow: 'First-person trainer',
    desc: '轻量第一人称目标训练、移动靶、计时命中和清晰反馈，适合展示可扩展的动作生成方向。',
    title: '玉衡靶场：Opall FPS 原型',
    prompt: '创建一个小型 FPS 风格的 16:9 Canvas 目标训练游戏。玩家在现代东方靶场中移动准星，命中玉色目标，避开朱砂干扰，包含计时、分数、连击、胜利状态和重新开始反馈。整体要轻量、可试玩、适合面试评审。'
  },
  {
    id: 'adventure',
    label: '东方冒险',
    eyebrow: 'Premium platform',
    desc: '横版探索、玉桥、灯阵、机关和终点闸门，是当前可玩闭环的主展示类型。',
    title: '云岚渡桥：玉灯中继',
    prompt: '创建一个带现代东方美学的横版卷轴游戏。玩家穿过云岚庭院、玉桥和灯阵，收集玉灯能量，避开朱砂机关，并抵达最终闸门，拥有明确胜利状态。'
  },
  {
    id: 'puzzle',
    label: '机关解谜',
    eyebrow: 'Puzzle room',
    desc: '把路线选择、机关门和推理提示做成短局挑战，强调目标明确与反馈清楚。',
    title: '月相观星台：机关解谜',
    prompt: '设计一个现代东方机关解谜横版游戏。玩家在月相观星台中选择正确路径，点亮星盘机关，避开错误门和朱砂陷阱，完成后打开出口。'
  },
  {
    id: 'rhythm',
    label: '节奏动作',
    eyebrow: 'Rhythm action',
    desc: '节拍窗口、连击反馈和灯阵同步，适合展示更强的动效与反馈能力。',
    title: '霓虹乐谱：节奏灯阵',
    prompt: '制作一个节奏横版动作游戏。玩家跟随霓虹乐谱跳跃，在节拍窗口收集音符玉灯，保持连击，并在终点看到胜利反馈。'
  },
  {
    id: 'stealth',
    label: '潜行闯关',
    eyebrow: 'Stealth route',
    desc: '巡逻灯、暗影路径和警戒门，适合做策略路线与失败反馈。',
    title: '影幕长廊：潜行路线',
    prompt: '制作一个潜行横版游戏。玩家穿过影幕长廊，躲避巡逻灯、暗影机关和警戒门，在不被发现的情况下抵达出口。'
  },
  {
    id: 'shooter',
    label: '飞行射击',
    eyebrow: 'Arcade shooter',
    desc: '能量核心、弹幕躲避、星门目标，偏街机节奏和视觉冲击。',
    title: '星槎云海：飞行射击',
    prompt: '创建一个飞行射击横版游戏。星槎穿过云海弹幕，收集能量核心，躲避朱砂障碍，并冲入终点星门。'
  },
  {
    id: 'gravity',
    label: '重力平台',
    eyebrow: 'Gravity puzzle',
    desc: '重力切换、浮空平台和机关门，强调规则变化和可复玩性。',
    title: '浮空石阶：重力翻转',
    prompt: '设计一个重力翻转平台游戏。玩家在浮空石阶之间切换重力，躲开机关，收集能量，并解开终点闸门。'
  },
  {
    id: 'memory',
    label: '记忆挑战',
    eyebrow: 'Memory challenge',
    desc: '庭院路线和玉灯顺序记忆，节奏更平稳，适合轻量试玩。',
    title: '玉灯庭院：记忆回廊',
    prompt: '创建一个记忆主题横版挑战。玩家按照玉灯亮起顺序穿过庭院，避开错误机关，最终抵达出口。'
  },
  {
    id: 'reaction',
    label: '反应挑战',
    eyebrow: 'Reflex arena',
    desc: '倒计时、机关节奏、闪避窗口和快速反馈，适合短局高频试玩。',
    title: '朱砂机关阵：反应挑战',
    prompt: '制作一个反应横版游戏。玩家需要在倒计时结束前稳定朱砂机关阵，点亮玉灯并抵达终点闸门。'
  },
  {
    id: 'roguelite',
    label: '轻肉鸽',
    eyebrow: 'Roguelite run',
    desc: '随机路线、临时增益、风险选择和终点清算，适合展示生成系统的扩展性。',
    title: '流云试炼：轻肉鸽短局',
    prompt: '制作一个轻肉鸽短局游戏。玩家在三条云路中选择风险和增益，收集临时能力，避开机关，最终完成试炼。'
  },
  {
    id: 'tower',
    label: '塔防策略',
    eyebrow: 'Defense board',
    desc: '布置防线、波次压力和核心防守，适合偏策略的玩法生成。',
    title: '玉塔守阵：策略防线',
    prompt: '创建一个小型塔防策略游戏。玩家布置玉塔阻挡朱砂波次，保护庭院核心，并在有限回合内守住阵线。'
  },
  {
    id: 'card',
    label: '卡牌构筑',
    eyebrow: 'Deck builder',
    desc: '手牌选择、能量消耗和回合反馈，适合展示规则型游戏设计。',
    title: '墨契手牌：卡牌构筑',
    prompt: '设计一个轻量卡牌构筑游戏。玩家使用手牌消耗能量，触发玉色连携，抵御朱砂事件，并完成回合目标。'
  },
  {
    id: 'racing',
    label: '竞速漂移',
    eyebrow: 'Arcade racing',
    desc: '赛道、加速门、计时和漂移反馈，适合更运动化的短局体验。',
    title: '星桥竞速：弯道漂移',
    prompt: '制作一个俯视角竞速游戏。玩家沿星桥赛道漂移，穿过加速门，避开路障，并在限定时间内抵达终点。'
  },
  {
    id: 'survival',
    label: '生存采集',
    eyebrow: 'Survival loop',
    desc: '资源采集、危险区域、撤离倒计时和轻量循环，强调任务压力。',
    title: '雾岛撤离：生存采集',
    prompt: '创建一个小型生存采集游戏。玩家在雾岛收集资源，避开危险区域，修复信标，并在倒计时结束前撤离。'
  },
  {
    id: 'metroidvania',
    label: '探索解锁',
    eyebrow: 'Ability gates',
    desc: '能力门、区域回访和路线解锁，适合更复杂的关卡结构。',
    title: '玄门回廊：探索解锁',
    prompt: '制作一个类银河城探索原型。玩家获得新能力后打开能力门，回访区域，收集玉灯碎片并抵达玄门出口。'
  }
];

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
    '/intro': ['作者与项目入口', 'Opall / 黄澎涛 的 AI 原生游戏生成平台。'],
    '/home': ['游戏大厅', 'AI 生成的多类型 Canvas 游戏，从对象存储发布并运行。'],
    '/create': ['创作工坊', '设计、生成、检查并发布可玩的多类型游戏。'],
    '/tasks': ['智能体控制台', '查看模型设计、构建日志、产物持久化和发布状态。'],
    '/play': ['试玩运行时', '通过 manifest 加载的 16:9 沙盒对象运行时。'],
    '/docs': ['交付系统', '架构、运维、风险与验证证据。']
  };
  return map[state.route] || map['/intro'];
}

function renderAuth() {
  app.innerHTML = html`
    <div class="auth-wrap">
      <section class="auth-card">
        <div class="brand"><div class="brand-mark" aria-hidden="true">游</div><div><div class="brand-title">ForgePlay 智能体平台</div><div class="brand-sub">AI 原生游戏 MVP</div></div></div>
        <div><h1>登录后开始创作</h1><p class="muted">使用演示账号或注册新创作者。演示：<span class="kbd">creator@example.com</span> / <span class="kbd">password123</span></p></div>
        <div class="auth-tabs"><button id="loginTab" class="active">登录</button><button id="registerTab">注册</button></div>
        <form id="authForm" class="form-row">
          <div class="form-row" id="nameRow" style="display:none"><label>昵称</label><input class="input" name="name" value="新创作者"></div>
          <div class="form-row"><label>邮箱</label><input class="input" name="email" type="email" value="creator@example.com" required></div>
          <div class="form-row"><label>密码</label><input class="input" name="password" type="password" value="password123" required></div>
          <button class="primary icon-button" type="submit">${icon('login')}<span>继续</span></button>
        </form>
        <div class="form-grid">
          <button class="ghost icon-button" id="githubLogin">${icon('branch')}<span>GitHub 演示 OAuth</span></button>
          <button class="ghost icon-button" id="googleLogin">${icon('key')}<span>Google 演示 OAuth</span></button>
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
        <div class="brand"><div class="brand-mark" aria-hidden="true">游</div><div><div class="brand-title">ForgePlay</div><div class="brand-sub">智能体游戏平台</div></div></div>
        <nav class="nav">
          ${navButton('/home', 'home', '大厅')}
          ${navButton('/create', 'create', '创作')}
          ${navButton('/tasks', 'tasks', '任务')}
          ${navButton('/play', 'play', '试玩')}
          ${navButton('/docs', 'docs', '文档')}
        </nav>
        <div class="sidebar-foot">
          <div class="user-chip"><strong>${esc(state.user?.name || '访客')}</strong><span>${esc(state.user?.email || '匿名浏览')}</span></div>
          ${state.user ? `<button class="ghost icon-button" id="logoutBtn">${icon('logout')}<span>退出</span></button>` : `<button class="primary icon-button" id="showLogin">${icon('login')}<span>登录 / 注册</span></button>`}
        </div>
      </aside>
      <main class="main">
        <header class="topbar"><div><div class="page-title">${esc(title)}</div><div class="page-sub">${esc(sub)}</div></div><div class="actions"><button class="ghost icon-button" id="refreshBtn">${icon('refresh')}<span>刷新</span></button><button class="primary icon-button" id="quickCreate">${icon('create')}<span>创作</span></button></div></header>
        <section class="content">${content}</section>
      </main>
    </div>`;
}

function navButton(route, iconName, label) {
  return `<button data-nav="${route}" class="${state.route === route ? 'active' : ''}"><span class="icon">${icon(iconName)}</span><span>${label}</span></button>`;
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

function taskPipeline(task) {
  const steps = [
    ['intent-analysis', '意图解析'],
    ['model-design', '模型设计'],
    ['safety-screen', '安全筛查'],
    ['artifact-build', '产物构建'],
    ['persistence', '持久化'],
    ['ready-to-preview', '可预览']
  ];
  const currentIndex = Math.max(0, steps.findIndex(([step]) => step === task?.currentStep));
  return '<div class="runway" aria-label="智能体执行进度">' + steps.map(([step, label], index) => {
    const cls = index < currentIndex || task?.status === 'succeeded' ? 'done' : index === currentIndex ? 'active' : '';
    return '<span class="run-step ' + cls + '"><i></i>' + esc(label) + '</span>';
  }).join('') + '</div>';
}

function taskLivePanel(tasks) {
  if (!tasks.length) return '';
  const task = tasks[0];
  const percent = progressValue(task);
  return html`<section class="panel task-live">
    <div class="task-live-head"><span class="status-dot"></span><div><div class="eyebrow">智能体正在运行</div><h2>${esc(task.title)}</h2></div></div>
    <div class="task-live-meta"><span>${esc(statusLabel(task.status))}</span><span>${esc(stepLabel(task.currentStep))}</span><span>${percent}%</span><span>自动刷新中</span></div>
    <div class="progress"><span style="width:${percent}%"></span></div>
    ${taskPipeline(task)}
    <div class="agent-console-strip"><span>运行中</span><b>AI Agent 正在编排设计、构建 bundle、写入对象存储</b><em>Preview ready 后可直接试玩</em></div>
    <p class="summary">${esc(taskWaitCopy(task))}</p>
    <div class="actions"><button class="secondary icon-button" data-task="${esc(task.id)}">${icon('log')}<span>查看实时日志</span></button></div>
  </section>`;
}
function render() {
  clearInterval(pollTimer);
  pollTimer = null;
  if (state.route === '/intro') return renderIntro();
  if (!state.user && ['/create', '/tasks'].includes(state.route)) return renderAuth();
  if (state.route === '/home') return renderShell(homeView());
  if (state.route === '/create') return renderShell(createView());
  if (state.route === '/tasks') return renderShell(tasksView());
  if (state.route === '/play') return renderShell(playView());
  if (state.route === '/docs') return renderShell(docsView());
  return renderShell(homeView());
}

function renderIntro() {
  app.innerHTML = introView();
}

function introView() {
  const featured = state.games[0];
  return html`
    <main class="intro-page">
      <section class="intro-hero reveal-on-scroll">
        <div class="intro-copy">
          <div class="intro-kicker"><span></span> AI Native Game Platform</div>
          <h1>Opall</h1>
          <h2>黄澎涛 · 智能体游戏生成作品</h2>
          <p>一个面向面试展示的 AI 原生游戏平台：从创意提示、Agent 任务编排、对象存储、manifest 合约，到可试玩的沙盒 Canvas 游戏。视觉方向以浅色 Apple 式留白、东方玉色材质和 Steam 式游戏陈列结合。</p>
          <div class="intro-actions">
            <button class="primary icon-button" data-nav="/home">${icon('play')}<span>进入游戏大厅</span></button>
            <button class="secondary icon-button" data-nav="/create">${icon('sparkles')}<span>创建游戏</span></button>
            ${featured ? `<button class="ghost icon-button" data-play="${esc(featured.id)}">${icon('play')}<span>直接试玩</span></button>` : ''}
          </div>
          <div class="intro-proof">
            <span>GitHub portfolio</span>
            <span>Agent workflow</span>
            <span>Playable runtime</span>
            <span>Interview package</span>
          </div>
        </div>
        <div class="intro-visual" aria-hidden="true">
          <div class="device-shell">
            <div class="device-top"><span></span><span></span><span></span></div>
            <div class="device-scene">
              <div class="scene-title">ForgePlay Hall</div>
              <div class="scene-row">
                <i></i><i></i><i></i><i></i>
              </div>
              <div class="scene-stage">
                <b></b><b></b><b></b><b></b>
              </div>
            </div>
          </div>
          <div class="floating-ticket ticket-a"><strong>15</strong><span>Game types</span></div>
          <div class="floating-ticket ticket-b"><strong>16:9</strong><span>Sandbox play</span></div>
        </div>
      </section>
      <section class="intro-author reveal-on-scroll">
        <div>
          <div class="eyebrow">Creator</div>
          <h2>Opall · 黄澎涛</h2>
          <p class="summary">关注 AI Agent、工程化交付和可演示产品体验。这个项目不是静态页面，而是可登录、可创建、可审计、可发布、可试玩的完整闭环。</p>
        </div>
        <div class="author-grid">
          <div><strong>Agent 后端</strong><span>任务生命周期、日志、模型适配、对象存储。</span></div>
          <div><strong>前端体验</strong><span>浅色高级感、动态滚动、游戏类型陈列。</span></div>
          <div><strong>游戏运行时</strong><span>manifest 加载、iframe 沙盒、Canvas 可试玩。</span></div>
        </div>
      </section>
    </main>`;
}

function homeView() {
  const tags = [...new Set(state.games.flatMap((game) => game.tags || []))].sort();
  const featured = state.games[0];
  const highlighted = state.games.slice(0, 4);
  const selected = currentGameTemplate();
  const heroCover = HERO_ASSET;
  const heroStyle = heroCover ? `--hero-cover:url('${heroCover}')` : '';
  return html`
    <section class="hero" style="${heroStyle}">
      <div class="hero-inner">
        <div>
          <div class="eyebrow">ForgePlay Studio · AI 原生游戏生成控制台</div>
          <h1>把游戏想法锻造成可试玩作品</h1>
          <p class="hero-copy">从创意提示、模型设计、对象存储到 iframe 沙盒运行时，ForgePlay 用一条可审计的 Agent 流水线生成、发布并验证 16:9 多类型 Canvas 游戏。界面以留白、层次、材质和清晰反馈为核心，开箱即可演示完整闭环。</p>
          <div class="actions"><button class="primary icon-button" data-nav="/create">${icon('create')}<span>创建游戏</span></button>${featured ? `<button class="secondary icon-button" data-play="${esc(featured.id)}">${icon('play')}<span>试玩精选</span></button>` : ''}<button class="ghost icon-button" data-nav="/docs">${icon('docs')}<span>查看架构</span></button></div>
        </div>
        <aside class="hero-panel">
          <div class="eyebrow">运行时证据</div>
          <div class="status-grid">
            <div class="status-cell"><strong>${state.games.length}</strong><span>已发布游戏</span></div>
            <div class="status-cell"><strong>${GAME_TYPE_CATALOG.length}</strong><span>游戏类型</span></div>
            <div class="status-cell"><strong>16:9</strong><span>沙盒运行</span></div>
          </div>
          <div class="hero-proof"><span>Pipeline</span><b>Prompt</b><i></i><b>Agent design</b><i></i><b>HTML bundle</b><i></i><b>Manifest / Play iframe</b></div>
          <p class="summary">试玩时会拉取 manifest，挂载 <span class="kbd">/objects/.../bundle.html</span>，并把生成代码隔离在 iframe 沙盒中。</p>
          <div class="hero-signal"><span></span><b>本地审计、截图、视频和交付 ZIP 均可复现</b></div>
        </aside>
      </div>
    </section>
    <section class="hub-spotlight reveal-on-scroll">
      <div class="spotlight-copy">
        <div class="eyebrow">One-page showcase</div>
        <h2>从类型选择到可玩验证，集中在这一页</h2>
        <p class="summary">这里像 Steam 一样先浏览游戏类型和精选作品，再像 Apple 产品页一样清晰展示创作路径、运行证据和试玩入口。独立的创作、任务、试玩路由仍保留，用于深度操作和测试。</p>
      </div>
      <div class="spotlight-grid">
        <div><strong>${GAME_TYPE_CATALOG.length}</strong><span>设计方向</span></div>
        <div><strong>${state.games.length}</strong><span>可试玩作品</span></div>
        <div><strong>FPS+</strong><span>不局限横版</span></div>
        <div><strong>CDP</strong><span>可自动验收</span></div>
      </div>
    </section>
    <section class="type-section reveal-on-scroll">
      <div class="library-head"><div><div class="eyebrow">Steam-inspired browse</div><h2>15 类游戏类型橱窗</h2></div><p class="summary">可从小型 FPS、横版冒险、机关解谜、节奏、潜行、飞行射击、重力平台、轻肉鸽、塔防、卡牌、竞速、生存采集和探索解锁等方向中选择，作为后续 Agent 生成模板。</p></div>
      <div class="type-strip">${GAME_TYPE_CATALOG.map((item) => gameTypeCard(item)).join('')}</div>
    </section>
    <section class="quick-lab panel reveal-on-scroll">
      <div>
        <div class="eyebrow">Creation setup</div>
        <h2>当前创作方向：${esc(selected.label)}</h2>
        <p class="summary">${esc(selected.desc)}</p>
        <div class="prompt-preview"><strong>${esc(selected.title)}</strong><span>${esc(selected.prompt)}</span></div>
      </div>
      <div class="quick-lab-actions">
        <button class="primary icon-button" data-nav="/create">${icon('sparkles')}<span>打开创作设置</span></button>
        <button class="secondary icon-button" data-nav="/tasks">${icon('tasks')}<span>查看生成任务</span></button>
        ${featured ? `<button class="ghost icon-button" data-play="${esc(featured.id)}">${icon('play')}<span>先试玩现有作品</span></button>` : ''}
      </div>
    </section>
    ${highlighted.length ? `<section class="featured-row reveal-on-scroll"><div class="library-head"><div><div class="eyebrow">Featured playable builds</div><h2>精选可玩作品</h2></div><p class="summary">像 Steam 首页一样先给出精选陈列；每张卡片都能直接进入 manifest 和 Play 验证。</p></div><div class="featured-stack">${highlighted.map(gameCard).join('')}</div></section>` : ''}
    <div class="toolbar">
      <div class="searchbar"><input class="input" id="searchInput" placeholder="搜索游戏、类型、标签" value="${esc(state.query)}"><button class="secondary icon-button" id="searchBtn">${icon('search')}<span>搜索</span></button></div>
      <select id="tagFilter" style="max-width:220px"><option value="">全部标签</option>${tags.map((tag) => `<option ${state.tag === tag ? 'selected' : ''} value="${esc(tag)}">${esc(tag)}</option>`).join('')}</select>
    </div>
    <section class="library-head"><div><div class="eyebrow">Playable Library</div><h2>可试玩游戏矩阵</h2></div><p class="summary">预生产 15 个网站生成风格游戏，覆盖 FPS、动作、解谜、策略、竞速、生存和探索等方向，卡片直接进入 Manifest 与 Play 验证。</p></section>
    ${state.games.length ? `<div class="rail game-library">${state.games.map(gameCard).join('')}</div>` : '<div class="empty">当前筛选下没有已发布游戏。</div>'}`;
}

function currentGameTemplate() {
  return GAME_TYPE_CATALOG.find((item) => item.id === state.selectedTemplate) || GAME_TYPE_CATALOG[0];
}

function gameTypeCard(item, goCreate = false) {
  const active = item.id === state.selectedTemplate ? ' active' : '';
  return html`<article class="type-card${active}" data-template-card="${esc(item.id)}">
    <div><span>${esc(item.eyebrow)}</span><h3>${esc(item.label)}</h3><p>${esc(item.desc)}</p></div>
    <button type="button" class="ghost icon-button" data-template="${esc(item.id)}" ${goCreate ? 'data-go-create="true"' : ''}>${icon('sparkles')}<span>${goCreate ? '用此类型创作' : '选择'}</span></button>
  </article>`;
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
      <div class="card-proof"><span>${esc(genreLabel(game))}</span><span>Manifest ready</span><span>iframe sandbox</span></div>
      <div class="tags">${(game.tags || []).map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')}</div>
      <div class="metrics"><div class="metric"><strong>${game.playCount}</strong><span>试玩</span></div><div class="metric"><strong>${game.likeCount}</strong><span>喜欢</span></div><div class="metric"><strong>${game.favoriteCount}</strong><span>收藏</span></div></div>
      <div class="actions"><button class="primary icon-button" data-play="${esc(game.id)}">${icon('play')}<span>试玩</span></button><button class="ghost icon-button" data-detail="${esc(game.id)}">${icon('manifest')}<span>Manifest</span></button></div>
    </div>
  </article>`;
}

function genreLabel(game) {
  const haystack = [game.title, game.summary, ...(game.tags || [])].join(' ').toLowerCase();
  if (haystack.includes('rhythm') || haystack.includes('节奏') || haystack.includes('音乐')) return 'Rhythm';
  if (haystack.includes('stealth') || haystack.includes('潜行') || haystack.includes('暗影')) return 'Stealth';
  if (haystack.includes('shooter') || haystack.includes('飞行') || haystack.includes('射击')) return 'Shooter';
  if (haystack.includes('gravity') || haystack.includes('重力')) return 'Gravity';
  if (haystack.includes('fps') || haystack.includes('靶场') || haystack.includes('目标训练')) return 'FPS';
  if (haystack.includes('roguelite') || haystack.includes('肉鸽') || haystack.includes('试炼')) return 'Roguelite';
  if (haystack.includes('tower') || haystack.includes('塔防') || haystack.includes('防线')) return 'Tower';
  if (haystack.includes('card') || haystack.includes('卡牌') || haystack.includes('手牌')) return 'Card';
  if (haystack.includes('racing') || haystack.includes('竞速') || haystack.includes('漂移')) return 'Racing';
  if (haystack.includes('survival') || haystack.includes('生存') || haystack.includes('采集')) return 'Survival';
  if (haystack.includes('metroidvania') || haystack.includes('探索解锁') || haystack.includes('能力门')) return 'Exploration';
  if (haystack.includes('memory') || haystack.includes('记忆')) return 'Memory';
  if (haystack.includes('reaction') || haystack.includes('反应')) return 'Reaction';
  if (haystack.includes('quiz') || haystack.includes('谜题') || haystack.includes('问答')) return 'Puzzle';
  return 'Adventure';
}

function coverAssetFor(game) {
  const haystack = [game.title, game.summary, ...(game.tags || [])].join(' ').toLowerCase();
  if (haystack.includes('rhythm') || haystack.includes('music') || haystack.includes('beat') || haystack.includes('节奏') || haystack.includes('音乐') || haystack.includes('连击') || haystack.includes('乐谱')) return COVER_ASSETS.rhythm;
  if (haystack.includes('stealth') || haystack.includes('shadow') || haystack.includes('sneak') || haystack.includes('潜行') || haystack.includes('影') || haystack.includes('巡逻') || haystack.includes('警戒')) return COVER_ASSETS.stealth;
  if (haystack.includes('shooter') || haystack.includes('flight') || haystack.includes('bullet') || haystack.includes('shoot') || haystack.includes('射击') || haystack.includes('飞行') || haystack.includes('弹幕') || haystack.includes('星槎')) return COVER_ASSETS.shooter;
  if (haystack.includes('gravity') || haystack.includes('flip') || haystack.includes('重力') || haystack.includes('翻转') || haystack.includes('浮空')) return COVER_ASSETS.gravity;
  if (haystack.includes('fps') || haystack.includes('靶场') || haystack.includes('目标训练') || haystack.includes('准星')) return COVER_ASSETS.reaction;
  if (haystack.includes('roguelite') || haystack.includes('肉鸽') || haystack.includes('试炼') || haystack.includes('路线选择')) return COVER_ASSETS.adventure;
  if (haystack.includes('tower') || haystack.includes('塔防') || haystack.includes('防线') || haystack.includes('玉塔')) return COVER_ASSETS.gravity;
  if (haystack.includes('card') || haystack.includes('卡牌') || haystack.includes('手牌') || haystack.includes('构筑')) return COVER_ASSETS.memory;
  if (haystack.includes('racing') || haystack.includes('竞速') || haystack.includes('漂移') || haystack.includes('赛道')) return COVER_ASSETS.shooter;
  if (haystack.includes('survival') || haystack.includes('生存') || haystack.includes('采集') || haystack.includes('撤离')) return COVER_ASSETS.stealth;
  if (haystack.includes('metroidvania') || haystack.includes('探索解锁') || haystack.includes('能力门') || haystack.includes('回廊')) return COVER_ASSETS.quiz;
  if (haystack.includes('reaction') || haystack.includes('cinnabar') || haystack.includes('反应') || haystack.includes('朱砂') || haystack.includes('机关')) return COVER_ASSETS.reaction;
  if (haystack.includes('memory') || haystack.includes('jade') || haystack.includes('courtyard') || haystack.includes('记忆') || haystack.includes('玉灯') || haystack.includes('庭院')) return COVER_ASSETS.memory;
  if (haystack.includes('quiz') || haystack.includes('trivia') || haystack.includes('moon') || haystack.includes('问答') || haystack.includes('谜题') || haystack.includes('观星')) return COVER_ASSETS.quiz;
  if (haystack.includes('adventure') || haystack.includes('archive') || haystack.includes('cloud') || haystack.includes('agent') || haystack.includes('冒险') || haystack.includes('档案') || haystack.includes('云岚') || haystack.includes('智能体')) return COVER_ASSETS.adventure;
  return '';
}

function createView() {
  const selected = currentGameTemplate();
  return html`
    <div class="studio">
      <section class="panel studio-form-panel">
        <div class="eyebrow">AI 创作流水线</div>
        <h2>创作工坊</h2>
        <div class="template-picker">
          ${GAME_TYPE_CATALOG.map((item) => `<button type="button" class="${item.id === selected.id ? 'active' : ''}" data-template="${esc(item.id)}"><strong>${esc(item.label)}</strong><span>${esc(item.eyebrow)}</span></button>`).join('')}
        </div>
        <form id="createForm" class="form-row">
          <div class="form-row"><label>游戏标题提示</label><input class="input" name="title" value="${esc(selected.title)}"></div>
          <div class="form-row"><label>创意提示词</label><textarea name="prompt">${esc(selected.prompt)}</textarea><div class="hint">配置 fighting API 变量后，智能体会请求模型设计 JSON，再构建沙盒 Canvas 产物。当前方向可覆盖小型 FPS、横版、解谜、节奏、潜行、飞行射击等类型。</div></div>
          <div class="form-row"><label>参考素材</label><input class="input" id="assetInput" type="file" multiple accept="image/*,video/*,.txt,.json,.pdf"><div class="hint">文件会带 sha256 元数据保存为对象 key，并关联到生成任务。</div></div>
          <div id="assetList" class="tags">${state.uploadedAssets.map((asset) => `<span class="tag">${esc(asset.filename)}</span>`).join('')}</div>
          <button class="primary icon-button" type="submit">${icon('sparkles')}<span>生成${esc(selected.label)}游戏</span></button>
        </form>
        <div id="createMsg"></div>
      </section>
      <section class="panel studio-preview">
        <div style="position:relative;z-index:1">
          <div class="eyebrow">可玩产物目标</div>
          <h2>${esc(selected.label)} · 16:9 Canvas 运行时</h2>
          <p class="summary">${esc(selected.desc)} 生成产物包含键盘/鼠标交互、分数、计时、重开、胜利/失败反馈，以及沙盒安全渲染。</p>
          <div class="tags"><span class="tag">manifest 驱动</span><span class="tag">对象存储</span><span class="tag">iframe 沙盒</span><span class="tag">模型设计日志</span><span class="tag">多类型 Canvas</span></div>
        </div>
        <div class="mock-stage ${esc(selected.id)}"><span class="reticle"></span><span class="mock-player"></span><span class="mock-hud">Score 1200 · Combo 8</span></div>
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
      <td>${task.gameId ? `<button class="ghost icon-button" data-play="${esc(task.gameId)}">${icon('play')}<span>预览试玩</span></button> ${task.gameStatus === 'published' ? '<span class="status published">已发布</span>' : `<button class="secondary icon-button" data-publish="${esc(task.gameId)}">${icon('publish')}<span>发布并试玩</span></button>`}` : '<span class="hint">等待产物</span>'}</td>
      <td><button class="ghost icon-button" data-task="${esc(task.id)}">${icon('log')}<span>日志</span></button></td>
    </tr>`;
  }).join('');
  return html`${taskLivePanel(liveTasks)}<section class="panel"><h2>任务历史</h2>${state.tasks.length ? `<table class="table"><thead><tr><th>任务</th><th>状态</th><th>步骤</th><th>产物</th><th>检查</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">还没有任务。创建一个游戏后可查看智能体日志。</div>'}</section>${state.activeTask ? taskDetail(state.activeTask) : ''}`;
}

function taskDetail(task) {
  const percent = progressValue(task);
  const actions = task.gameId ? `<div class="actions"><button class="primary icon-button" data-play="${esc(task.gameId)}">${icon('play')}<span>预览试玩</span></button>${task.gameStatus === 'published' ? '<span class="status published">已发布</span>' : `<button class="secondary icon-button" data-publish="${esc(task.gameId)}">${icon('publish')}<span>发布并试玩</span></button>`}</div>` : '';
  return html`<section class="panel task-detail"><div class="task-detail-head"><div><div class="eyebrow">实时执行日志</div><h2>智能体执行日志</h2></div><span class="status ${esc(task.status)}">${esc(statusLabel(task.status))}</span></div><div class="task-live-meta"><span>${esc(stepLabel(task.currentStep))}</span><span>${percent}%</span><span>${['pending', 'running'].includes(task.status) ? '自动刷新中' : '已停止刷新'}</span></div><div class="progress"><span style="width:${percent}%"></span></div><p class="summary">${esc(taskWaitCopy(task))}</p>${actions}<p class="summary">${esc(task.prompt)}</p><div class="log-list">${(task.logs || []).map((log) => `<div class="log-item"><div class="log-head"><span>${esc(log.level)} · ${esc(stepLabel(log.step))}</span><span>${fmtDate(log.createdAt)}</span></div><div>${esc(log.message)}</div></div>`).join('')}</div></section>`;
}

function playView() {
  const game = state.playGame || state.games[0];
  return html`<div class="play-layout">
    <section class="panel"><div class="toolbar"><div><div class="eyebrow">沙盒对象运行时</div><h2>${esc(game?.title || '选择一个游戏')}</h2><div class="hint">${game ? `Manifest：${esc(game.manifestUrl || '通过 API 加载')}` : '请从游戏大厅选择一个已发布游戏。'}</div></div><div class="actions"><button class="ghost icon-button" id="backHome">${icon('arrowLeft')}<span>游戏大厅</span></button>${game ? `<button class="secondary icon-button" data-play="${esc(game.id)}">${icon('refresh')}<span>重新加载</span></button>` : ''}</div></div></section>
    <section class="play-frame-wrap" id="playWrap">${playFrameContent()}</section>
  </div>`;
}

function playFrameContent() {
  if (state.playState.status === 'loading') return '<div class="loader premium-loader"><div class="loader-mark"></div><h2>正在加载高清试玩运行时</h2><p>正在获取 manifest、校验对象存储入口，并挂载沙盒 iframe。资源就绪后会自动呈现可试玩游戏。</p></div>';
  if (state.playState.status === 'failed') return `<div class="loader"><h2>加载失败</h2><p>${esc(state.playState.error)}</p></div>`;
  if (state.playState.status === 'loaded' && state.playState.manifest) {
    const demoAutoplay = new URLSearchParams(location.search).get('demo') === 'autoplay' || location.hash.includes('demo=autoplay');
    const src = esc(state.playState.manifest.entry + (demoAutoplay ? '#autoplay' : ''));
    return `<div class="play-status-strip"><span>Manifest verified</span><b>高清 Canvas 已挂载</b><em>点击画面后按游戏内提示试玩，R 重开</em><button class="ghost icon-button fullscreen-play" id="fullscreenPlay" type="button">${icon('expand')}<span>全屏试玩</span></button></div><iframe class="play-frame" title="游戏运行时" sandbox="allow-scripts" allow="fullscreen" allowfullscreen referrerpolicy="no-referrer" src="${src}"></iframe>`;
  }
  return '<div class="loader"><h2>准备加载</h2><p>正在等待选择游戏；进入试玩页时会自动加载第一个已发布游戏。</p></div>';
}

function preferredPlayGameId() {
  if (state.activeTask?.gameId) return state.activeTask.gameId;
  const latestTaskGame = state.tasks.find((task) => task.gameId)?.gameId;
  if (latestTaskGame) return latestTaskGame;
  return state.games[0]?.id || '';
}

async function enterPlayFullscreen() {
  const wrap = document.querySelector('#playWrap');
  if (!wrap) return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (wrap.requestFullscreen) await wrap.requestFullscreen();
  } catch (error) {
    alert('当前浏览器阻止了全屏请求，请点击试玩区域后再试。');
  }
}

function docsView() {
  return html`<section class="panel"><div class="eyebrow">工程交付</div><h2>提交边界</h2><p class="summary">运行时状态保留在项目文件夹内：SQLite 位于 <span class="kbd">data/</span>，对象产物位于 <span class="kbd">storage/objects</span>，交付证据位于 <span class="kbd">docs/</span>。默认演示不需要 Docker 或全局安装。</p></section>
  <section class="panel"><h2>评审清单</h2><table class="table"><tbody>
    <tr><th>产品</th><td>游戏大厅、创作工坊、智能体控制台和试玩运行时组成完整产品工作流。</td></tr>
    <tr><th>游戏运行时</th><td>生成 bundle 是可玩的 16:9 多类型 Canvas 游戏，并通过 manifest 从对象存储加载。</td></tr>
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
  document.querySelectorAll('[data-template]').forEach((btn) => btn.addEventListener('click', () => selectTemplate(btn.dataset.template, btn.dataset.goCreate === 'true')));
  document.querySelectorAll('[data-publish]').forEach((btn) => btn.addEventListener('click', () => publish(btn.dataset.publish)));
  document.querySelectorAll('[data-task]').forEach((btn) => btn.addEventListener('click', () => openTask(btn.dataset.task)));
  document.querySelectorAll('[data-detail]').forEach((btn) => btn.addEventListener('click', () => showManifest(btn.dataset.detail)));
  document.querySelector('#backHome')?.addEventListener('click', () => navigate('/home'));
  document.querySelector('#fullscreenPlay')?.addEventListener('click', enterPlayFullscreen);
  wireAuth();
  wireCreate();
  bindMotion();
  bindScrollDynamics();
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

function selectTemplate(templateId, goCreate = false) {
  if (GAME_TYPE_CATALOG.some((item) => item.id === templateId)) state.selectedTemplate = templateId;
  if (goCreate) navigate('/create');
  else {
    render();
    afterRender();
  }
}

function bindMotion() {
  document.querySelectorAll('.card,.panel,.hero,.hero-panel,.auth-card,.play-frame-wrap').forEach((el, index) => {
    el.style.setProperty('--stagger', `${Math.min(index, 8) * 34}ms`);
    if (el.dataset.motionBound) return;
    el.dataset.motionBound = '1';
    el.addEventListener('pointermove', (event) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${Math.round(event.clientX - rect.left)}px`);
      el.style.setProperty('--my', `${Math.round(event.clientY - rect.top)}px`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.removeProperty('--mx');
      el.style.removeProperty('--my');
    });
  });
}

function bindScrollDynamics() {
  const update = () => {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.style.setProperty('--scroll-y', `${Math.min(1, y / 900).toFixed(3)}`);
    document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
      const rect = el.getBoundingClientRect();
      const visible = rect.top < window.innerHeight * 0.86 && rect.bottom > window.innerHeight * 0.08;
      el.classList.toggle('is-visible', visible);
      const progress = Math.max(-1, Math.min(1, (window.innerHeight * 0.5 - rect.top) / window.innerHeight));
      el.style.setProperty('--section-shift', `${Math.round(progress * 18)}px`);
    });
  };
  update();
  if (scrollDynamicsBound) return;
  scrollDynamicsBound = true;
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
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
    if (submit) { submit.disabled = true; submit.innerHTML = icon('sparkles') + '<span>正在提交任务</span>'; }
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
      if (submit) { submit.disabled = false; submit.innerHTML = icon('sparkles') + '<span>生成' + esc(currentGameTemplate().label) + '游戏</span>'; }
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

window.addEventListener('hashchange', () => { state.route = location.hash.replace('#', '') || '/intro'; render(); afterRender(); });
bootstrap();

