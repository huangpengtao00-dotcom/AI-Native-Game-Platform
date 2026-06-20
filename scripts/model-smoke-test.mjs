import { buildDesign } from '../src/agent.mjs';
import { createConfig } from '../src/env.mjs';
import { isExternalModelConfigured, modelEndpoint, requestModelDesign } from '../src/model-provider.mjs';

const config = createConfig({ rootDir: process.cwd() });

if (!isExternalModelConfigured(config)) {
  console.log(JSON.stringify({
    ok: true,
    skipped: true,
    reason: 'MODEL_PROVIDER, MODEL_WIRE_API, MODEL_BASE_URL, MODEL_NAME, and MODEL_API_KEY are required for a live model smoke test.',
    provider: config.modelProvider,
    wireApi: config.modelWireApi
  }, null, 2));
  process.exit(0);
}

const fallbackDesign = buildDesign('Create a polished reaction game with a clear win state and safe sandbox runtime.');
const started = Date.now();
const result = await requestModelDesign({
  prompt: 'Create a compact browser reaction game for an AI Native game platform interview demo.',
  assets: [],
  config,
  fallbackDesign
});

console.log(JSON.stringify({
  ok: true,
  skipped: false,
  endpoint: modelEndpoint(config).replace(/^https?:\/\/([^/@]+@)?/i, 'https://'),
  provider: config.modelProvider,
  wireApi: config.modelWireApi,
  model: result.model,
  usedExternalModel: result.used,
  durationMs: Date.now() - started,
  design: result.design
}, null, 2));
