import assert from 'node:assert/strict';
import { buildDesign } from '../src/agent.mjs';
import { buildModelRequestBodies, extractModelText, modelEndpoint, normalizeModelDesign } from '../src/model-provider.mjs';

const baseConfig = {
  modelProvider: 'fighting',
  modelWireApi: 'responses',
  modelBaseUrl: 'https://provider.example.test/v1',
  modelName: 'gpt-5.5',
  modelApiKey: 'test-key',
  modelTimeoutMs: 1000,
  modelReasoningEffort: 'high',
  modelDisableResponseStorage: true
};

assert.equal(modelEndpoint(baseConfig), 'https://provider.example.test/v1/responses');
assert.equal(modelEndpoint({ ...baseConfig, modelBaseUrl: 'http://localhost:8080/v1/responses' }), 'http://localhost:8080/v1/responses');
assert.equal(modelEndpoint({ ...baseConfig, modelWireApi: 'chat-completions' }), 'https://provider.example.test/v1/chat/completions');

const bodies = buildModelRequestBodies({ prompt: 'Create a reaction game.', assets: [], config: baseConfig });
assert.equal(bodies.length, 2, 'Responses provider should have rich and minimal fallback bodies');
assert.equal(bodies[0].model, 'gpt-5.5');
assert.equal(bodies[0].store, false);
assert.equal(bodies[0].reasoning.effort, 'high');
assert.equal(bodies[0].text.format.type, 'json_object');
assert.match(JSON.stringify(bodies[1]), /Return only the JSON object/);

assert.equal(extractModelText({ output_text: '{"title":"A"}' }), '{"title":"A"}');
assert.equal(extractModelText({ choices: [{ message: { content: '{"title":"B"}' } }] }), '{"title":"B"}');
assert.equal(extractModelText({ output: [{ content: [{ text: '{"title":"C"}' }] }] }), '{"title":"C"}');
assert.equal(extractModelText({ response: { output_text: '{"title":"D"}' } }), '{"title":"D"}');

const fallback = buildDesign('Create a memory game.');
const normalized = normalizeModelDesign({ title: 'Model Arcade', genre: 'reaction', summary: 'Fast and safe.', tags: ['AI Fun', 'AI Fun', '../bad'], mechanics: 'Click fast.', visualDirection: 'Sharp dashboard.' }, fallback);
assert.equal(normalized.title, 'Model Arcade');
assert.equal(normalized.genre, 'reaction');
assert.deepEqual(normalized.tags, ['ai-fun', 'bad']);
assert.equal(normalized.modelNotes.mechanics, 'Click fast.');

console.log(JSON.stringify({ ok: true, providerContractAssertions: 15 }, null, 2));

