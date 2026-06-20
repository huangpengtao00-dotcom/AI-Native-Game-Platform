import { DEMO_GAME_BLUEPRINTS, buildDesign, buildGameArtifact } from './agent.mjs';
import { nowIso } from './util.mjs';

export async function seedDemoData({ store, storage, config }) {
  if (!store.getUserByEmail('creator@example.com')) {
    store.createUser({ email: 'creator@example.com', password: 'password123', name: '演示创作者', role: 'creator' });
  }
  if (!store.getUserByEmail('player@example.com')) {
    store.createUser({ email: 'player@example.com', password: 'password123', name: '演示玩家', role: 'player' });
  }
  refreshDemoAccountNames(store);
  const creator = store.getUserByEmail('creator@example.com');
  const existing = store.listGames({ status: '' });
  const existingTitles = new Set(existing.map((game) => game.title));
  for (const blueprint of DEMO_GAME_BLUEPRINTS) {
    if (existingTitles.has(blueprint.title)) continue;
    await createPublishedCreateFlowGame({ store, storage, config, creator, blueprint });
    existingTitles.add(blueprint.title);
  }

  await ensureLocalizedDemoGame({ store, storage, config, creator });

  store.audit({
    actorId: creator.id,
    type: 'seed.completed',
    message: 'Seeded demo accounts and 15 website-generation style published games.',
    meta: { minimumGames: 15, createFlowGames: DEMO_GAME_BLUEPRINTS.length }
  });
}

function refreshDemoAccountNames(store) {
  const updatedAt = nowIso();
  store.run("UPDATE users SET name = '演示创作者', updated_at = $updatedAt WHERE email = 'creator@example.com'", { $updatedAt: updatedAt });
  store.run("UPDATE users SET name = '演示玩家', updated_at = $updatedAt WHERE email = 'player@example.com'", { $updatedAt: updatedAt });
}

async function ensureLocalizedDemoGame({ store, storage, config, creator }) {
  const published = store.listGames({ status: 'published' });
  const hasLocalizedGame = published.some((game) => /中文演示|云岚|横版|玉灯|智能体|朱砂|庭院/.test([game.title, game.summary, ...(game.tags || [])].join(' ')));
  if (hasLocalizedGame) return null;
  return createPublishedSeedGame({
    store,
    storage,
    config,
    creator,
    origin: 'seed-cn',
    prompt: '中文演示：创建一个高级现代东方横版卷轴游戏。玩家穿过云岚庭院，在玉桥间跳跃，点亮玉灯，避开朱砂机关，并抵达最终闸门。'
  });
}

async function createPublishedSeedGame({ store, storage, config, creator, prompt, origin }) {
  const artifact = await buildGameArtifact({ storage, prompt, authorName: creator.name, modelProvider: config.modelProvider, assets: [], preferredStatus: 'published' });
  return store.createGameWithVersion({
    title: artifact.design.title,
    summary: artifact.design.summary,
    tags: artifact.design.tags,
    authorId: creator.id,
    authorName: creator.name,
    origin,
    status: 'published',
    prompt,
    manifestKey: artifact.manifestKey,
    bundleKey: artifact.bundleKey,
    assetKeys: artifact.assetKeys,
    modelProvider: config.modelProvider,
    coverGradient: artifact.coverGradient
  });
}

async function createPublishedCreateFlowGame({ store, storage, config, creator, blueprint }) {
  const design = buildDesign(blueprint.prompt, { genre: blueprint.genre, title: blueprint.title });
  const task = store.createTask({ userId: creator.id, title: blueprint.title, prompt: blueprint.prompt });
  store.addLog({ taskId: task.id, level: 'info', step: 'queued', message: '网站创作请求已提交，用于预生产面试演示游戏。', meta: { seeded: true, source: 'website-create-flow' } });
  store.addLog({ taskId: task.id, level: 'info', step: 'intent-analysis', message: `已解析创作者意图，并选择 ${blueprint.genre} 类型。`, meta: { genre: blueprint.genre } });
  store.addLog({ taskId: task.id, level: 'info', step: 'model-design', message: '已生成标准化游戏设计方案，等待构建可玩产物。', meta: { title: design.title, tags: design.tags } });
  store.addLog({ taskId: task.id, level: 'info', step: 'artifact-build', message: '已将 bundle 与 manifest 生成到对象存储。', meta: { storage: 'LocalObjectStorage', runtime: 'sandboxed-html-v1' } });

  const artifact = await buildGameArtifact({
    storage,
    prompt: blueprint.prompt,
    authorName: creator.name,
    modelProvider: config.modelProvider,
    assets: [],
    preferredStatus: 'published',
    designOverride: design,
    modelMeta: { name: config.modelName || null, usedExternalModel: false, fallbackUsed: false }
  });
  const game = store.createGameWithVersion({
    title: artifact.design.title,
    summary: artifact.design.summary,
    tags: artifact.design.tags,
    authorId: creator.id,
    authorName: creator.name,
    origin: 'create-agent',
    status: 'published',
    prompt: blueprint.prompt,
    manifestKey: artifact.manifestKey,
    bundleKey: artifact.bundleKey,
    assetKeys: artifact.assetKeys,
    modelProvider: config.modelProvider,
    coverGradient: artifact.coverGradient
  });
  store.updateTask(task.id, {
    status: 'succeeded',
    currentStep: 'ready-to-preview',
    progress: 100,
    gameId: game.id,
    artifactManifestKey: game.manifest_key,
    completedAt: nowIso()
  });
  store.addLog({ taskId: task.id, level: 'info', step: 'published', message: '网站生成风格游戏已发布，并可在大厅直接试玩。', meta: { gameId: game.id, genre: blueprint.genre } });
  store.audit({ actorId: creator.id, type: 'seed.create_flow_game', message: `Seeded website-generation game ${game.title}`, meta: { gameId: game.id, taskId: task.id, genre: blueprint.genre } });
  return game;
}
