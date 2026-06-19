import { buildGameArtifact } from './agent.mjs';
import { nowIso } from './util.mjs';

export async function seedDemoData({ store, storage, config }) {
  if (!store.getUserByEmail('creator@example.com')) {
    store.createUser({ email: 'creator@example.com', password: 'password123', name: 'Demo Creator', role: 'creator' });
  }
  if (!store.getUserByEmail('player@example.com')) {
    store.createUser({ email: 'player@example.com', password: 'password123', name: 'Demo Player', role: 'player' });
  }
  const creator = store.getUserByEmail('creator@example.com');
  const existing = store.listGames({ status: '' });
  const hasCreatePublished = existing.some((game) => game.origin === 'create-agent' && game.status === 'published');

  const seedPrompts = [
    'Create a memory card challenge about lost robots repairing a neon greenhouse.',
    'Build a reaction game where players stabilize a starship before the timer ends.'
  ];
  const createPrompt = 'Make an interactive adventure about an agent exploring a floating archive, then publish it from the Create flow.';

  for (const prompt of seedPrompts.slice(0, Math.max(0, 3 - existing.length - (hasCreatePublished ? 0 : 1)))) {
    await createPublishedSeedGame({ store, storage, config, creator, prompt, origin: 'seed' });
  }

  if (!hasCreatePublished) {
    await createPublishedCreateFlowGame({ store, storage, config, creator, prompt: createPrompt });
  }

  store.audit({ actorId: creator.id, type: 'seed.completed', message: 'Seeded demo accounts, published games, and one Create-flow published game.', meta: { minimumGames: 3, createFlowGame: true } });
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
  const task = store.createTask({ userId: creator.id, title: 'Seeded Create Flow Adventure', prompt });
  store.addLog({ taskId: task.id, level: 'info', step: 'queued', message: 'Seeded Create task queued to demonstrate the full generation loop.' });
  store.addLog({ taskId: task.id, level: 'info', step: 'intent-analysis', message: 'Parsed creator intent and selected adventure genre.', meta: { seeded: true } });
  store.addLog({ taskId: task.id, level: 'info', step: 'artifact-build', message: 'Generated bundle and manifest into object storage.', meta: { storage: 'LocalObjectStorage' } });

  const game = await createPublishedSeedGame({ store, storage, config, creator, prompt, origin: 'create-agent' });
  store.updateTask(task.id, {
    status: 'succeeded',
    currentStep: 'ready-to-preview',
    progress: 100,
    gameId: game.id,
    artifactManifestKey: game.manifest_key,
    completedAt: nowIso()
  });
  store.addLog({ taskId: task.id, level: 'info', step: 'published', message: 'Seeded Create-flow game was published and is visible on Home.', meta: { gameId: game.id } });
  store.audit({ actorId: creator.id, type: 'seed.create_flow_game', message: `Seeded published Create-flow game ${game.title}`, meta: { gameId: game.id, taskId: task.id } });
  return game;
}
