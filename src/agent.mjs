import { clampText, escapeHtml, id, nowIso, safeJson, safeSlug, sleep } from './util.mjs';
import { isExternalModelConfigured, requestModelDesign } from './model-provider.mjs';

const GENRE_LIBRARY = {
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
  }
};

function classifyPrompt(prompt) {
  const text = String(prompt ?? '').toLowerCase();
  if (/rhythm|music|beat|combo|\u8282\u594f|\u97f3\u4e50|\u8fde\u51fb|\u8282\u62cd/.test(text)) return 'rhythm';
  if (/stealth|shadow|sneak|\u6f5c\u884c|\u6697\u5f71|\u5de1\u903b|\u8eb2\u85cf/.test(text)) return 'stealth';
  if (/shooter|bullet|flight|shoot|\u5c04\u51fb|\u5f39\u5e55|\u98de\u884c|\u661f\u69ce/.test(text)) return 'shooter';
  if (/gravity|flip|\u91cd\u529b|\u7ffb\u8f6c|\u6d6e\u7a7a|\u53cd\u91cd\u529b/.test(text)) return 'gravity';
  if (/memory|card|\u8bb0\u5fc6|\u7ffb\u724c/.test(text)) return 'memory';
  if (/click|reaction|\u53cd\u5e94|\u70b9\u51fb|\u8eb2\u907f/.test(text)) return 'reaction';
  if (/quiz|puzzle|trivia|\u95ee\u7b54|\u8c1c\u9898|\u63a8\u7406|\u89e3\u8c1c/.test(text)) return 'quiz';
  return 'adventure';
}

export function buildDesign(prompt) {
  const genre = classifyPrompt(prompt);
  const titleSeed = clampText(prompt, 48, '智能体任务').replace(/[\u3002.!?\uff1f].*$/, '');
  const title = titleSeed.length < 8 ? '智能体任务：信号奔跑' : titleSeed;
  const preset = GENRE_LIBRARY[genre] ?? GENRE_LIBRARY.adventure;
  return { genre, title, tags: preset.tags, summary: preset.summary, palette: preset.palette };
}

function bundleTemplate({ gameId, title, summary, genre, prompt }) {
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
:root{color-scheme:dark;--bg:#07110f;--panel:#101814;--ink:#fff8ea;--muted:#b9ac96;--line:#3b3327;--jade:#76c8ad;--gold:#d8b86c;--vermillion:#d76145;--danger:#e66a52}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#07110f;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;overflow:hidden}body{display:grid;place-items:center;padding:18px;background:linear-gradient(135deg,#07110f,#101814 52%,#241310)}body:before{content:'';position:fixed;inset:0;pointer-events:none;background:repeating-linear-gradient(90deg,rgba(255,248,234,.035) 0 1px,transparent 1px 84px),repeating-linear-gradient(0deg,rgba(216,184,108,.035) 0 1px,transparent 1px 72px);mask-image:linear-gradient(to bottom,rgba(0,0,0,.8),transparent 88%)}.game-shell{width:min(1180px,100%);display:grid;gap:12px}.topbar{display:flex;justify-content:space-between;gap:16px;align-items:end}.eyebrow{font-size:11px;letter-spacing:0;color:var(--gold);font-weight:900}.title{font-size:clamp(22px,3vw,38px);line-height:1;margin:4px 0;font-weight:950}.summary{color:var(--muted);max-width:760px;font-size:14px;line-height:1.5;margin:0}.hud{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.pill{min-width:88px;border:1px solid rgba(216,184,108,.22);background:rgba(255,248,234,.06);border-radius:8px;padding:8px 10px;text-align:center}.pill strong{display:block;font-size:17px}.pill span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.08em}.stage{position:relative;aspect-ratio:16/9;width:100%;border:1px solid rgba(216,184,108,.26);border-radius:8px;overflow:hidden;background:#07110f;box-shadow:0 30px 80px rgba(0,0,0,.44)}canvas{display:block;width:100%;height:100%;background:#07110f}.overlay{position:absolute;inset:auto 18px 18px 18px;display:flex;justify-content:space-between;align-items:end;gap:16px;pointer-events:none}.controls{color:#efe3cc;font-size:12px;background:rgba(7,17,15,.68);border:1px solid rgba(216,184,108,.22);backdrop-filter:blur(10px);border-radius:8px;padding:9px 11px}.status{max-width:420px;color:#fff8ea;background:rgba(7,17,15,.72);border:1px solid rgba(118,200,173,.28);border-radius:8px;padding:10px 12px;font-size:13px;line-height:1.45;text-align:right}.start{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(180deg,rgba(7,17,15,.2),rgba(7,17,15,.82));padding:22px}.start-card{width:min(520px,92%);border:1px solid rgba(216,184,108,.24);background:linear-gradient(145deg,rgba(255,248,234,.08),rgba(118,200,173,.05)),rgba(12,20,17,.82);backdrop-filter:blur(18px);border-radius:8px;padding:22px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.38)}.start-card h2{margin:0 0 8px;font-size:28px}.start-card p{color:#d3c7af;line-height:1.55}.btn{border:0;border-radius:8px;background:linear-gradient(135deg,var(--vermillion),var(--gold));color:#21100a;font-weight:950;padding:12px 18px;cursor:pointer;box-shadow:0 14px 32px rgba(216,97,69,.24)}.btn:hover{filter:brightness(1.06);transform:translateY(-1px)}.hidden{display:none}@media(max-width:760px){body{padding:8px}.topbar{display:block}.hud{justify-content:flex-start}.summary{display:none}.stage{border-radius:6px}.overlay{inset:auto 8px 8px 8px;display:block}.status{text-align:left;margin-top:8px}.controls,.status{font-size:11px}}
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
window.addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if(e.key.toLowerCase()==='r')reset();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault()});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));document.getElementById('startBtn').addEventListener('click',reset);initWorld();draw();requestAnimationFrame(loop);
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


