import { clampText, safeSlug } from './util.mjs';

const ALLOWED_GENRES = new Set(['adventure', 'memory', 'reaction', 'quiz', 'rhythm', 'stealth', 'shooter', 'gravity']);
const RETRYABLE_PROVIDER_STATUS = new Set([400, 404, 422, 500, 502, 503, 504]);

function normalizeBaseUrl(value) {
  const base = String(value ?? '').trim();
  if (!base) return '';
  return base.replace(/\/+$/, '');
}

function normalizedWireApi(config) {
  const wire = String(config.modelWireApi ?? 'chat-completions').trim().toLowerCase();
  return wire === 'responses' ? 'responses' : 'chat-completions';
}

export function modelEndpoint(config) {
  const base = normalizeBaseUrl(config.modelBaseUrl);
  if (!base) return '';
  if (normalizedWireApi(config) === 'responses') {
    if (/\/responses$/i.test(base)) return base;
    return `${base}/responses`;
  }
  if (/\/chat\/completions$/i.test(base)) return base;
  return `${base}/chat/completions`;
}

export function isExternalModelConfigured(config) {
  return config.modelProvider !== 'local-deterministic-agent'
    && Boolean(String(config.modelApiKey ?? '').trim())
    && Boolean(String(config.modelName ?? '').trim())
    && Boolean(modelEndpoint(config));
}

function designSystemPrompt() {
  return [
    'You are a senior AI game designer embedded in an interview MVP.',
    'Return strict JSON only. No markdown.',
    'Allowed genres: adventure, memory, reaction, quiz, rhythm, stealth, shooter, gravity.',
    'Schema: {"title":string,"genre":string,"summary":string,"tags":string[],"mechanics":string,"visualDirection":string}.',
    'Keep the scope compact, playable in one HTML file, and safe for a sandboxed iframe.'
  ].join(' ');
}

function designUserPayload(prompt, assets) {
  return JSON.stringify({
    creatorPrompt: clampText(prompt, 2000, ''),
    uploadedAssets: assets.map((asset) => ({
      filename: asset.filename,
      mime: asset.mime,
      size: asset.size,
      sha256: asset.sha256
    }))
  });
}

export function buildModelRequestBodies({ prompt, assets = [], config }) {
  const system = designSystemPrompt();
  const user = designUserPayload(prompt, assets);
  if (normalizedWireApi(config) === 'responses') {
    const input = [
      { role: 'system', content: [{ type: 'input_text', text: system }] },
      { role: 'user', content: [{ type: 'input_text', text: user }] }
    ];
    const rich = {
      model: config.modelName,
      store: !config.modelDisableResponseStorage,
      input,
      text: { format: { type: 'json_object' } },
      ...(config.modelReasoningEffort ? { reasoning: { effort: config.modelReasoningEffort } } : {})
    };
    const minimal = {
      model: config.modelName,
      store: !config.modelDisableResponseStorage,
      input: `${system}\n\nCreator payload:\n${user}\n\nReturn only the JSON object.`
    };
    return [rich, minimal];
  }
  return [{
    model: config.modelName,
    temperature: 0.35,
    max_tokens: 650,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  }];
}

function extractJson(text) {
  const raw = String(text ?? '').trim();
  if (!raw) throw new Error('Model returned an empty response.');
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1]);
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error('Model response did not contain valid JSON.');
  }
}

export function extractModelText(payload) {
  if (typeof payload?.choices?.[0]?.message?.content === 'string') return payload.choices[0].message.content;
  if (typeof payload?.output_text === 'string') return payload.output_text;
  if (Array.isArray(payload?.output)) {
    return payload.output.flatMap((item) => {
      if (typeof item?.text === 'string') return [item.text];
      if (typeof item?.content === 'string') return [item.content];
      if (!Array.isArray(item?.content)) return [];
      return item.content.map((part) => {
        if (typeof part === 'string') return part;
        return part?.text ?? part?.content ?? '';
      });
    }).filter(Boolean).join('\n');
  }
  if (typeof payload?.content === 'string') return payload.content;
  if (typeof payload?.response?.output_text === 'string') return payload.response.output_text;
  if (Array.isArray(payload?.response?.output)) return extractModelText(payload.response);
  return '';
}

function normalizeTags(value, fallback) {
  const raw = Array.isArray(value) ? value : [];
  const tags = raw
    .map((tag) => safeSlug(tag, 'tag').slice(0, 24))
    .filter(Boolean)
    .filter((tag, index, list) => list.indexOf(tag) === index)
    .slice(0, 5);
  return tags.length ? tags : fallback;
}

export function normalizeModelDesign(value, fallbackDesign) {
  const title = clampText(value?.title, 72, fallbackDesign.title);
  const genre = ALLOWED_GENRES.has(String(value?.genre)) ? String(value.genre) : fallbackDesign.genre;
  const summary = clampText(value?.summary, 220, fallbackDesign.summary);
  const mechanics = clampText(value?.mechanics, 280, '');
  const visualDirection = clampText(value?.visualDirection, 180, '');
  const tags = normalizeTags(value?.tags, fallbackDesign.tags);
  return {
    ...fallbackDesign,
    genre,
    title,
    summary,
    tags,
    modelNotes: { mechanics, visualDirection }
  };
}

function providerErrorMessage(status, responseText) {
  let providerMessage = `Model provider returned HTTP ${status}.`;
  try {
    const parsed = JSON.parse(responseText);
    providerMessage = parsed?.error?.message ? `Model provider error: ${parsed.error.message}` : providerMessage;
  } catch {
    providerMessage = `${providerMessage} ${clampText(responseText, 140, '')}`;
  }
  return providerMessage;
}

function parseProviderPayload(responseText) {
  const trimmed = String(responseText ?? '').trim();
  if (!trimmed) throw new Error('Model provider returned an empty HTTP response.');
  try {
    return JSON.parse(trimmed);
  } catch {
    const events = [];
    for (const line of trimmed.split(/\r?\n/)) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try { events.push(JSON.parse(data)); } catch { /* ignore malformed SSE diagnostic lines */ }
    }
    const completed = events.find((event) => event?.type === 'response.completed' && event.response)
      ?? events.find((event) => event?.response)
      ?? events.at(-1);
    if (completed?.response) return completed.response;
    if (completed) return completed;
    throw new Error('Model provider returned non-JSON HTTP response.');
  }
}
async function postModelRequest(endpoint, config, body) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.modelApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.modelTimeoutMs)
  });
  const responseText = await response.text();
  return { response, responseText };
}

export async function requestModelDesign({ prompt, assets = [], config, fallbackDesign }) {
  if (!isExternalModelConfigured(config)) {
    return { used: false, design: fallbackDesign, reason: 'external model is not configured' };
  }

  const endpoint = modelEndpoint(config);
  const bodies = buildModelRequestBodies({ prompt, assets, config });
  let lastProviderError = null;
  let payload = null;

  for (let index = 0; index < bodies.length; index += 1) {
    const { response, responseText } = await postModelRequest(endpoint, config, bodies[index]);
    if (!response.ok) {
      lastProviderError = new Error(providerErrorMessage(response.status, responseText));
      if (index < bodies.length - 1 && RETRYABLE_PROVIDER_STATUS.has(response.status)) continue;
      throw lastProviderError;
    }
    payload = parseProviderPayload(responseText);
    break;
  }

  if (!payload) throw lastProviderError ?? new Error('Model provider did not return a response payload.');
  const content = extractModelText(payload);
  const modelJson = extractJson(content);
  return {
    used: true,
    model: payload?.model ?? config.modelName,
    design: normalizeModelDesign(modelJson, fallbackDesign)
  };
}

