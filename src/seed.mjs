import { buildGameArtifact } from './agent.mjs';
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
  const hasCreatePublished = existing.some((game) => game.origin === 'create-agent' && game.status === 'published');

  const seedPrompts = [
    '创建一个记忆主题横版挑战：迷路机关偶正在修复云岚庭院，玩家需要点亮玉灯并抵达出口。',
    '制作一个反应横版游戏：玩家需要在倒计时结束前稳定朱砂机关阵，点亮玉灯并抵达终点闸门。'
  ];
  const createPrompt = '制作一个互动横版冒险：智能体探索漂浮档案馆，并通过创作流程发布到游戏大厅。';

  for (const prompt of seedPrompts.slice(0, Math.max(0, 3 - existing.length - (hasCreatePublished ? 0 : 1)))) {
    await createPublishedSeedGame({ store, storage, config, creator, prompt, origin: 'seed' });
  }

  if (!hasCreatePublished) {
    await createPublishedCreateFlowGame({ store, storage, config, creator, prompt: createPrompt });
  }

  await ensureLocalizedDemoGame({ store, storage, config, creator });

  store.audit({ actorId: creator.id, type: 'seed.completed', message: 'Seeded demo accounts, published games, and one Create-flow published game.', meta: { minimumGames: 3, createFlowGame: true } });
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

async function createPublishedCreateFlowGame({ store, storage, config, creator, prompt }) {
  const task = store.createTask({ userId: creator.id, title: '种子创作流程冒险', prompt });
  store.addLog({ taskId: task.id, level: 'info', step: 'queued', message: '种子创作任务已排队，用于演示完整生成循环。' });
  store.addLog({ taskId: task.id, level: 'info', step: 'intent-analysis', message: '已解析创作者意图，并选择横版冒险类型。', meta: { seeded: true } });
  store.addLog({ taskId: task.id, level: 'info', step: 'artifact-build', message: '已将 bundle 与 manifest 生成到对象存储。', meta: { storage: 'LocalObjectStorage' } });

  const game = await createPublishedSeedGame({ store, storage, config, creator, prompt, origin: 'create-agent' });
  store.updateTask(task.id, {
    status: 'succeeded',
    currentStep: 'ready-to-preview',
    progress: 100,
    gameId: game.id,
    artifactManifestKey: game.manifest_key,
    completedAt: nowIso()
  });
  store.addLog({ taskId: task.id, level: 'info', step: 'published', message: '种子创作流程游戏已发布，并可在首页看到。', meta: { gameId: game.id } });
  store.audit({ actorId: creator.id, type: 'seed.create_flow_game', message: `Seeded published Create-flow game ${game.title}`, meta: { gameId: game.id, taskId: task.id } });
  return game;
}
