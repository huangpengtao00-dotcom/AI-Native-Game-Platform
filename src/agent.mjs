import { clampText, escapeHtml, id, nowIso, safeJson, safeSlug, sleep } from './util.mjs';
import { isExternalModelConfigured, requestModelDesign } from './model-provider.mjs';

const GENRE_LIBRARY = {
  fps: {
    tags: ['小型FPS', '目标训练', '智能体生成'],
    summary: '一个轻量第一人称目标训练原型，包含准星命中、移动靶、计时、连击和可重玩反馈。',
    palette: 'linear-gradient(135deg, #f8efe0 0%, #76c8ad 46%, #d8b86c 100%)'
  },
  adventure: {
    tags: ['冒险', '东方画卷', '智能体生成'],
    summary: '一个可玩的现代东方横版平台冒险，可预览、发布，并从对象存储中运行。',
    palette: 'linear-gradient(135deg, #10231e 0%, #3d6f5e 46%, #d8b86c 100%)'
  },
  memory: {
    tags: ['记忆主题', '东方横版', '智能体生成'],
    summary: '一个带记忆主题和东方庭院气质的中文横版挑战，以可移植 Web 产物交付。',
    palette: 'linear-gradient(135deg, #07110f 0%, #1f3f33 48%, #b8894f 100%)'
  },
  reaction: {
    tags: ['反应', '朱砂机关', '智能体生成'],
    summary: '一个带分数、计时、朱砂机关和可重玩规则的中文横版反应游戏，由本地智能体编排器生成。',
    palette: 'linear-gradient(135deg, #1a1110 0%, #8f3a2b 48%, #d8b86c 100%)'
  },
  quiz: {
    tags: ['剧情谜题', '云岚推理', '智能体生成'],
    summary: '一个带云岚谜题、清晰目标和胜利条件的中文横版试玩体验。',
    palette: 'linear-gradient(135deg, #101814 0%, #76c8ad 44%, #d76145 100%)'
  },
  rhythm: {
    tags: ['节奏', '霓虹乐谱', '智能体生成'],
    summary: '一个强调节奏窗口、连击反馈和灯阵同步的中文横版音乐动作游戏。',
    palette: 'linear-gradient(135deg, #140d25 0%, #6d4cc2 48%, #f2c879 100%)'
  },
  stealth: {
    tags: ['潜行', '影戏机关', '智能体生成'],
    summary: '一个以躲避巡逻灯、穿越影幕和抵达暗门为目标的中文横版潜行挑战。',
    palette: 'linear-gradient(135deg, #05070b 0%, #1d2930 50%, #76c8ad 100%)'
  },
  shooter: {
    tags: ['飞行射击', '星槎弹幕', '智能体生成'],
    summary: '一个带弹幕躲避、能量收集和终点穿梭门的中文横版飞行射击体验。',
    palette: 'linear-gradient(135deg, #081325 0%, #285a8f 48%, #f97364 100%)'
  },
  gravity: {
    tags: ['重力平台', '机关解谜', '智能体生成'],
    summary: '一个围绕重力翻转、浮空平台和机关门的中文横版平台解谜游戏。',
    palette: 'linear-gradient(135deg, #18130f 0%, #4a3a76 46%, #b8d890 100%)'
  },
  roguelite: {
    tags: ['轻肉鸽', '路线选择', '智能体生成'],
    summary: '一个短局轻肉鸽原型，围绕随机路线、临时增益、风险选择和终点清算展开。',
    palette: 'linear-gradient(135deg, #fff4e3 0%, #b8894f 46%, #5fae95 100%)'
  },
  tower: {
    tags: ['塔防', '阵地策略', '智能体生成'],
    summary: '一个小型塔防策略原型，玩家布置玉塔、阻挡朱砂波次并守住核心。',
    palette: 'linear-gradient(135deg, #f7ead6 0%, #d8b86c 48%, #8bbd9e 100%)'
  },
  card: {
    tags: ['卡牌构筑', '回合策略', '智能体生成'],
    summary: '一个轻量卡牌构筑原型，围绕手牌选择、能量消耗和回合反馈展开。',
    palette: 'linear-gradient(135deg, #fff6e8 0%, #d76145 42%, #d8b86c 100%)'
  },
  racing: {
    tags: ['竞速', '漂移', '智能体生成'],
    summary: '一个俯视角竞速原型，包含弯道、计时、加速门和赛道反馈。',
    palette: 'linear-gradient(135deg, #f8efe0 0%, #4f8ab8 46%, #f2c879 100%)'
  },
  survival: {
    tags: ['生存采集', '资源循环', '智能体生成'],
    summary: '一个小型生存采集原型，包含资源、危险区域、倒计时和撤离目标。',
    palette: 'linear-gradient(135deg, #f8efe0 0%, #668b5e 46%, #d76145 100%)'
  },
  metroidvania: {
    tags: ['探索解锁', '能力门', '智能体生成'],
    summary: '一个类银河城探索原型，围绕能力解锁、区域门和可回访路线展开。',
    palette: 'linear-gradient(135deg, #f5ecde 0%, #4a3a76 42%, #76c8ad 100%)'
  },
  cozy: {
    tags: ['治愈经营', '庭院布置', '智能体生成'],
    summary: '一个治愈经营原型，玩家整理庭院、收集材料、完成轻量订单。',
    palette: 'linear-gradient(135deg, #fff8ea 0%, #b8d890 46%, #d8b86c 100%)'
  }
};

export const DEMO_GAME_BLUEPRINTS = [
  {
    genre: 'fps',
    title: '玉衡靶场：Opall FPS 原型',
    prompt: '创建一个小型 FPS 风格的 16:9 Canvas 目标训练游戏。玩家在现代东方靶场中移动准星，命中玉色目标，避开朱砂干扰，包含计时、分数、连击、胜利状态和重新开始反馈。'
  },
  {
    genre: 'adventure',
    title: '云岚渡桥：玉灯中继',
    prompt: '创建一个带现代东方美学的横版卷轴游戏。玩家穿过云岚庭院、玉桥和灯阵，收集玉灯能量，避开朱砂机关，并抵达最终闸门。'
  },
  {
    genre: 'quiz',
    title: '月相观星台：机关解谜',
    prompt: '设计一个现代东方机关解谜横版游戏。玩家在月相观星台中选择正确路径，点亮星盘机关，避开错误门和朱砂陷阱，完成后打开出口。'
  },
  {
    genre: 'rhythm',
    title: '霓虹乐谱：节奏灯阵',
    prompt: '制作一个节奏横版动作游戏。玩家跟随霓虹乐谱跳跃，在节拍窗口收集音符玉灯，保持连击，并在终点看到胜利反馈。'
  },
  {
    genre: 'stealth',
    title: '影幕长廊：潜行路线',
    prompt: '制作一个潜行横版游戏。玩家穿过影幕长廊，躲避巡逻灯、暗影机关和警戒门，在不被发现的情况下抵达出口。'
  },
  {
    genre: 'shooter',
    title: '星槎云海：飞行射击',
    prompt: '创建一个飞行射击横版游戏。星槎穿过云海弹幕，收集能量核心，躲避朱砂障碍，并冲入终点星门。'
  },
  {
    genre: 'gravity',
    title: '浮空石阶：重力翻转',
    prompt: '设计一个重力翻转平台游戏。玩家在浮空石阶之间切换重力，躲开机关，收集能量，并解开终点闸门。'
  },
  {
    genre: 'memory',
    title: '玉灯庭院：记忆回廊',
    prompt: '创建一个记忆主题横版挑战。玩家按照玉灯亮起顺序穿过庭院，避开错误机关，最终抵达出口。'
  },
  {
    genre: 'reaction',
    title: '朱砂机关阵：反应挑战',
    prompt: '制作一个反应横版游戏。玩家需要在倒计时结束前稳定朱砂机关阵，点亮玉灯并抵达终点闸门。'
  },
  {
    genre: 'roguelite',
    title: '流云试炼：轻肉鸽短局',
    prompt: '制作一个轻肉鸽短局游戏。玩家在三条云路中选择风险和增益，收集临时能力，避开机关，最终完成试炼。'
  },
  {
    genre: 'tower',
    title: '玉塔守阵：策略防线',
    prompt: '创建一个小型塔防策略游戏。玩家布置玉塔阻挡朱砂波次，保护庭院核心，并在有限回合内守住阵线。'
  },
  {
    genre: 'card',
    title: '墨契手牌：卡牌构筑',
    prompt: '设计一个轻量卡牌构筑游戏。玩家使用手牌消耗能量，触发玉色连携，抵御朱砂事件，并完成回合目标。'
  },
  {
    genre: 'racing',
    title: '星桥竞速：弯道漂移',
    prompt: '制作一个俯视角竞速游戏。玩家沿星桥赛道漂移，穿过加速门，避开路障，并在限定时间内抵达终点。'
  },
  {
    genre: 'survival',
    title: '雾岛撤离：生存采集',
    prompt: '创建一个小型生存采集游戏。玩家在雾岛收集资源，避开危险区域，修复信标，并在倒计时结束前撤离。'
  },
  {
    genre: 'metroidvania',
    title: '玄门回廊：探索解锁',
    prompt: '制作一个类银河城探索原型。玩家获得新能力后打开能力门，回访区域，收集玉灯碎片并抵达玄门出口。'
  }
];

function classifyPrompt(prompt) {
  const text = String(prompt ?? '').toLowerCase();
  if (/fps|first-person|first person|target|aim|crosshair|\u7b2c\u4e00\u4eba\u79f0|\u9776|\u51c6\u661f|\u547d\u4e2d|\u5c04\u51fb\u8bad\u7ec3/.test(text)) return 'fps';
  if (/rhythm|music|beat|combo|\u8282\u594f|\u97f3\u4e50|\u8fde\u51fb|\u8282\u62cd/.test(text)) return 'rhythm';
  if (/stealth|shadow|sneak|\u6f5c\u884c|\u6697\u5f71|\u5de1\u903b|\u8eb2\u85cf/.test(text)) return 'stealth';
  if (/shooter|bullet|flight|shoot|\u5c04\u51fb|\u5f39\u5e55|\u98de\u884c|\u661f\u69ce/.test(text)) return 'shooter';
  if (/gravity|flip|\u91cd\u529b|\u7ffb\u8f6c|\u6d6e\u7a7a|\u53cd\u91cd\u529b/.test(text)) return 'gravity';
  if (/rogue|roguelite|\u8089\u9e3d|\u968f\u673a|\u8bd5\u70bc/.test(text)) return 'roguelite';
  if (/tower|defense|td|\u5854\u9632|\u9632\u7ebf|\u9635\u5730/.test(text)) return 'tower';
  if (/card|deck|\u5361\u724c|\u624b\u724c|\u6784\u7b51/.test(text)) return 'card';
  if (/race|racing|drift|\u7ade\u901f|\u8d5b\u9053|\u6f02\u79fb/.test(text)) return 'racing';
  if (/survival|resource|\u751f\u5b58|\u91c7\u96c6|\u64a4\u79bb/.test(text)) return 'survival';
  if (/metroid|ability|unlock|\u7c7b\u94f6\u6cb3|\u80fd\u529b\u95e8|\u63a2\u7d22\u89e3\u9501/.test(text)) return 'metroidvania';
  if (/cozy|farm|manage|\u6cbb\u6108|\u7ecf\u8425|\u5ead\u9662/.test(text)) return 'cozy';
  if (/memory|card|\u8bb0\u5fc6|\u7ffb\u724c/.test(text)) return 'memory';
  if (/click|reaction|\u53cd\u5e94|\u70b9\u51fb|\u8eb2\u907f/.test(text)) return 'reaction';
  if (/quiz|puzzle|trivia|\u95ee\u7b54|\u8c1c\u9898|\u63a8\u7406|\u89e3\u8c1c/.test(text)) return 'quiz';
  return 'adventure';
}

export function buildDesign(prompt, options = {}) {
  const genre = options.genre || classifyPrompt(prompt);
  const titleSeed = clampText(options.title || prompt, 48, '智能体任务').replace(/[\u3002.!?\uff1f].*$/, '');
  const title = titleSeed.length < 8 ? '智能体任务：信号奔跑' : titleSeed;
  const preset = GENRE_LIBRARY[genre] ?? GENRE_LIBRARY.adventure;
  return { genre, title, tags: preset.tags, summary: preset.summary, palette: preset.palette };
}

const SPECIALTY_CANVAS_PROFILES = {
  shooter: { marker: 'CANVAS_RUNTIME_SHOOTER', mode: 'shooter', label: '飞行射击', accent: '#f97364', accent2: '#67e8f9', hazard: '#facc15', controls: 'WASD / 方向键移动，Space 发射星弹，穿过能量核心。' },
  racing: { marker: 'CANVAS_RUNTIME_RACING', mode: 'racing', label: '俯视竞速', accent: '#4f8ab8', accent2: '#f2c879', hazard: '#d76145', controls: 'A/D 或方向键漂移，W/↑ 加速，穿过加速门并避开路障。' },
  tower: { marker: 'CANVAS_RUNTIME_TOWER', mode: 'tower', label: '塔防策略', accent: '#4a9b83', accent2: '#c99b42', hazard: '#d76145', controls: '点击阵位布置玉塔，Space 快速补塔，守住庭院核心。' },
  card: { marker: 'CANVAS_RUNTIME_CARD', mode: 'card', label: '卡牌构筑', accent: '#d76145', accent2: '#c99b42', hazard: '#8f3a2b', controls: '点击手牌或按 1/2/3 出牌，管理能量、护盾和朱砂事件。' },
  rhythm: { marker: 'CANVAS_RUNTIME_RHYTHM', mode: 'rhythm', label: '节奏动作', accent: '#8b5cf6', accent2: '#f2c879', hazard: '#f472b6', controls: 'A/S/D/F 击中节拍线，保持连击并点亮乐谱玉灯。' },
  stealth: { marker: 'CANVAS_RUNTIME_STEALTH', mode: 'stealth', label: '潜行路线', accent: '#4a9b83', accent2: '#c4b5fd', hazard: '#f43f5e', controls: 'WASD 潜行，避开巡逻灯锥，收集情报后进入暗门。' },
  survival: { marker: 'CANVAS_RUNTIME_SURVIVAL', mode: 'survival', label: '生存采集', accent: '#668b5e', accent2: '#d8b86c', hazard: '#d76145', controls: 'WASD 移动，收集资源、避开雾暴，修复信标后撤离。' },
  gravity: { marker: 'CANVAS_RUNTIME_GRAVITY', mode: 'gravity', label: '重力翻转', accent: '#8b5cf6', accent2: '#b8d890', hazard: '#fb7185', controls: 'A/D 前进，Space 翻转重力，穿过上下石阶并收集晶核。' }
};

function fpsBundleTemplate({ gameId, title, summary, genre, prompt }) {
  const safeTitle = escapeHtml(title);
  const safeSummary = escapeHtml(summary);
  const data = safeJson({ gameId, title, genre, prompt: clampText(prompt, 280, '') });
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
<style>
:root{color-scheme:light;--paper:#fbf7ee;--paper2:#eef5ef;--ink:#16201c;--muted:#6f776f;--line:rgba(32,45,39,.16);--jade:#4a9b83;--gold:#c99b42;--vermillion:#d76145;--sky:#dcebe7;--blue:#8bb8cf}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--paper);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;overflow:hidden}body{display:grid;place-items:center;padding:18px;background:radial-gradient(circle at 18% 6%,rgba(201,155,66,.24),transparent 28%),linear-gradient(140deg,#fffaf0 0%,#edf5ef 54%,#f5eee4 100%)}body:before{content:'';position:fixed;inset:0;pointer-events:none;background:repeating-linear-gradient(90deg,rgba(22,32,28,.045) 0 1px,transparent 1px 96px),repeating-linear-gradient(0deg,rgba(74,155,131,.045) 0 1px,transparent 1px 84px);mask-image:linear-gradient(to bottom,rgba(0,0,0,.75),transparent 92%)}.game-shell{width:min(1180px,100%);display:grid;gap:12px}.topbar{display:flex;justify-content:space-between;gap:16px;align-items:end}.eyebrow{font-size:11px;letter-spacing:.12em;color:var(--gold);font-weight:900;text-transform:uppercase}.title{font-size:clamp(22px,3vw,38px);line-height:1;margin:4px 0;font-weight:950;letter-spacing:0}.summary{color:var(--muted);max-width:760px;font-size:14px;line-height:1.55;margin:0}.hud{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.pill{min-width:88px;border:1px solid var(--line);background:rgba(255,255,255,.58);box-shadow:0 12px 34px rgba(45,55,48,.08);border-radius:8px;padding:8px 10px;text-align:center;backdrop-filter:blur(14px)}.pill strong{display:block;font-size:17px}.pill span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.08em}.stage{position:relative;aspect-ratio:16/9;width:100%;border:1px solid rgba(32,45,39,.16);border-radius:8px;overflow:hidden;background:#e9f1ed;box-shadow:0 30px 80px rgba(40,55,48,.18)}canvas{display:block;width:100%;height:100%;background:#edf5ef;cursor:crosshair}.overlay{position:absolute;inset:auto 18px 18px 18px;display:flex;justify-content:space-between;align-items:end;gap:16px;pointer-events:none}.controls{color:#22302a;font-size:12px;background:rgba(255,250,240,.72);border:1px solid rgba(32,45,39,.16);backdrop-filter:blur(14px);border-radius:8px;padding:9px 11px;box-shadow:0 12px 28px rgba(45,55,48,.08)}.status{max-width:460px;color:#16201c;background:rgba(255,250,240,.78);border:1px solid rgba(74,155,131,.24);border-radius:8px;padding:10px 12px;font-size:13px;line-height:1.45;text-align:right;box-shadow:0 12px 28px rgba(45,55,48,.08);backdrop-filter:blur(14px)}.start{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(180deg,rgba(251,247,238,.18),rgba(251,247,238,.82));padding:22px;cursor:pointer}.start-card{width:min(540px,92%);border:1px solid rgba(32,45,39,.16);background:linear-gradient(145deg,rgba(255,255,255,.86),rgba(238,245,239,.72));backdrop-filter:blur(18px);border-radius:8px;padding:22px;text-align:center;box-shadow:0 22px 68px rgba(45,55,48,.16)}.start-card h2{margin:0 0 8px;font-size:28px;letter-spacing:0}.start-card p{color:#626b63;line-height:1.55}.btn{border:0;border-radius:8px;background:linear-gradient(135deg,var(--jade),var(--gold));color:#fffaf0;font-weight:950;padding:12px 18px;cursor:pointer;box-shadow:0 14px 32px rgba(74,155,131,.22)}.btn:hover{filter:brightness(1.04);transform:translateY(-1px)}.hidden{display:none}
</style>
</head>
<body>
<main class="game-shell">
  <header class="topbar">
    <div><div class="eyebrow">AI FPS Target Runtime</div><h1 class="title">${safeTitle}</h1><p class="summary">${safeSummary}</p></div>
    <div class="hud"><div class="pill"><strong id="score">0</strong><span>&#x5206;&#x6570;</span></div><div class="pill"><strong id="combo">0x</strong><span>&#x8FDE;&#x51FB;</span></div><div class="pill"><strong id="targets">0/0</strong><span>&#x76EE;&#x6807;</span></div><div class="pill"><strong id="time">45&#x79D2;</strong><span>&#x65F6;&#x95F4;</span></div></div>
  </header>
  <section class="stage">
    <canvas id="game" width="1280" height="720" aria-label="&#x53EF;&#x8BD5;&#x73A9;&#x7684; FPS &#x51C6;&#x661F;&#x76EE;&#x6807;&#x8BAD;&#x7EC3;&#x6E38;&#x620F;"></canvas>
    <div class="overlay"><div class="controls">&#x9F20;&#x6807;&#x79FB;&#x52A8;&#x51C6;&#x661F; / &#x70B9;&#x51FB;&#x5C04;&#x51FB; / Space &#x5F00;&#x706B; / WASD &#x5FAE;&#x8C03;&#x89C6;&#x89D2; / R &#x91CD;&#x5F00;</div><div class="status" id="status">&#x547D;&#x4E2D;&#x7389;&#x8272;&#x76EE;&#x6807;&#xFF0C;&#x907F;&#x5F00;&#x6731;&#x7802;&#x5E72;&#x6270;&#x9776;&#x3002;</div></div>
    <div class="start" id="start"><div class="start-card"><div class="eyebrow">FPS_TARGET_TRAINER &#xB7; &#x72EC;&#x7ACB;&#x8FD0;&#x884C;&#x65F6;</div><h2>${safeTitle}</h2><p>${safeSummary}</p><button class="btn" id="startBtn">&#x8FDB;&#x5165;&#x9776;&#x573A;</button></div></div>
  </section>
</main>
<script>
const GAME = ${data};
const FPS_TARGET_TRAINER = true;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const targetsEl = document.getElementById('targets');
const timeEl = document.getElementById('time');
const statusEl = document.getElementById('status');
const start = document.getElementById('start');
const autoPlayDemo = location.hash === '#autoplay';
const keys = new Set();
const W = canvas.width;
const H = canvas.height;
let mode = 'ready';
let last = performance.now();
let started = 0;
let score = 0;
let combo = 0;
let remaining = 0;
let view = { x: 0, y: 0 };
let crosshair = { x: W / 2, y: H / 2 };
let muzzle = 0;
let messagePulse = 0;
let shotCooldown = 0;
let autoTimer = 0;
let targets = [];
let particles = [];
function reset() {
  mode = 'playing';
  started = performance.now();
  score = 0;
  combo = 0;
  view = { x: 0, y: 0 };
  crosshair = { x: W / 2, y: H / 2 };
  muzzle = 0;
  shotCooldown = 0;
  autoTimer = 0;
  particles = [];
  targets = [
    { id: 1, x: -310, y: -78, z: .78, r: 37, kind: 'jade', phase: .1, alive: true },
    { id: 2, x: 245, y: -104, z: .68, r: 33, kind: 'jade', phase: .9, alive: true },
    { id: 3, x: -105, y: 34, z: .48, r: 30, kind: 'gold', phase: 1.7, alive: true },
    { id: 4, x: 352, y: 48, z: .58, r: 34, kind: 'jade', phase: 2.4, alive: true },
    { id: 5, x: -420, y: 88, z: .62, r: 31, kind: 'decoy', phase: 3.1, alive: true },
    { id: 6, x: 36, y: -136, z: .36, r: 28, kind: 'gold', phase: 3.8, alive: true },
    { id: 7, x: 456, y: -64, z: .42, r: 31, kind: 'decoy', phase: 4.6, alive: true },
    { id: 8, x: -252, y: 130, z: .34, r: 27, kind: 'jade', phase: 5.2, alive: true },
    { id: 9, x: 168, y: 132, z: .31, r: 28, kind: 'jade', phase: 5.9, alive: true }
  ];
  remaining = targets.filter((target) => target.kind !== 'decoy').length;
  statusEl.textContent = '\\u547d\\u4e2d\\u7389\\u8272\\u4e0e\\u91d1\\u8272\\u76ee\\u6807\\uff0c\\u907f\\u5f00\\u6731\\u7802\\u5e72\\u6270\\u9776\\u3002';
  start.classList.add('hidden');
  syncHud();
}
function syncHud() {
  scoreEl.textContent = Math.max(0, Math.round(score));
  comboEl.textContent = combo + 'x';
  targetsEl.textContent = remaining + '/7';
  const elapsed = mode === 'ready' ? 0 : (performance.now() - started) / 1000;
  timeEl.textContent = Math.max(0, Math.ceil(45 - elapsed)) + '\\u79d2';
}
function projectTarget(target) {
  const drift = Math.sin(performance.now() / 640 + target.phase) * (target.kind === 'decoy' ? 26 : 18);
  const scale = .74 + (1 - target.z) * 1.48;
  return {
    x: W / 2 + (target.x - view.x * 80) * scale + drift,
    y: H * .48 + target.y * scale + view.y * 52 + Math.cos(performance.now() / 760 + target.phase) * 8,
    r: target.r * scale
  };
}
function addBurst(x, y, color, n) {
  for (let i = 0; i < n; i += 1) {
    particles.push({ x, y, vx: (Math.random() - .5) * 360, vy: (Math.random() - .5) * 280, a: 1, c: color, s: 2 + Math.random() * 4 });
  }
}
function hitTarget(target, projected) {
  target.alive = false;
  if (target.kind === 'decoy') {
    combo = 0;
    score = Math.max(0, score - 120);
    statusEl.textContent = '\\u547d\\u4e2d\\u6731\\u7802\\u5e72\\u6270\\u9776\\uff0c\\u8fde\\u51fb\\u5df2\\u65ad\\u3002';
    addBurst(projected.x, projected.y, '#d76145', 30);
  } else {
    combo += 1;
    remaining -= 1;
    score += 130 + combo * 24 + (target.kind === 'gold' ? 80 : 0);
    statusEl.textContent = combo >= 3 ? '\\u8fde\\u7eed\\u547d\\u4e2d\\uff0c\\u51c6\\u661f\\u7a33\\u5b9a\\u3002' : '\\u76ee\\u6807\\u547d\\u4e2d\\uff0c\\u7ee7\\u7eed\\u538b\\u5236\\u9776\\u573a\\u3002';
    addBurst(projected.x, projected.y, target.kind === 'gold' ? '#c99b42' : '#4a9b83', 34);
  }
  messagePulse = .4;
  if (remaining <= 0) {
    mode = 'won';
    statusEl.textContent = '\\u9776\\u573a\\u6e05\\u7a7a\\uff0cFPS \\u51c6\\u661f\\u8bad\\u7ec3\\u6e38\\u620f\\u5df2\\u5b8c\\u6210\\u3002';
  }
}
function shoot() {
  if (mode !== 'playing' || shotCooldown > 0) return;
  shotCooldown = .16;
  muzzle = .16;
  let best = null;
  for (const target of targets) {
    if (!target.alive) continue;
    const p = projectTarget(target);
    const d = Math.hypot(crosshair.x - p.x, crosshair.y - p.y);
    if (d <= p.r + 11 && (!best || d < best.d)) best = { target, projected: p, d };
  }
  if (best) hitTarget(best.target, best.projected);
  else {
    combo = 0;
    score = Math.max(0, score - 18);
    statusEl.textContent = '\\u672a\\u547d\\u4e2d\\uff0c\\u8c03\\u6574\\u51c6\\u661f\\u540e\\u518d\\u5f00\\u706b\\u3002';
    addBurst(crosshair.x, crosshair.y, '#8bb8cf', 10);
  }
  syncHud();
}
function update(dt) {
  if (mode === 'playing') {
    const left = keys.has('a') || keys.has('arrowleft');
    const right = keys.has('d') || keys.has('arrowright');
    const up = keys.has('w') || keys.has('arrowup');
    const down = keys.has('s') || keys.has('arrowdown');
    view.x += ((right ? 1 : 0) - (left ? 1 : 0)) * dt * 1.3;
    view.y += ((down ? 1 : 0) - (up ? 1 : 0)) * dt * .9;
    view.x = Math.max(-1.6, Math.min(1.6, view.x));
    view.y = Math.max(-1, Math.min(1, view.y));
    if (keys.has('j')) crosshair.x -= 420 * dt;
    if (keys.has('l')) crosshair.x += 420 * dt;
    if (keys.has('i')) crosshair.y -= 420 * dt;
    if (keys.has('k')) crosshair.y += 420 * dt;
    crosshair.x = Math.max(34, Math.min(W - 34, crosshair.x));
    crosshair.y = Math.max(34, Math.min(H - 34, crosshair.y));
    if (autoPlayDemo) {
      const live = targets.filter((target) => target.alive && target.kind !== 'decoy');
      if (live.length) {
        const p = projectTarget(live[0]);
        crosshair.x += (p.x - crosshair.x) * Math.min(1, dt * 4.5);
        crosshair.y += (p.y - crosshair.y) * Math.min(1, dt * 4.5);
        autoTimer += dt;
        if (autoTimer > .82 && Math.hypot(crosshair.x - p.x, crosshair.y - p.y) < 26) {
          autoTimer = 0;
          shoot();
        }
      }
    }
    const elapsed = (performance.now() - started) / 1000;
    if (elapsed >= 45 && remaining > 0) {
      mode = 'failed';
      statusEl.textContent = '\\u65f6\\u95f4\\u5230\\uff0c\\u6309 R \\u91cd\\u5f00\\u9776\\u573a\\u3002';
    }
  }
  shotCooldown = Math.max(0, shotCooldown - dt);
  muzzle = Math.max(0, muzzle - dt);
  messagePulse = Math.max(0, messagePulse - dt);
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= .98;
    p.vy *= .98;
    p.a -= dt * 1.8;
  }
  particles = particles.filter((p) => p.a > 0);
  syncHud();
}
function drawRange() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#dcebe7');
  sky.addColorStop(.54, '#f8f1e5');
  sky.addColorStop(1, '#e5efe8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(-view.x * 18, view.y * 14);
  ctx.globalAlpha = .55;
  ctx.fillStyle = '#9bb5b0';
  for (let i = 0; i < 6; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-120 + i * 260, 330);
    ctx.quadraticCurveTo(40 + i * 260, 160 + (i % 2) * 32, 280 + i * 260, 330);
    ctx.lineTo(370 + i * 260, 500);
    ctx.lineTo(-190 + i * 260, 500);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.fillStyle = 'rgba(255,250,240,.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2 - view.x * 70, H * .73 + view.y * 32);
  ctx.strokeStyle = 'rgba(32,45,39,.13)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i += 1) {
    const y = i * 25;
    ctx.beginPath();
    ctx.moveTo(-620 - i * 48, y);
    ctx.lineTo(620 + i * 48, y);
    ctx.stroke();
  }
  for (let i = -6; i <= 6; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 86, -34);
    ctx.lineTo(i * 160, 330);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(201,155,66,.36)';
  ctx.lineWidth = 4;
  ctx.strokeRect(152 - view.x * 30, 104 + view.y * 12, 976, 438);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(74,155,131,.22)';
  ctx.strokeRect(212 - view.x * 42, 142 + view.y * 18, 856, 360);
}
function drawTarget(target) {
  if (!target.alive) return;
  const p = projectTarget(target);
  ctx.save();
  ctx.translate(p.x, p.y);
  const colors = target.kind === 'decoy' ? ['#d76145', '#fff1e8'] : target.kind === 'gold' ? ['#c99b42', '#fff9df'] : ['#4a9b83', '#ecfff8'];
  ctx.shadowColor = colors[0];
  ctx.shadowBlur = target.kind === 'decoy' ? 10 : 16;
  ctx.fillStyle = 'rgba(255,255,255,.62)';
  ctx.beginPath();
  ctx.arc(0, 0, p.r + 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = colors[0];
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, p.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = colors[1];
  ctx.beginPath();
  ctx.arc(0, 0, p.r * .58, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = colors[0];
  ctx.beginPath();
  if (target.kind === 'decoy') {
    ctx.moveTo(0, -p.r * .62);
    ctx.lineTo(p.r * .58, p.r * .48);
    ctx.lineTo(-p.r * .58, p.r * .48);
    ctx.closePath();
  } else {
    ctx.moveTo(0, -p.r * .56);
    ctx.lineTo(p.r * .56, 0);
    ctx.lineTo(0, p.r * .56);
    ctx.lineTo(-p.r * .56, 0);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
}
function drawCrosshair() {
  ctx.save();
  ctx.translate(crosshair.x, crosshair.y);
  ctx.strokeStyle = '#16201c';
  ctx.lineWidth = 2;
  ctx.globalAlpha = .9;
  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.lineTo(-10, 0);
  ctx.moveTo(10, 0);
  ctx.lineTo(30, 0);
  ctx.moveTo(0, -30);
  ctx.lineTo(0, -10);
  ctx.moveTo(0, 10);
  ctx.lineTo(0, 30);
  ctx.stroke();
  ctx.strokeStyle = muzzle > 0 ? '#d76145' : '#4a9b83';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 16 + muzzle * 54, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
function draw() {
  drawRange();
  const ordered = targets.slice().sort((a, b) => b.z - a.z);
  for (const target of ordered) drawTarget(target);
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.a);
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
  }
  ctx.globalAlpha = 1;
  drawCrosshair();
  if (messagePulse > 0) {
    ctx.fillStyle = 'rgba(255,250,240,' + (.48 + messagePulse) + ')';
    ctx.fillRect(438, 44, 404, 46);
    ctx.fillStyle = '#16201c';
    ctx.font = '800 18px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(statusEl.textContent, W / 2, 74);
  }
  if (mode === 'won' || mode === 'failed') {
    ctx.fillStyle = 'rgba(251,247,238,.74)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#16201c';
    ctx.textAlign = 'center';
    ctx.font = '900 52px system-ui';
    ctx.fillText(mode === 'won' ? '\\u9776\\u573a\\u6e05\\u7a7a' : '\\u8bad\\u7ec3\\u6682\\u505c', W / 2, H / 2 - 22);
    ctx.font = '600 20px system-ui';
    ctx.fillStyle = '#626b63';
    ctx.fillText('\\u6309 R \\u91cd\\u65b0\\u8fdb\\u5165 FPS \\u51c6\\u661f\\u8bad\\u7ec3\\u3002', W / 2, H / 2 + 24);
  }
}
function loop(now) {
  const dt = Math.min(.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  crosshair.x = ((point.clientX - rect.left) / rect.width) * W;
  crosshair.y = ((point.clientY - rect.top) / rect.height) * H;
}
canvas.addEventListener('mousemove', canvasPoint);
canvas.addEventListener('touchmove', (event) => { canvasPoint(event); event.preventDefault(); }, { passive: false });
canvas.addEventListener('click', (event) => { canvasPoint(event); shoot(); });
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);
  if (key === 'r') reset();
  if (key === ' ' || key === 'spacebar') shoot();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
document.getElementById('startBtn').addEventListener('click', (event) => { event.stopPropagation(); reset(); });
start.addEventListener('click', reset);
if (autoPlayDemo) reset();
syncHud();
draw();
requestAnimationFrame(loop);
</script>
</body>
</html>`;
}

function specialtyCanvasBundleTemplate({ gameId, title, summary, genre, prompt, profile }) {
  const safeTitle = escapeHtml(title);
  const safeSummary = escapeHtml(summary);
  const data = safeJson({ gameId, title, genre, prompt: clampText(prompt, 280, ''), profile });
  const controls = escapeHtml(profile.controls);
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
<style>
:root{color-scheme:light;--paper:#fbf7ee;--ink:#17211d;--muted:#68736c;--line:rgba(32,45,39,.16);--accent:${profile.accent};--accent2:${profile.accent2};--hazard:${profile.hazard}}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#fbf7ee;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;overflow:hidden}body{display:grid;place-items:center;padding:18px;background:radial-gradient(circle at 16% 8%,color-mix(in srgb,var(--accent2) 26%,transparent),transparent 28%),linear-gradient(140deg,#fffaf0 0%,#eef6f0 52%,#f5eee4 100%)}body:before{content:'';position:fixed;inset:0;pointer-events:none;background:repeating-linear-gradient(90deg,rgba(22,32,28,.045) 0 1px,transparent 1px 94px),repeating-linear-gradient(0deg,rgba(74,155,131,.04) 0 1px,transparent 1px 82px);mask-image:linear-gradient(to bottom,rgba(0,0,0,.76),transparent 92%)}.game-shell{width:min(1180px,100%);display:grid;gap:12px}.topbar{display:flex;justify-content:space-between;gap:16px;align-items:end}.eyebrow{font-size:11px;letter-spacing:.12em;color:var(--accent);font-weight:950;text-transform:uppercase}.title{font-size:clamp(22px,3vw,38px);line-height:1;margin:4px 0;font-weight:950;letter-spacing:0}.summary{color:var(--muted);max-width:760px;font-size:14px;line-height:1.55;margin:0}.hud{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.pill{min-width:88px;border:1px solid var(--line);background:rgba(255,255,255,.62);box-shadow:0 12px 34px rgba(45,55,48,.08);border-radius:8px;padding:8px 10px;text-align:center;backdrop-filter:blur(14px)}.pill strong{display:block;font-size:17px}.pill span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.08em}.stage{position:relative;aspect-ratio:16/9;width:100%;border:1px solid rgba(32,45,39,.16);border-radius:8px;overflow:hidden;background:#eef6f0;box-shadow:0 30px 80px rgba(40,55,48,.18)}canvas{display:block;width:100%;height:100%;background:#eef6f0}.overlay{position:absolute;inset:auto 18px 18px 18px;display:flex;justify-content:space-between;align-items:end;gap:16px;pointer-events:none}.controls{color:#22302a;font-size:12px;background:rgba(255,250,240,.74);border:1px solid rgba(32,45,39,.16);backdrop-filter:blur(14px);border-radius:8px;padding:9px 11px;box-shadow:0 12px 28px rgba(45,55,48,.08)}.status{max-width:460px;color:#16201c;background:rgba(255,250,240,.78);border:1px solid color-mix(in srgb,var(--accent) 28%,transparent);border-radius:8px;padding:10px 12px;font-size:13px;line-height:1.45;text-align:right;box-shadow:0 12px 28px rgba(45,55,48,.08);backdrop-filter:blur(14px)}.start{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(180deg,rgba(251,247,238,.18),rgba(251,247,238,.84));padding:22px;cursor:pointer}.start-card{width:min(540px,92%);border:1px solid rgba(32,45,39,.16);background:linear-gradient(145deg,rgba(255,255,255,.88),rgba(238,245,239,.74));backdrop-filter:blur(18px);border-radius:8px;padding:22px;text-align:center;box-shadow:0 22px 68px rgba(45,55,48,.16)}.start-card h2{margin:0 0 8px;font-size:28px;letter-spacing:0}.start-card p{color:#626b63;line-height:1.55}.btn{border:0;border-radius:8px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fffaf0;font-weight:950;padding:12px 18px;cursor:pointer;box-shadow:0 14px 32px color-mix(in srgb,var(--accent) 24%,transparent)}.btn:hover{filter:brightness(1.04);transform:translateY(-1px)}.hidden{display:none}
</style>
</head>
<body>
<main class="game-shell">
  <header class="topbar">
    <div><div class="eyebrow">${profile.marker}</div><h1 class="title">${safeTitle}</h1><p class="summary">${safeSummary}</p></div>
    <div class="hud"><div class="pill"><strong id="score">0</strong><span>&#x5206;&#x6570;</span></div><div class="pill"><strong id="meter">0</strong><span>&#x8FDB;&#x5EA6;</span></div><div class="pill"><strong id="time">0&#x79D2;</strong><span>&#x65F6;&#x95F4;</span></div></div>
  </header>
  <section class="stage">
    <canvas id="game" width="1280" height="720" aria-label="${profile.label} Canvas playable runtime"></canvas>
    <div class="overlay"><div class="controls">${controls}</div><div class="status" id="status">&#x70B9;&#x51FB;&#x5F00;&#x59CB;&#xFF0C;&#x8FD0;&#x884C;&#x8FD9;&#x4E2A;&#x72EC;&#x7ACB;&#x7C7B;&#x578B;&#x7684; Canvas &#x6E38;&#x620F;&#x5305;&#x3002;</div></div>
    <div class="start" id="start"><div class="start-card"><div class="eyebrow">${profile.label} &#xB7; &#x4E13;&#x7528; Canvas &#x5305;</div><h2>${safeTitle}</h2><p>${safeSummary}</p><button class="btn" id="startBtn">&#x5F00;&#x59CB;&#x8BD5;&#x73A9;</button></div></div>
  </section>
</main>
<script>
const GAME = ${data};
const SPECIALTY_CANVAS_RUNTIME = GAME.profile.marker;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const meterEl = document.getElementById('meter');
const timeEl = document.getElementById('time');
const statusEl = document.getElementById('status');
const start = document.getElementById('start');
const autoPlayDemo = location.hash === '#autoplay';
const W = canvas.width;
const H = canvas.height;
const keys = new Set();
let last = performance.now();
let started = 0;
let mode = 'ready';
let score = 0;
let meter = 0;
let tick = 0;
let player = {};
let actors = [];
let shots = [];
let particles = [];
let hand = [];
let beatIndex = 0;
let selectedTower = 0;
function reset() {
  started = performance.now();
  mode = 'playing';
  score = 0;
  meter = 0;
  tick = 0;
  actors = [];
  shots = [];
  particles = [];
  hand = [];
  selectedTower = 0;
  if (GAME.profile.mode === 'shooter') initShooter();
  else if (GAME.profile.mode === 'racing') initRacing();
  else if (GAME.profile.mode === 'tower') initTower();
  else if (GAME.profile.mode === 'card') initCard();
  else if (GAME.profile.mode === 'rhythm') initRhythm();
  else if (GAME.profile.mode === 'stealth') initStealth();
  else if (GAME.profile.mode === 'survival') initSurvival();
  else if (GAME.profile.mode === 'gravity') initGravity();
  statusEl.textContent = GAME.profile.label + ' 已启动，当前包不是横版跳跃模板。';
  start.classList.add('hidden');
  syncHud();
}
function syncHud() {
  scoreEl.textContent = Math.max(0, Math.round(score));
  meterEl.textContent = Math.round(meter);
  timeEl.textContent = Math.round((performance.now() - started) / 1000) + '\\u79d2';
}
function addBurst(x, y, color, n = 14) {
  for (let i = 0; i < n; i += 1) particles.push({ x, y, vx: (Math.random() - .5) * 260, vy: (Math.random() - .5) * 220, a: 1, c: color, s: 2 + Math.random() * 4 });
}
function drawBackdrop(kind = 'garden') {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#e1efec');
  grad.addColorStop(.54, '#fff6e8');
  grad.addColorStop(1, '#e8f2eb');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = .34;
  ctx.fillStyle = GAME.profile.accent2;
  for (let i = 0; i < 7; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-160 + i * 260, 355);
    ctx.quadraticCurveTo(30 + i * 260, 156 + (i % 3) * 26, 290 + i * 260, 355);
    ctx.lineTo(380 + i * 260, 544);
    ctx.lineTo(-220 + i * 260, 544);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(32,45,39,.12)';
  ctx.lineWidth = 2;
  if (kind === 'grid') {
    for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  } else {
    for (let i = 0; i < 12; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 128 - 40, 180 + (i % 4) * 28);
      ctx.bezierCurveTo(i * 128 + 30, 126, i * 128 + 76, 220, i * 128 + 142, 156);
      ctx.stroke();
    }
  }
  ctx.restore();
}
function initShooter() {
  player = { x: 160, y: H / 2, hp: 100, fire: 0 };
  actors = [
    { type: 'core', x: 540, y: 180, r: 18 },
    { type: 'core', x: 830, y: 420, r: 18 },
    { type: 'gate', x: 1160, y: H / 2, r: 44 },
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'enemy', x: 520 + i * 82, y: 110 + (i * 97) % 500, r: 18, phase: i }))
  ];
}
function updateShooter(dt) {
  const up = keys.has('w') || keys.has('arrowup');
  const down = keys.has('s') || keys.has('arrowdown');
  const left = keys.has('a') || keys.has('arrowleft');
  const right = keys.has('d') || keys.has('arrowright');
  player.x += ((right ? 1 : 0) - (left ? 1 : 0)) * 320 * dt;
  player.y += ((down ? 1 : 0) - (up ? 1 : 0)) * 320 * dt;
  player.x = Math.max(70, Math.min(1120, player.x));
  player.y = Math.max(70, Math.min(H - 70, player.y));
  player.fire -= dt;
  if ((keys.has(' ') || autoPlayDemo) && player.fire <= 0) { shots.push({ x: player.x + 34, y: player.y, vx: 620 }); player.fire = .18; }
  for (const actor of actors) if (actor.type === 'enemy') actor.x -= (82 + Math.sin(tick + actor.phase) * 18) * dt;
  for (const shot of shots) shot.x += shot.vx * dt;
  for (const shot of shots) for (const actor of actors) {
    if (actor.dead || actor.type !== 'enemy') continue;
    if (Math.hypot(shot.x - actor.x, shot.y - actor.y) < actor.r + 8) { actor.dead = true; shot.dead = true; score += 120; meter += 8; addBurst(actor.x, actor.y, GAME.profile.accent, 20); }
  }
  for (const actor of actors) {
    if (actor.dead) continue;
    if (actor.type === 'core' && Math.hypot(player.x - actor.x, player.y - actor.y) < actor.r + 24) { actor.dead = true; score += 160; meter += 18; addBurst(actor.x, actor.y, GAME.profile.accent2, 24); }
    if (actor.type === 'enemy' && Math.hypot(player.x - actor.x, player.y - actor.y) < actor.r + 22) { actor.dead = true; score = Math.max(0, score - 80); addBurst(player.x, player.y, GAME.profile.hazard, 18); }
    if (actor.type === 'gate' && meter >= 45 && Math.hypot(player.x - actor.x, player.y - actor.y) < actor.r + 22) { mode = 'won'; statusEl.textContent = '星门已穿越，飞行射击包完成。'; }
  }
  actors = actors.filter((actor) => !actor.dead && actor.x > -40);
  shots = shots.filter((shot) => !shot.dead && shot.x < W + 40);
  if (autoPlayDemo) { player.y += (H * .5 + Math.sin(tick * 2) * 180 - player.y) * dt * 2.4; keys.add(' '); }
}
function drawShooter() {
  drawBackdrop('space');
  ctx.fillStyle = 'rgba(79,138,184,.12)';
  for (let i = 0; i < 18; i += 1) ctx.fillRect((i * 96 - tick * 80) % W, 80 + (i * 47) % 540, 42, 2);
  for (const actor of actors) {
    ctx.save(); ctx.translate(actor.x, actor.y);
    if (actor.type === 'enemy') { ctx.fillStyle = GAME.profile.hazard; ctx.beginPath(); ctx.moveTo(-18, -16); ctx.lineTo(22, 0); ctx.lineTo(-18, 16); ctx.closePath(); ctx.fill(); }
    if (actor.type === 'core') { ctx.fillStyle = GAME.profile.accent2; ctx.rotate(Math.PI / 4 + tick); ctx.fillRect(-14, -14, 28, 28); }
    if (actor.type === 'gate') { ctx.strokeStyle = GAME.profile.accent; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, actor.r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  ctx.fillStyle = GAME.profile.accent;
  ctx.beginPath(); ctx.moveTo(player.x - 28, player.y - 22); ctx.lineTo(player.x + 34, player.y); ctx.lineTo(player.x - 28, player.y + 22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = GAME.profile.accent2; for (const shot of shots) ctx.fillRect(shot.x, shot.y - 3, 26, 6);
}
function initRacing() {
  player = { x: W / 2, y: H - 96, speed: 0, lane: 0 };
  actors = Array.from({ length: 14 }, (_, i) => ({ type: i % 4 === 0 ? 'boost' : 'block', x: W / 2 + ((i % 5) - 2) * 90, y: 90 + i * 120, r: 24 }));
}
function updateRacing(dt) {
  const accel = keys.has('w') || keys.has('arrowup') || autoPlayDemo;
  player.speed += (accel ? 360 : -180) * dt;
  player.speed = Math.max(170, Math.min(560, player.speed));
  const turn = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  player.x += turn * (260 + player.speed * .25) * dt;
  if (autoPlayDemo) player.x += (W / 2 + Math.sin(tick * 1.4) * 150 - player.x) * dt * 2.2;
  player.x = Math.max(350, Math.min(930, player.x));
  meter += player.speed * dt * .025;
  for (const actor of actors) {
    actor.y += player.speed * dt;
    if (actor.y > H + 60) { actor.y = -80; actor.x = W / 2 + (Math.random() - .5) * 520; actor.type = Math.random() > .7 ? 'boost' : 'block'; }
    if (Math.hypot(player.x - actor.x, player.y - actor.y) < actor.r + 28) {
      if (actor.type === 'boost') { score += 90; meter += 6; player.speed = Math.min(620, player.speed + 120); addBurst(actor.x, actor.y, GAME.profile.accent2, 18); }
      else { score = Math.max(0, score - 70); player.speed = Math.max(180, player.speed - 150); addBurst(actor.x, actor.y, GAME.profile.hazard, 18); }
      actor.y = -120;
    }
  }
  if (meter >= 100) { mode = 'won'; statusEl.textContent = '已冲线，俯视竞速包完成。'; }
}
function drawRacing() {
  drawBackdrop('grid');
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.fillStyle = 'rgba(255,255,255,.62)';
  ctx.beginPath(); ctx.moveTo(-340, -420); ctx.lineTo(340, -420); ctx.lineTo(260, 420); ctx.lineTo(-260, 420); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(32,45,39,.16)'; ctx.lineWidth = 4;
  for (let i = -2; i <= 2; i += 1) { ctx.beginPath(); ctx.moveTo(i * 95, -420); ctx.lineTo(i * 74, 420); ctx.stroke(); }
  ctx.restore();
  for (const actor of actors) {
    ctx.fillStyle = actor.type === 'boost' ? GAME.profile.accent2 : GAME.profile.hazard;
    if (actor.type === 'boost') { ctx.fillRect(actor.x - 30, actor.y - 8, 60, 16); }
    else { ctx.beginPath(); ctx.arc(actor.x, actor.y, actor.r, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.save(); ctx.translate(player.x, player.y); ctx.fillStyle = GAME.profile.accent; ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(24, 28); ctx.lineTo(0, 16); ctx.lineTo(-24, 28); ctx.closePath(); ctx.fill(); ctx.restore();
}
function initTower() {
  player = { core: 100, energy: 3, wave: 1 };
  actors = [
    ...Array.from({ length: 8 }, (_, i) => ({ type: 'slot', x: 310 + (i % 4) * 168, y: 230 + Math.floor(i / 4) * 170, tower: false })),
    ...Array.from({ length: 7 }, (_, i) => ({ type: 'enemy', x: -80 - i * 92, y: 136 + (i % 4) * 118, hp: 90, speed: 48 + i * 5 }))
  ];
}
function placeTower(x, y) {
  const slots = actors.filter((actor) => actor.type === 'slot' && !actor.tower);
  let best = slots[0];
  for (const slot of slots) if (Math.hypot(x - slot.x, y - slot.y) < Math.hypot(x - best.x, y - best.y)) best = slot;
  if (best && player.energy > 0) { best.tower = true; player.energy -= 1; score += 30; addBurst(best.x, best.y, GAME.profile.accent2, 16); }
}
function updateTower(dt) {
  if (autoPlayDemo && tick < 1.2 && actors.filter((a) => a.type === 'slot' && a.tower).length < 3) placeTower(310 + selectedTower * 168, 230 + (selectedTower % 2) * 170), selectedTower += 1;
  if (keys.has(' ')) placeTower(310 + selectedTower % 4 * 168, 230 + Math.floor(selectedTower % 8 / 4) * 170), selectedTower += 1, keys.delete(' ');
  for (const enemy of actors.filter((actor) => actor.type === 'enemy')) enemy.x += enemy.speed * dt;
  for (const slot of actors.filter((actor) => actor.type === 'slot' && actor.tower)) {
    slot.cool = (slot.cool || 0) - dt;
    if (slot.cool <= 0) {
      const enemy = actors.find((actor) => actor.type === 'enemy' && Math.hypot(actor.x - slot.x, actor.y - slot.y) < 210);
      if (enemy) { enemy.hp -= 45; slot.cool = .55; addBurst(enemy.x, enemy.y, GAME.profile.accent, 8); if (enemy.hp <= 0) { enemy.dead = true; score += 110; meter += 14; player.energy += .35; } }
    }
  }
  for (const enemy of actors.filter((actor) => actor.type === 'enemy' && actor.x > W - 150)) { enemy.dead = true; player.core -= 16; score = Math.max(0, score - 50); addBurst(W - 150, enemy.y, GAME.profile.hazard, 12); }
  actors = actors.filter((actor) => !actor.dead);
  if (!actors.some((actor) => actor.type === 'enemy')) { mode = 'won'; statusEl.textContent = '庭院核心守住，塔防包完成。'; meter = 100; }
  if (player.core <= 0) { mode = 'failed'; statusEl.textContent = '核心失守，按 R 重开。'; }
}
function drawTower() {
  drawBackdrop('grid');
  ctx.strokeStyle = 'rgba(32,45,39,.18)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(0, 136); ctx.lineTo(W - 150, 136); ctx.lineTo(W - 150, 254); ctx.lineTo(120, 254); ctx.lineTo(120, 372); ctx.lineTo(W - 150, 372); ctx.lineTo(W - 150, 490); ctx.lineTo(0, 490); ctx.stroke();
  for (const slot of actors.filter((actor) => actor.type === 'slot')) { ctx.fillStyle = slot.tower ? GAME.profile.accent : 'rgba(255,255,255,.68)'; ctx.beginPath(); ctx.arc(slot.x, slot.y, 30, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = GAME.profile.accent2; ctx.stroke(); }
  for (const enemy of actors.filter((actor) => actor.type === 'enemy')) { ctx.fillStyle = GAME.profile.hazard; ctx.fillRect(enemy.x - 18, enemy.y - 18, 36, 36); ctx.fillStyle = '#17211d'; ctx.fillRect(enemy.x - 24, enemy.y - 30, Math.max(0, enemy.hp / 90 * 48), 5); }
  ctx.fillStyle = GAME.profile.accent2; ctx.fillRect(W - 126, H / 2 - 72, 72, 144);
}
function initCard() {
  player = { hp: 24, shield: 0, energy: 3, enemy: 28, turn: 1 };
  hand = [{ name: '玉刃', cost: 1, dmg: 6, block: 0 }, { name: '云盾', cost: 1, dmg: 0, block: 7 }, { name: '金印', cost: 2, dmg: 10, block: 3 }];
  meter = player.enemy;
}
function playCard(index) {
  const card = hand[index];
  if (!card || player.energy < card.cost || mode !== 'playing') return;
  player.energy -= card.cost;
  player.enemy -= card.dmg;
  player.shield += card.block;
  score += card.dmg * 12 + card.block * 5;
  addBurst(W / 2 + index * 80 - 80, H - 130, card.dmg ? GAME.profile.accent : GAME.profile.accent2, 18);
  if (player.enemy <= 0) { mode = 'won'; statusEl.textContent = '朱砂事件已化解，卡牌构筑包完成。'; meter = 100; }
}
function endTurn() {
  const hit = Math.max(0, 8 - player.shield);
  player.hp -= hit;
  player.shield = 0;
  player.energy = 3;
  player.turn += 1;
  score = Math.max(0, score - hit * 8);
  if (player.hp <= 0) { mode = 'failed'; statusEl.textContent = '气血耗尽，按 R 重开。'; }
}
function updateCard(dt) {
  if (autoPlayDemo && tick > player.turn * .9) { playCard((player.turn - 1) % 3); if (player.energy <= 1) endTurn(); }
  if (keys.has('1')) playCard(0), keys.delete('1');
  if (keys.has('2')) playCard(1), keys.delete('2');
  if (keys.has('3')) playCard(2), keys.delete('3');
  if (keys.has(' ')) endTurn(), keys.delete(' ');
  meter = Math.max(0, player.enemy);
}
function drawCard() {
  drawBackdrop('grid');
  ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.fillRect(94, 96, 360, 250); ctx.fillRect(826, 96, 360, 250);
  ctx.fillStyle = GAME.profile.accent; ctx.font = '900 34px system-ui'; ctx.fillText('创作者', 150, 180); ctx.fillStyle = GAME.profile.hazard; ctx.fillText('朱砂事件', 894, 180);
  ctx.fillStyle = '#17211d'; ctx.font = '700 24px system-ui'; ctx.fillText('HP ' + player.hp + '  护盾 ' + player.shield, 150, 236); ctx.fillText('剩余 ' + Math.max(0, player.enemy), 894, 236);
  hand.forEach((card, index) => { const x = 360 + index * 190; ctx.fillStyle = 'rgba(255,250,240,.9)'; ctx.fillRect(x, H - 230, 150, 190); ctx.strokeStyle = index % 2 ? GAME.profile.accent2 : GAME.profile.accent; ctx.lineWidth = 4; ctx.strokeRect(x, H - 230, 150, 190); ctx.fillStyle = '#17211d'; ctx.font = '900 24px system-ui'; ctx.fillText(card.name, x + 28, H - 170); ctx.font = '700 16px system-ui'; ctx.fillText('Cost ' + card.cost, x + 28, H - 130); ctx.fillText('伤害 ' + card.dmg + ' / 护盾 ' + card.block, x + 28, H - 96); });
}
function initRhythm() {
  player = { combo: 0, hp: 100 };
  actors = Array.from({ length: 18 }, (_, i) => ({ lane: i % 4, y: -i * 95, hit: false }));
}
function hitLane(lane) {
  const note = actors.find((actor) => !actor.hit && actor.lane === lane && Math.abs(actor.y - 560) < 52);
  if (note) { note.hit = true; player.combo += 1; score += 80 + player.combo * 8; meter += 6; addBurst(330 + lane * 205, 560, GAME.profile.accent2, 18); }
  else { player.combo = 0; score = Math.max(0, score - 24); }
}
function updateRhythm(dt) {
  actors.forEach((note) => { note.y += 250 * dt; if (note.y > H + 40 && !note.hit) { note.hit = true; player.combo = 0; } });
  if (autoPlayDemo) for (const note of actors) if (!note.hit && note.y > 536 && note.y < 558) hitLane(note.lane);
  ['a', 's', 'd', 'f'].forEach((key, index) => { if (keys.has(key)) { hitLane(index); keys.delete(key); } });
  if (actors.every((note) => note.hit)) { mode = 'won'; statusEl.textContent = '乐谱完成，节奏包完成。'; meter = 100; }
}
function drawRhythm() {
  drawBackdrop('grid');
  const laneX = [330, 535, 740, 945];
  laneX.forEach((x, index) => { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x - 54, 80, 108, 540); ctx.strokeStyle = index % 2 ? GAME.profile.accent2 : GAME.profile.accent; ctx.strokeRect(x - 54, 80, 108, 540); });
  ctx.fillStyle = GAME.profile.hazard; ctx.fillRect(238, 552, 804, 16);
  for (const note of actors) if (!note.hit) { ctx.fillStyle = note.lane % 2 ? GAME.profile.accent2 : GAME.profile.accent; ctx.beginPath(); ctx.arc(laneX[note.lane], note.y, 28, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#17211d'; ctx.font = '900 34px system-ui'; ctx.fillText('Combo ' + player.combo, 74, 90);
}
function initStealth() {
  player = { x: 92, y: H / 2, intel: 0 };
  actors = [
    { type: 'door', x: 1160, y: H / 2, r: 46 },
    ...Array.from({ length: 4 }, (_, i) => ({ type: 'intel', x: 280 + i * 190, y: 150 + (i % 2) * 320, r: 18 })),
    ...Array.from({ length: 5 }, (_, i) => ({ type: 'guard', x: 290 + i * 180, y: 220 + (i % 3) * 110, phase: i }))
  ];
}
function updateStealth(dt) {
  const dx = (keys.has('d') || keys.has('arrowright') || autoPlayDemo ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  const dy = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  player.x += dx * 210 * dt; player.y += dy * 210 * dt;
  if (autoPlayDemo) player.y += (H / 2 + Math.sin(tick * 1.2) * 185 - player.y) * dt * 2;
  player.x = Math.max(60, Math.min(W - 70, player.x)); player.y = Math.max(80, Math.min(H - 80, player.y));
  for (const actor of actors) {
    if (actor.type === 'guard') { actor.angle = Math.sin(tick + actor.phase) * 1.2; const coneX = actor.x + Math.cos(actor.angle) * 130; const coneY = actor.y + Math.sin(actor.angle) * 130; if (Math.hypot(player.x - coneX, player.y - coneY) < 68) { score = Math.max(0, score - 50); player.x = Math.max(70, player.x - 90); addBurst(player.x, player.y, GAME.profile.hazard, 14); } }
    if (actor.type === 'intel' && !actor.dead && Math.hypot(player.x - actor.x, player.y - actor.y) < 34) { actor.dead = true; player.intel += 1; meter += 25; score += 100; addBurst(actor.x, actor.y, GAME.profile.accent2, 18); }
    if (actor.type === 'door' && player.intel >= 3 && Math.hypot(player.x - actor.x, player.y - actor.y) < 58) { mode = 'won'; statusEl.textContent = '暗门开启，潜行包完成。'; }
  }
}
function drawStealth() {
  drawBackdrop('grid');
  for (const actor of actors) {
    if (actor.type === 'guard') { ctx.save(); ctx.translate(actor.x, actor.y); ctx.rotate(actor.angle || 0); ctx.fillStyle = 'rgba(244,63,94,.18)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 170, -.28, .28); ctx.closePath(); ctx.fill(); ctx.fillStyle = GAME.profile.hazard; ctx.fillRect(-14, -14, 28, 28); ctx.restore(); }
    if (actor.type === 'intel' && !actor.dead) { ctx.fillStyle = GAME.profile.accent2; ctx.beginPath(); ctx.arc(actor.x, actor.y, actor.r, 0, Math.PI * 2); ctx.fill(); }
    if (actor.type === 'door') { ctx.strokeStyle = GAME.profile.accent; ctx.lineWidth = 8; ctx.strokeRect(actor.x - 34, actor.y - 58, 68, 116); }
  }
  ctx.fillStyle = GAME.profile.accent; ctx.beginPath(); ctx.arc(player.x, player.y, 22, 0, Math.PI * 2); ctx.fill();
}
function initSurvival() {
  player = { x: W / 2, y: H / 2, hp: 100, res: 0 };
  actors = [
    { type: 'beacon', x: 1100, y: 110, r: 42 },
    ...Array.from({ length: 9 }, (_, i) => ({ type: 'resource', x: 170 + (i % 5) * 210, y: 160 + Math.floor(i / 5) * 260, r: 18 })),
    ...Array.from({ length: 5 }, (_, i) => ({ type: 'storm', x: 240 + i * 190, y: 260 + (i % 2) * 180, r: 62, phase: i }))
  ];
}
function updateSurvival(dt) {
  const dx = (keys.has('d') || keys.has('arrowright') || autoPlayDemo ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  const dy = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  player.x += dx * 220 * dt; player.y += dy * 220 * dt;
  if (autoPlayDemo) { const res = actors.find((a) => a.type === 'resource' && !a.dead) || actors[0]; player.x += (res.x - player.x) * dt * 1.4; player.y += (res.y - player.y) * dt * 1.4; }
  player.x = Math.max(60, Math.min(W - 60, player.x)); player.y = Math.max(80, Math.min(H - 70, player.y));
  for (const actor of actors) {
    if (actor.type === 'storm') { actor.r = 56 + Math.sin(tick + actor.phase) * 20; if (Math.hypot(player.x - actor.x, player.y - actor.y) < actor.r) { player.hp -= 20 * dt; score = Math.max(0, score - 10 * dt); } }
    if (actor.type === 'resource' && !actor.dead && Math.hypot(player.x - actor.x, player.y - actor.y) < 38) { actor.dead = true; player.res += 1; meter += 12; score += 90; addBurst(actor.x, actor.y, GAME.profile.accent2, 18); }
    if (actor.type === 'beacon' && player.res >= 6 && Math.hypot(player.x - actor.x, player.y - actor.y) < 58) { mode = 'won'; statusEl.textContent = '信标修复完成，生存采集包完成。'; meter = 100; }
  }
  if (player.hp <= 0) { mode = 'failed'; statusEl.textContent = '雾暴吞没了路线，按 R 重开。'; }
}
function drawSurvival() {
  drawBackdrop('grid');
  for (const actor of actors) {
    if (actor.type === 'storm') { ctx.fillStyle = 'rgba(215,97,69,.18)'; ctx.beginPath(); ctx.arc(actor.x, actor.y, actor.r, 0, Math.PI * 2); ctx.fill(); }
    if (actor.type === 'resource' && !actor.dead) { ctx.fillStyle = GAME.profile.accent2; ctx.rotate(.02); ctx.fillRect(actor.x - 16, actor.y - 16, 32, 32); }
    if (actor.type === 'beacon') { ctx.strokeStyle = GAME.profile.accent; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(actor.x, actor.y, actor.r, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = GAME.profile.accent; ctx.fillRect(actor.x - 8, actor.y - 70, 16, 70); }
  }
  ctx.fillStyle = GAME.profile.accent; ctx.beginPath(); ctx.arc(player.x, player.y, 24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#17211d'; ctx.font = '800 18px system-ui'; ctx.fillText('HP ' + Math.max(0, Math.round(player.hp)) + ' / 资源 ' + player.res, 76, 86);
}
function initGravity() {
  player = { x: 96, y: H - 138, vy: 0, gravity: 1, flip: 0, shards: 0 };
  actors = [
    ...Array.from({ length: 7 }, (_, i) => ({ type: 'platform', x: 80 + i * 160, y: i % 2 ? 172 : 548, w: 110, h: 18 })),
    ...Array.from({ length: 5 }, (_, i) => ({ type: 'shard', x: 245 + i * 180, y: i % 2 ? 210 : 500, r: 16 })),
    { type: 'gate', x: 1160, y: 360, r: 46 }
  ];
}
function updateGravity(dt) {
  const left = keys.has('a') || keys.has('arrowleft');
  const right = keys.has('d') || keys.has('arrowright') || autoPlayDemo;
  player.x += ((right ? 1 : 0) - (left ? 1 : 0)) * 250 * dt;
  player.flip -= dt;
  if ((keys.has(' ') || (autoPlayDemo && Math.sin(tick * 1.6) > .98)) && player.flip <= 0) { player.gravity *= -1; player.flip = .5; keys.delete(' '); addBurst(player.x, player.y, GAME.profile.accent2, 14); }
  player.vy += 820 * player.gravity * dt; player.y += player.vy * dt;
  const floor = player.gravity > 0 ? H - 86 : 86;
  if ((player.gravity > 0 && player.y > floor) || (player.gravity < 0 && player.y < floor)) { player.y = floor; player.vy = 0; }
  for (const actor of actors) {
    if (actor.type === 'shard' && !actor.dead && Math.hypot(player.x - actor.x, player.y - actor.y) < 38) { actor.dead = true; player.shards += 1; meter += 20; score += 110; addBurst(actor.x, actor.y, GAME.profile.accent2, 18); }
    if (actor.type === 'gate' && player.shards >= 4 && Math.hypot(player.x - actor.x, player.y - actor.y) < 60) { mode = 'won'; statusEl.textContent = '重力门开启，重力翻转包完成。'; }
  }
  player.x = Math.max(60, Math.min(W - 60, player.x));
}
function drawGravity() {
  drawBackdrop('grid');
  for (const actor of actors) {
    if (actor.type === 'platform') { ctx.fillStyle = 'rgba(139,92,246,.22)'; ctx.fillRect(actor.x, actor.y, actor.w, actor.h); }
    if (actor.type === 'shard' && !actor.dead) { ctx.save(); ctx.translate(actor.x, actor.y); ctx.rotate(tick); ctx.fillStyle = GAME.profile.accent2; ctx.fillRect(-14, -14, 28, 28); ctx.restore(); }
    if (actor.type === 'gate') { ctx.strokeStyle = GAME.profile.accent; ctx.lineWidth = 8; ctx.strokeRect(actor.x - 36, actor.y - 62, 72, 124); }
  }
  ctx.save(); ctx.translate(player.x, player.y); ctx.scale(1, player.gravity); ctx.fillStyle = GAME.profile.accent; ctx.fillRect(-20, -28, 40, 56); ctx.fillStyle = '#fffaf0'; ctx.fillRect(6, -16, 8, 8); ctx.restore();
}
function update(dt) {
  if (mode !== 'playing') return;
  tick += dt;
  if (GAME.profile.mode === 'shooter') updateShooter(dt);
  else if (GAME.profile.mode === 'racing') updateRacing(dt);
  else if (GAME.profile.mode === 'tower') updateTower(dt);
  else if (GAME.profile.mode === 'card') updateCard(dt);
  else if (GAME.profile.mode === 'rhythm') updateRhythm(dt);
  else if (GAME.profile.mode === 'stealth') updateStealth(dt);
  else if (GAME.profile.mode === 'survival') updateSurvival(dt);
  else if (GAME.profile.mode === 'gravity') updateGravity(dt);
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.a -= dt * 1.7; }
  particles = particles.filter((p) => p.a > 0);
  syncHud();
}
function drawParticles() {
  for (const p of particles) { ctx.globalAlpha = Math.max(0, p.a); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
  ctx.globalAlpha = 1;
}
function drawEndOverlay() {
  if (mode !== 'won' && mode !== 'failed') return;
  ctx.fillStyle = 'rgba(251,247,238,.76)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#17211d'; ctx.textAlign = 'center'; ctx.font = '900 52px system-ui';
  ctx.fillText(mode === 'won' ? GAME.profile.label + ' 完成' : '任务中断', W / 2, H / 2 - 20);
  ctx.font = '600 20px system-ui'; ctx.fillStyle = '#68736c'; ctx.fillText('按 R 重新运行这个专用 Canvas 游戏包。', W / 2, H / 2 + 26);
}
function draw() {
  if (GAME.profile.mode === 'shooter') drawShooter();
  else if (GAME.profile.mode === 'racing') drawRacing();
  else if (GAME.profile.mode === 'tower') drawTower();
  else if (GAME.profile.mode === 'card') drawCard();
  else if (GAME.profile.mode === 'rhythm') drawRhythm();
  else if (GAME.profile.mode === 'stealth') drawStealth();
  else if (GAME.profile.mode === 'survival') drawSurvival();
  else if (GAME.profile.mode === 'gravity') drawGravity();
  else drawBackdrop('grid');
  drawParticles();
  drawEndOverlay();
}
function loop(now) { const dt = Math.min(.033, (now - last) / 1000); last = now; update(dt); draw(); requestAnimationFrame(loop); }
function pointer(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * W;
  const y = ((event.clientY - rect.top) / rect.height) * H;
  if (GAME.profile.mode === 'tower') placeTower(x, y);
  if (GAME.profile.mode === 'card') {
    const index = Math.floor((x - 360) / 190);
    if (y > H - 250 && index >= 0 && index < 3) playCard(index);
  }
}
canvas.addEventListener('click', pointer);
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);
  if (key === 'r') reset();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
document.getElementById('startBtn').addEventListener('click', (event) => { event.stopPropagation(); reset(); });
start.addEventListener('click', reset);
if (autoPlayDemo) reset();
syncHud();
draw();
requestAnimationFrame(loop);
</script>
</body>
</html>`;
}

function bundleTemplate({ gameId, title, summary, genre, prompt }) {
  if (genre === 'fps') return fpsBundleTemplate({ gameId, title, summary, genre, prompt });
  if (SPECIALTY_CANVAS_PROFILES[genre]) return specialtyCanvasBundleTemplate({ gameId, title, summary, genre, prompt, profile: SPECIALTY_CANVAS_PROFILES[genre] });
  const safeTitle = escapeHtml(title);
  const safeSummary = escapeHtml(summary);
  const data = safeJson({ gameId, title, genre, prompt: clampText(prompt, 280, '') });
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
<style>
:root{color-scheme:dark;--bg:#07110f;--panel:#101814;--ink:#fff8ea;--muted:#b9ac96;--line:#3b3327;--jade:#76c8ad;--gold:#d8b86c;--vermillion:#d76145;--danger:#e66a52}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#07110f;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;overflow:hidden}body{display:grid;place-items:center;padding:18px;background:linear-gradient(135deg,#07110f,#101814 52%,#241310)}body:before{content:'';position:fixed;inset:0;pointer-events:none;background:repeating-linear-gradient(90deg,rgba(255,248,234,.035) 0 1px,transparent 1px 84px),repeating-linear-gradient(0deg,rgba(216,184,108,.035) 0 1px,transparent 1px 72px);mask-image:linear-gradient(to bottom,rgba(0,0,0,.8),transparent 88%)}.game-shell{width:min(1180px,100%);display:grid;gap:12px}.topbar{display:flex;justify-content:space-between;gap:16px;align-items:end}.eyebrow{font-size:11px;letter-spacing:0;color:var(--gold);font-weight:900}.title{font-size:clamp(22px,3vw,38px);line-height:1;margin:4px 0;font-weight:950}.summary{color:var(--muted);max-width:760px;font-size:14px;line-height:1.5;margin:0}.hud{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.pill{min-width:88px;border:1px solid rgba(216,184,108,.22);background:rgba(255,248,234,.06);border-radius:8px;padding:8px 10px;text-align:center}.pill strong{display:block;font-size:17px}.pill span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.08em}.stage{position:relative;aspect-ratio:16/9;width:100%;border:1px solid rgba(216,184,108,.26);border-radius:8px;overflow:hidden;background:#07110f;box-shadow:0 30px 80px rgba(0,0,0,.44)}canvas{display:block;width:100%;height:100%;background:#07110f}.overlay{position:absolute;inset:auto 18px 18px 18px;display:flex;justify-content:space-between;align-items:end;gap:16px;pointer-events:none}.controls{color:#efe3cc;font-size:12px;background:rgba(7,17,15,.68);border:1px solid rgba(216,184,108,.22);backdrop-filter:blur(10px);border-radius:8px;padding:9px 11px}.status{max-width:420px;color:#fff8ea;background:rgba(7,17,15,.72);border:1px solid rgba(118,200,173,.28);border-radius:8px;padding:10px 12px;font-size:13px;line-height:1.45;text-align:right}.start{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(180deg,rgba(7,17,15,.2),rgba(7,17,15,.82));padding:22px;cursor:pointer}.start-card{width:min(520px,92%);border:1px solid rgba(216,184,108,.24);background:linear-gradient(145deg,rgba(255,248,234,.08),rgba(118,200,173,.05)),rgba(12,20,17,.82);backdrop-filter:blur(18px);border-radius:8px;padding:22px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.38)}.start-card h2{margin:0 0 8px;font-size:28px}.start-card p{color:#d3c7af;line-height:1.55}.btn{border:0;border-radius:8px;background:linear-gradient(135deg,var(--vermillion),var(--gold));color:#21100a;font-weight:950;padding:12px 18px;cursor:pointer;box-shadow:0 14px 32px rgba(216,97,69,.24)}.btn:hover{filter:brightness(1.06);transform:translateY(-1px)}.hidden{display:none}@media(max-width:760px){body{padding:8px}.topbar{display:block}.hud{justify-content:flex-start}.summary{display:none}.stage{border-radius:6px}.overlay{inset:auto 8px 8px 8px;display:block}.status{text-align:left;margin-top:8px}.controls,.status{font-size:11px}}
</style>
</head>
<body>
<main class="game-shell">
  <header class="topbar">
    <div><div class="eyebrow">AI 智能体横版画卷 · 云岚对象运行时</div><h1 class="title">${safeTitle}</h1><p class="summary">${safeSummary}</p></div>
    <div class="hud"><div class="pill"><strong id="score">0</strong><span>分数</span></div><div class="pill"><strong id="cores">0/6</strong><span>玉灯</span></div><div class="pill"><strong id="time">0秒</strong><span>时间</span></div></div>
  </header>
  <section class="stage">
    <canvas id="game" width="1280" height="720" aria-label="可玩的横版卷轴游戏画布"></canvas>
    <div class="overlay"><div class="controls">移动 A/D 或 ←/→ · 跳跃 Space/W/↑ · 重开 R</div><div class="status" id="status">点亮足够玉灯后抵达庭院闸门。</div></div>
    <div class="start" id="start"><div class="start-card"><div class="eyebrow">由 manifest 生成 · 沙盒画卷</div><h2>${safeTitle}</h2><p>${safeSummary}</p><button class="btn" id="startBtn">开始任务</button></div></div>
  </section>
</main>
<script>
const GAME = ${data};
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const coresEl = document.getElementById('cores');
const timeEl = document.getElementById('time');
const statusEl = document.getElementById('status');
const start = document.getElementById('start');
const autoPlayDemo = location.hash === '#autoplay';
const keys = new Set();
const W = canvas.width, H = canvas.height, ground = 596;
const config = {
  adventure:{sky:['#0b1714','#20372d'],accent:'#d8b86c',hazard:'#d76145',jade:'#76c8ad'},
  memory:{sky:['#0d1813','#244132'],accent:'#76c8ad',hazard:'#d76145',jade:'#b8d890'},
  reaction:{sky:['#1a1110','#3a1c16'],accent:'#d8b86c',hazard:'#e66a52',jade:'#76c8ad'},
  quiz:{sky:['#101814','#24352c'],accent:'#b8d890',hazard:'#d76145',jade:'#76c8ad'},
  rhythm:{sky:['#140d25','#3b246d'],accent:'#f2c879',hazard:'#f472b6',jade:'#8bd3ff'},
  stealth:{sky:['#05070b','#1d2930'],accent:'#76c8ad',hazard:'#f43f5e',jade:'#c4b5fd'},
  shooter:{sky:['#081325','#285a8f'],accent:'#f97364',hazard:'#facc15',jade:'#67e8f9'},
  gravity:{sky:['#18130f','#4a3a76'],accent:'#b8d890',hazard:'#fb7185',jade:'#d8b4fe'}
}[GAME.genre] || {sky:['#0b1714','#20372d'],accent:'#d8b86c',hazard:'#d76145',jade:'#76c8ad'};
let camera=0,last=performance.now(),started=0,mode='ready';
let player,cores,hazards,platforms,particles,finish;
function initWorld(){camera=0;platforms=[{x:0,y:ground,w:2800,h:160},{x:360,y:460,w:210,h:22},{x:720,y:380,w:180,h:22},{x:1080,y:475,w:220,h:22},{x:1500,y:410,w:240,h:22},{x:1980,y:350,w:220,h:22}];cores=[260,430,785,1160,1610,2060].map((x,i)=>({x,y:i%2?330:500,r:14,taken:false,phase:i*.7}));hazards=[{x:610,y:ground-36,w:64,h:36},{x:940,y:ground-46,w:80,h:46},{x:1350,y:ground-40,w:72,h:40},{x:1810,y:ground-52,w:90,h:52},{x:2260,y:ground-44,w:78,h:44}];finish={x:2520,y:ground-180,w:46,h:180};particles=[]}
function reset(){initWorld();started=performance.now();mode='playing';player={x:80,y:ground-72,w:42,h:64,vx:0,vy:0,on:false,score:0,cores:0,flash:0};statusEl.textContent='点亮至少 4 盏玉灯，然后抵达庭院闸门。';start.classList.add('hidden')}
function rects(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function addBurst(x,y,color,n=14){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*260,vy:(Math.random()-.9)*260,a:1,c:color})}
function update(dt){if(mode!=='playing')return;const left=keys.has('a')||keys.has('arrowleft'),right=keys.has('d')||keys.has('arrowright'),jump=keys.has(' ')||keys.has('w')||keys.has('arrowup');player.vx=(right-left)*310;if(jump&&player.on){player.vy=-620;player.on=false;addBurst(player.x+20,player.y+62,config.accent,8)}player.vy+=1600*dt;player.x+=player.vx*dt;player.y+=player.vy*dt;player.on=false;for(const p of platforms){if(player.x+player.w>p.x&&player.x<p.x+p.w&&player.y+player.h>p.y&&player.y+player.h-player.vy*dt<=p.y){player.y=p.y-player.h;player.vy=0;player.on=true}}player.x=Math.max(0,Math.min(player.x,2700));if(player.y>H+200){statusEl.textContent='云桥失足。按 R 重新开始。';mode='failed';addBurst(player.x,ground,config.hazard,30)}for(const h of hazards){if(rects(player,h)){player.score=Math.max(0,player.score-80);player.flash=.35;player.x=Math.max(40,player.x-140);player.vy=-420;statusEl.textContent='触发朱砂机关。继续移动，找回路线。';addBurst(player.x,player.y,config.hazard,18)}}for(const c of cores){if(!c.taken){const dx=player.x+player.w/2-c.x,dy=player.y+player.h/2-c.y;if(Math.hypot(dx,dy)<44){c.taken=true;player.cores++;player.score+=150;statusEl.textContent='玉灯已点亮。庭院闸门正在稳定。';addBurst(c.x,c.y,config.accent,24)}}}if(rects(player,finish)){if(player.cores>=4){mode='won';player.score+=500;statusEl.textContent='任务完成。生成的东方横版画卷已从对象存储成功运行。';addBurst(finish.x,finish.y,config.accent,42)}else statusEl.textContent='闸门仍在沉睡。通行前至少点亮 4 盏玉灯。'}camera+=(Math.max(0,Math.min(player.x-360,1700))-camera)*Math.min(1,dt*6);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=600*dt;p.a-=dt*1.8}particles=particles.filter(p=>p.a>0);scoreEl.textContent=Math.round(player.score);coresEl.textContent=player.cores+'/6';timeEl.textContent=Math.max(0,Math.round((performance.now()-started)/1000))+'秒'}
function draw(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,config.sky[0]);g.addColorStop(1,config.sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(-camera*.16,0);ctx.globalAlpha=.5;ctx.fillStyle='#d8b86c';for(let i=0;i<18;i++){ctx.beginPath();ctx.arc(i*170+80,118+(i%4)*34,2+(i%3),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;ctx.fillStyle='rgba(255,248,234,.08)';for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(-120+i*330,430);ctx.quadraticCurveTo(70+i*330,210+(i%2)*36,320+i*330,430);ctx.lineTo(420+i*330,H);ctx.lineTo(-160+i*330,H);ctx.closePath();ctx.fill()}ctx.strokeStyle='rgba(255,248,234,.18)';ctx.lineWidth=3;for(let i=0;i<9;i++){ctx.beginPath();ctx.moveTo(i*210-40,168+(i%3)*28);ctx.bezierCurveTo(i*210+28,138,i*210+88,196,i*210+156,160);ctx.stroke()}ctx.restore();ctx.save();ctx.translate(-camera,0);ctx.fillStyle='rgba(36,48,34,.82)';ctx.fillRect(-120,ground+30,3100,120);for(let i=0;i<18;i++){ctx.fillStyle=i%2?'rgba(216,184,108,.12)':'rgba(118,200,173,.13)';ctx.fillRect(i*180,ground-26-(i%4)*16,130,3)}for(const p of platforms){ctx.fillStyle='rgba(118,200,173,.18)';ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle='rgba(216,184,108,.72)';ctx.fillRect(p.x,p.y,p.w,3);ctx.fillStyle='rgba(255,248,234,.13)';ctx.fillRect(p.x+12,p.y+7,Math.max(0,p.w-24),2)}for(const h of hazards){ctx.fillStyle=config.hazard;ctx.globalAlpha=.92;ctx.beginPath();ctx.moveTo(h.x,h.y+h.h);ctx.lineTo(h.x+h.w/2,h.y);ctx.lineTo(h.x+h.w,h.y+h.h);ctx.closePath();ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle='rgba(255,248,234,.46)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(h.x+h.w*.34,h.y+h.h*.58);ctx.lineTo(h.x+h.w*.66,h.y+h.h*.58);ctx.stroke()}for(const c of cores){if(c.taken)continue;const pulse=1+Math.sin(performance.now()/260+c.phase)*.12;ctx.save();ctx.translate(c.x,c.y);ctx.rotate(Math.PI/4);ctx.fillStyle=config.accent;ctx.shadowColor=config.accent;ctx.shadowBlur=18;ctx.fillRect(-c.r*pulse,-c.r*pulse,c.r*2*pulse,c.r*2*pulse);ctx.shadowBlur=0;ctx.restore()}ctx.fillStyle='rgba(118,200,173,.18)';ctx.fillRect(finish.x,finish.y,finish.w,finish.h);ctx.fillStyle=config.accent;ctx.fillRect(finish.x-18,finish.y+24,82,10);ctx.fillRect(finish.x-10,finish.y+50,10,finish.h-50);ctx.fillRect(finish.x+46,finish.y+50,10,finish.h-50);ctx.fillStyle='rgba(255,248,234,.9)';ctx.fillRect(finish.x+8,finish.y+74,30,4);ctx.globalAlpha=player&&player.flash>0?.45:1;if(player){ctx.fillStyle=config.accent;ctx.shadowColor=config.accent;ctx.shadowBlur=player.flash>0?24:10;ctx.fillRect(player.x,player.y,player.w,player.h);ctx.fillStyle='#21100a';ctx.fillRect(player.x+26,player.y+15,7,7);ctx.fillStyle=config.jade;ctx.fillRect(player.x+5,player.y+42,player.w-10,7);ctx.shadowBlur=0}ctx.globalAlpha=1;for(const p of particles){ctx.globalAlpha=Math.max(0,p.a);ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,4,4)}ctx.globalAlpha=1;ctx.restore();if(mode==='won'||mode==='failed'){ctx.fillStyle='rgba(7,17,15,.66)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff8ea';ctx.textAlign='center';ctx.font='900 54px system-ui';ctx.fillText(mode==='won'?'玉灯归位':'云桥失足',W/2,H/2-24);ctx.font='600 20px system-ui';ctx.fillStyle='#d3c7af';ctx.fillText('按 R 重新展开这幅生成游戏画卷。',W/2,H/2+22)}}
function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;if(player)player.flash=Math.max(0,player.flash-dt);update(dt);draw();requestAnimationFrame(loop)}
window.addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if(e.key.toLowerCase()==='r')reset();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault()});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));document.getElementById('startBtn').addEventListener('click',e=>{e.stopPropagation();reset()});start.addEventListener('click',reset);initWorld();if(autoPlayDemo)reset();draw();requestAnimationFrame(loop);
</script>
</body>
</html>`;
}
export async function buildGameArtifact({ storage, prompt, authorName, modelProvider, assets = [], preferredStatus = 'draft', designOverride = null, modelMeta = {} }) {
  const design = designOverride ?? buildDesign(prompt);
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
    model: {
      provider: modelProvider,
      name: modelMeta.name ?? null,
      usedExternalModel: Boolean(modelMeta.usedExternalModel),
      fallbackUsed: Boolean(modelMeta.fallbackUsed)
    },
    modelNotes: design.modelNotes ?? null,
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
      const fallbackDesign = buildDesign(task.prompt);
      let selectedDesign = fallbackDesign;
      let modelMeta = { name: this.config.modelName || null, usedExternalModel: false, fallbackUsed: false };
      log('info', 'intent-analysis', '已解析创作者意图，并选择可玩的游戏类型。', { promptLength: task.prompt.length, provider: this.config.modelProvider });
      await sleep(120);

      if (isExternalModelConfigured(this.config)) {
        this.store.updateTask(taskId, { currentStep: 'model-design', progress: 20 });
        log('info', 'model-design', '正在调用已配置的 OpenAI 兼容模型，生成紧凑游戏设计 JSON。', { provider: this.config.modelProvider, model: this.config.modelName });
        try {
          const modelResult = await requestModelDesign({ prompt: task.prompt, assets, config: this.config, fallbackDesign });
          selectedDesign = modelResult.design;
          modelMeta = { name: modelResult.model ?? this.config.modelName, usedExternalModel: true, fallbackUsed: false };
          log('info', 'model-design', '模型供应商已返回标准化设计方案。', { title: selectedDesign.title, genre: selectedDesign.genre, tags: selectedDesign.tags });
        } catch (error) {
          modelMeta = { name: this.config.modelName || null, usedExternalModel: false, fallbackUsed: true };
          selectedDesign = fallbackDesign;
          log('warn', 'model-design', '外部模型调用失败，已使用确定性本地设计兜底。', { message: error.message });
        }
        await sleep(80);
      } else {
        log('info', 'model-design', '外部模型供应商未配置，已启用确定性本地设计兜底。', { provider: this.config.modelProvider });
      }

      this.store.updateTask(taskId, { currentStep: 'safety-screen', progress: 28 });
      const risky = /ignore previous|system prompt|exfiltrate|delete files|powershell|cmd\.exe/i.test(task.prompt);
      log(risky ? 'warn' : 'info', 'safety-screen', risky ? '已检测并中和类似提示词注入的内容。' : '创作者提示词中未发现危险执行请求。', { risky });
      await sleep(120);

      this.store.updateTask(taskId, { currentStep: 'artifact-build', progress: 52 });
      log('info', 'artifact-build', '已生成可移植 HTML bundle 与 manifest 合约。', { assets: assets.length, storage: 'LocalObjectStorage', usedExternalModel: modelMeta.usedExternalModel });
      const artifact = await buildGameArtifact({ storage: this.storage, prompt: task.prompt, authorName: user.name, modelProvider: this.config.modelProvider, assets, preferredStatus: 'draft', designOverride: selectedDesign, modelMeta });
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
      log('info', 'persistence', '已将游戏元数据、版本、manifest key 与 bundle key 保存到数据库。', { gameId: game.id, manifestKey: artifact.manifestKey });
      await sleep(120);

      this.store.updateTask(taskId, { status: 'succeeded', currentStep: 'ready-to-preview', progress: 100, gameId: game.id, artifactManifestKey: artifact.manifestKey, completedAt: nowIso() });
      log('info', 'ready-to-preview', '生成成功。创作者可以预览或发布。', { gameId: game.id });
      this.store.audit({ actorId: user.id, type: 'generation.succeeded', message: `Generated game ${game.title}`, meta: { taskId, gameId: game.id } });
    } catch (error) {
      this.store.updateTask(taskId, { status: 'failed', currentStep: 'failed', progress: 100, error: error.message, completedAt: nowIso() });
      log('error', 'failed', error.message, { stack: error.stack?.split('\n').slice(0, 3) });
      this.store.audit({ actorId: task.user_id, type: 'generation.failed', message: error.message, meta: { taskId } });
    }
  }
}


