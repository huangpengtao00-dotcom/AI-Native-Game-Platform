import { clampText, escapeHtml, id, nowIso, safeJson, safeSlug, sleep } from './util.mjs';
import { isExternalModelConfigured, requestModelDesign } from './model-provider.mjs';

const PALETTES = [
  'linear-gradient(135deg, #14532d 0%, #0f766e 45%, #fbbf24 100%)',
  'linear-gradient(135deg, #111827 0%, #155e75 42%, #f97316 100%)',
  'linear-gradient(135deg, #312e81 0%, #be123c 48%, #facc15 100%)',
  'linear-gradient(135deg, #0f172a 0%, #2563eb 45%, #22c55e 100%)'
];

function classifyPrompt(prompt) {
  const text = String(prompt ?? '').toLowerCase();
  if (/memory|card|\u8bb0\u5fc6|\u7ffb\u724c/.test(text)) return 'memory';
  if (/click|reaction|\u53cd\u5e94|\u70b9\u51fb|\u8eb2\u907f/.test(text)) return 'reaction';
  if (/quiz|\u95ee\u7b54|\u8c1c\u9898|\u63a8\u7406/.test(text)) return 'quiz';
  return 'adventure';
}

export function buildDesign(prompt) {
  const genre = classifyPrompt(prompt);
  const titleSeed = clampText(prompt, 48, '智能体任务').replace(/[\u3002.!?\uff1f].*$/, '');
  const title = titleSeed.length < 8 ? '智能体任务：信号奔跑' : titleSeed;
  const tags = genre === 'memory' ? ['记忆主题', '横版', '智能体生成'] : genre === 'reaction' ? ['反应', '街机', '智能体生成'] : genre === 'quiz' ? ['剧情主题', '横版', '智能体生成'] : ['冒险', '横版', '智能体生成'];
  const summaryMap = {
    memory: '一个带记忆主题的中文横版挑战，以可移植 Web 产物交付。',
    reaction: '一个带分数、计时和可重玩规则的中文横版反应游戏，由本地智能体编排器生成。',
    quiz: '一个带剧情主题、清晰目标和胜利条件的中文横版试玩体验。',
    adventure: '一个可玩的中文横版平台冒险，可预览、发布，并从对象存储中运行。'
  };
  return { genre, title, tags, summary: summaryMap[genre], palette: PALETTES[Math.abs(title.length + prompt.length) % PALETTES.length] };
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
:root{color-scheme:dark;--bg:#05070b;--panel:#0d1320;--ink:#f8fafc;--muted:#9aa8ba;--line:#243044;--cyan:#55f0ff;--mint:#64f4ac;--gold:#ffd166;--danger:#ff5d73}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#05070b;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;overflow:hidden}body{display:grid;place-items:center;padding:18px;background:radial-gradient(circle at 18% 12%,rgba(85,240,255,.2),transparent 26%),radial-gradient(circle at 78% 8%,rgba(255,209,102,.16),transparent 24%),linear-gradient(135deg,#05070b,#0a1020 52%,#07120d)}.game-shell{width:min(1180px,100%);display:grid;gap:12px}.topbar{display:flex;justify-content:space-between;gap:16px;align-items:end}.eyebrow{font-size:11px;letter-spacing:0;color:var(--cyan);font-weight:900}.title{font-size:clamp(22px,3vw,38px);line-height:1;margin:4px 0;font-weight:950}.summary{color:var(--muted);max-width:760px;font-size:14px;line-height:1.5;margin:0}.hud{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.pill{min-width:88px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);border-radius:8px;padding:8px 10px;text-align:center}.pill strong{display:block;font-size:17px}.pill span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.08em}.stage{position:relative;aspect-ratio:16/9;width:100%;border:1px solid rgba(255,255,255,.16);border-radius:8px;overflow:hidden;background:#060912;box-shadow:0 30px 80px rgba(0,0,0,.4)}canvas{display:block;width:100%;height:100%;background:#070b12}.overlay{position:absolute;inset:auto 18px 18px 18px;display:flex;justify-content:space-between;align-items:end;gap:16px;pointer-events:none}.controls{color:#d8e3f0;font-size:12px;background:rgba(3,7,18,.62);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(10px);border-radius:8px;padding:9px 11px}.status{max-width:420px;color:#f8fafc;background:rgba(3,7,18,.7);border:1px solid rgba(85,240,255,.22);border-radius:8px;padding:10px 12px;font-size:13px;line-height:1.45;text-align:right}.start{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(180deg,rgba(5,7,11,.26),rgba(5,7,11,.78));padding:22px}.start-card{width:min(520px,92%);border:1px solid rgba(255,255,255,.16);background:rgba(9,15,26,.78);backdrop-filter:blur(18px);border-radius:8px;padding:22px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.36)}.start-card h2{margin:0 0 8px;font-size:28px}.start-card p{color:#b9c7d8;line-height:1.55}.btn{border:0;border-radius:8px;background:linear-gradient(135deg,var(--cyan),var(--mint));color:#031014;font-weight:950;padding:12px 18px;cursor:pointer}.btn:hover{filter:brightness(1.06)}.hidden{display:none}@media(max-width:760px){body{padding:8px}.topbar{display:block}.hud{justify-content:flex-start}.summary{display:none}.stage{border-radius:6px}.overlay{inset:auto 8px 8px 8px;display:block}.status{text-align:left;margin-top:8px}.controls,.status{font-size:11px}}
</style>
</head>
<body>
<main class="game-shell">
  <header class="topbar">
    <div><div class="eyebrow">AI 智能体横版游戏 · 对象存储运行时</div><h1 class="title">${safeTitle}</h1><p class="summary">${safeSummary}</p></div>
    <div class="hud"><div class="pill"><strong id="score">0</strong><span>分数</span></div><div class="pill"><strong id="cores">0/6</strong><span>核心</span></div><div class="pill"><strong id="time">0秒</strong><span>时间</span></div></div>
  </header>
  <section class="stage">
    <canvas id="game" width="1280" height="720" aria-label="可玩的横版卷轴游戏画布"></canvas>
    <div class="overlay"><div class="controls">移动 A/D 或 ←/→ · 跳跃 Space/W/↑ · 重开 R</div><div class="status" id="status">收集足够能量核心后抵达中继闸门。</div></div>
    <div class="start" id="start"><div class="start-card"><div class="eyebrow">由 manifest 生成</div><h2>${safeTitle}</h2><p>${safeSummary}</p><button class="btn" id="startBtn">开始任务</button></div></div>
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
  adventure:{sky:['#07111f','#10213b'],accent:'#55f0ff',hazard:'#ff5d73'},
  memory:{sky:['#08140f','#14351e'],accent:'#64f4ac',hazard:'#ff7a59'},
  reaction:{sky:['#080d17','#172554'],accent:'#55f0ff',hazard:'#ffd166'},
  quiz:{sky:['#110b1c','#2a1748'],accent:'#c084fc',hazard:'#ff5d73'}
}[GAME.genre] || {sky:['#07111f','#10213b'],accent:'#55f0ff',hazard:'#ff5d73'};
let camera=0,last=performance.now(),started=0,mode='ready';
let player,cores,hazards,platforms,particles,finish;
function initWorld(){camera=0;platforms=[{x:0,y:ground,w:2800,h:160},{x:360,y:460,w:210,h:22},{x:720,y:380,w:180,h:22},{x:1080,y:475,w:220,h:22},{x:1500,y:410,w:240,h:22},{x:1980,y:350,w:220,h:22}];cores=[260,430,785,1160,1610,2060].map((x,i)=>({x,y:i%2?330:500,r:14,taken:false,phase:i*.7}));hazards=[{x:610,y:ground-36,w:64,h:36},{x:940,y:ground-46,w:80,h:46},{x:1350,y:ground-40,w:72,h:40},{x:1810,y:ground-52,w:90,h:52},{x:2260,y:ground-44,w:78,h:44}];finish={x:2520,y:ground-180,w:46,h:180};particles=[]}
function reset(){initWorld();started=performance.now();mode='playing';player={x:80,y:ground-72,w:42,h:64,vx:0,vy:0,on:false,score:0,cores:0,flash:0};statusEl.textContent='收集至少 4 个能量核心，然后抵达中继闸门。';start.classList.add('hidden')}
function rects(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function addBurst(x,y,color,n=14){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*260,vy:(Math.random()-.9)*260,a:1,c:color})}
function update(dt){if(mode!=='playing')return;const left=keys.has('a')||keys.has('arrowleft'),right=keys.has('d')||keys.has('arrowright'),jump=keys.has(' ')||keys.has('w')||keys.has('arrowup');player.vx=(right-left)*310;if(jump&&player.on){player.vy=-620;player.on=false;addBurst(player.x+20,player.y+62,config.accent,8)}player.vy+=1600*dt;player.x+=player.vx*dt;player.y+=player.vy*dt;player.on=false;for(const p of platforms){if(player.x+player.w>p.x&&player.x<p.x+p.w&&player.y+player.h>p.y&&player.y+player.h-player.vy*dt<=p.y){player.y=p.y-player.h;player.vy=0;player.on=true}}player.x=Math.max(0,Math.min(player.x,2700));if(player.y>H+200){statusEl.textContent='信号丢失。按 R 重新开始。';mode='failed';addBurst(player.x,ground,config.hazard,30)}for(const h of hazards){if(rects(player,h)){player.score=Math.max(0,player.score-80);player.flash=.35;player.x=Math.max(40,player.x-140);player.vy=-420;statusEl.textContent='撞上危险物。继续移动，找回路线。';addBurst(player.x,player.y,config.hazard,18)}}for(const c of cores){if(!c.taken){const dx=player.x+player.w/2-c.x,dy=player.y+player.h/2-c.y;if(Math.hypot(dx,dy)<44){c.taken=true;player.cores++;player.score+=150;statusEl.textContent='已收集核心。中继闸门正在稳定。';addBurst(c.x,c.y,config.accent,24)}}}if(rects(player,finish)){if(player.cores>=4){mode='won';player.score+=500;statusEl.textContent='任务完成。生成的横版游戏已从对象存储成功运行。';addBurst(finish.x,finish.y,config.accent,42)}else statusEl.textContent='闸门已锁定。撤离前至少收集 4 个核心。'}camera+=(Math.max(0,Math.min(player.x-360,1700))-camera)*Math.min(1,dt*6);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=600*dt;p.a-=dt*1.8}particles=particles.filter(p=>p.a>0);scoreEl.textContent=Math.round(player.score);coresEl.textContent=player.cores+'/6';timeEl.textContent=Math.max(0,Math.round((performance.now()-started)/1000))+'秒'}
function draw(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,config.sky[0]);g.addColorStop(1,config.sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(-camera*.28,0);for(let i=0;i<24;i++){ctx.fillStyle=i%3?'rgba(85,240,255,.08)':'rgba(255,209,102,.09)';ctx.fillRect(i*160+40,90+(i%5)*38,70,2)}ctx.restore();ctx.save();ctx.translate(-camera,0);for(let i=0;i<18;i++){ctx.fillStyle='rgba(255,255,255,.045)';ctx.fillRect(i*180,ground-34-(i%4)*18,130,2)}ctx.fillStyle='rgba(100,244,172,.14)';for(const p of platforms){ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(p.x,p.y,p.w,2);ctx.fillStyle='rgba(100,244,172,.14)'}for(const h of hazards){ctx.fillStyle=config.hazard;ctx.globalAlpha=.9;ctx.beginPath();ctx.moveTo(h.x,h.y+h.h);ctx.lineTo(h.x+h.w/2,h.y);ctx.lineTo(h.x+h.w,h.y+h.h);ctx.closePath();ctx.fill();ctx.globalAlpha=1}for(const c of cores){if(c.taken)continue;const pulse=1+Math.sin(performance.now()/260+c.phase)*.12;ctx.fillStyle=config.accent;ctx.shadowColor=config.accent;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(c.x,c.y,c.r*pulse,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}ctx.fillStyle='rgba(85,240,255,.16)';ctx.fillRect(finish.x,finish.y,finish.w,finish.h);ctx.fillStyle=config.accent;ctx.fillRect(finish.x+18,finish.y,10,finish.h);ctx.fillStyle='#f8fafc';ctx.fillRect(finish.x-18,finish.y+18,82,8);ctx.globalAlpha=player&&player.flash>0?.45:1;if(player){ctx.fillStyle=config.accent;ctx.shadowColor=config.accent;ctx.shadowBlur=player.flash>0?24:10;ctx.fillRect(player.x,player.y,player.w,player.h);ctx.fillStyle='#061018';ctx.fillRect(player.x+26,player.y+15,7,7);ctx.shadowBlur=0}ctx.globalAlpha=1;for(const p of particles){ctx.globalAlpha=Math.max(0,p.a);ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,4,4)}ctx.globalAlpha=1;ctx.restore();if(mode==='won'||mode==='failed'){ctx.fillStyle='rgba(3,7,18,.62)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#f8fafc';ctx.textAlign='center';ctx.font='900 54px system-ui';ctx.fillText(mode==='won'?'任务完成':'信号丢失',W/2,H/2-24);ctx.font='600 20px system-ui';ctx.fillStyle='#cbd5e1';ctx.fillText('按 R 重新开始这个生成游戏运行时。',W/2,H/2+22)}}
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


