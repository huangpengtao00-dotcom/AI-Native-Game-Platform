import { buildGameArtifact } from './agent.mjs';

export async function seedDemoData({ store, storage, config }) {
  if (!store.getUserByEmail('creator@example.com')) {
    store.createUser({ email: 'creator@example.com', password: 'password123', name: 'Demo Creator', role: 'creator' });
  }
  if (!store.getUserByEmail('player@example.com')) {
    store.createUser({ email: 'player@example.com', password: 'password123', name: 'Demo Player', role: 'player' });
  }
  const creator = store.getUserByEmail('creator@example.com');
  const existing = store.listGames({ status: '' });
  if (existing.length >= 3) return;

  const prompts = [
    'Create a memory card challenge about lost robots repairing a neon greenhouse.',
    'Build a reaction game where players stabilize a starship before the timer ends.',
    'Make an interactive adventure about an agent exploring a floating archive.'
  ];
  for (const prompt of prompts) {
    const artifact = await buildGameArtifact({ storage, prompt, authorName: creator.name, modelProvider: config.modelProvider, assets: [], preferredStatus: 'published' });
    store.createGameWithVersion({
      title: artifact.design.title,
      summary: artifact.design.summary,
      tags: artifact.design.tags,
      authorId: creator.id,
      authorName: creator.name,
      origin: 'seed',
      status: 'published',
      prompt,
      manifestKey: artifact.manifestKey,
      bundleKey: artifact.bundleKey,
      assetKeys: artifact.assetKeys,
      modelProvider: config.modelProvider,
      coverGradient: artifact.coverGradient
    });
  }
  store.audit({ actorId: creator.id, type: 'seed.completed', message: 'Seeded demo accounts and three published games.', meta: { games: 3 } });
}