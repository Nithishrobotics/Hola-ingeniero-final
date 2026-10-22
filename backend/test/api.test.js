import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { createGeminiService, mapGeminiError } from '../src/services/gemini.service.js';
import { HttpError } from '../src/middleware/validate.js';

// NOTE: These tests use MOCKED AI responses. They do not call the live Gemini API.
const KEY = 'TEST_KEY_DO_NOT_LEAK_123';
const config = loadConfig({ GEMINI_API_KEY: KEY, GEMINI_MODEL: 'gemini-3.8-flash', PORT: '5055' });
const calls = [];
const mockAi = {
  async generateReply(input) { calls.push(input); return 'Mock: ¡Hola! ¿Cómo estás?'; },
  async generateReplyStream(input) {
    calls.push(input);
    input.onChunk('Mock: ');
    input.onChunk('¡Hola! ');
    input.onChunk('¿Cómo estás?');
    return { model: 'gemini-2.5-flash' };
  },
  async validateKey(key, model) {
    if (key === 'invalid') throw new HttpError(502, 'AI_INVALID_KEY', 'Google rejected the API key.');
    return { valid: true, model: model || 'gemini-2.5-flash' };
  },
};

let server; let base;
before(async () => {
  server = createApp({ config, aiService: mockAi }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (body, headers = {}) => fetch(`${base}/api/chat`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

test('health endpoint reports status without secrets', async () => {
  const res = await fetch(`${base}/api/health`);
  const text = await res.text();
  assert.equal(res.status, 200);
  assert.equal(JSON.parse(text).status, 'ok');
  assert.ok(!text.includes(KEY));
});

test('chat returns mocked reply and bounds history', async () => {
  const history = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'model' : 'user', text: `m${i}` }));
  const res = await post({ message: 'Hola', level: 'A1', mode: 'university', history });
  assert.equal(res.status, 200);
  assert.match((await res.json()).reply, /Mock/);
  assert.ok(calls.at(-1).history.length <= config.maxHistoryMessages);
  assert.equal(calls.at(-1).history[0].role, 'user');
});

test('validation rejects bad input', async () => {
  for (const body of [{}, { message: '' }, { message: 'x'.repeat(1001) }, { message: 'a', level: 'C2' },
    { message: 'a', mode: 'hack' }, { message: 'a', action: 'proxy' }, { message: 'a', history: 'no' },
    { message: 'a', history: [{ role: 'system', text: 'x' }] }]) {
    const res = await post(body);
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 60));
    assert.ok((await res.json()).error.code);
  }
  assert.equal((await post('{bad json')).status, 400);
});

test('oversized body is rejected', async () => {
  assert.equal((await post({ message: 'a', pad: 'x'.repeat(30000) })).status, 413);
});

test('CORS blocks unknown origins', async () => {
  assert.equal((await post({ message: 'Hola' }, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await post({ message: 'Hola' }, { Origin: 'http://localhost:5173' })).status, 200);
});

test('unknown API route returns JSON 404', async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, 'NOT_FOUND');
});

test('missing API key gives an honest 503', async () => {
  const cfg = loadConfig({ PORT: '5056' });
  const s = createApp({ config: cfg, aiService: createGeminiService(cfg) }).listen(0);
  await new Promise((r) => s.once('listening', r));
  const res = await fetch(`http://127.0.0.1:${s.address().port}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Hola' }),
  });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error.code, 'AI_NOT_CONFIGURED');
  s.close();
});

test('placeholder key counts as not configured', () => {
  assert.equal(loadConfig({ GEMINI_API_KEY: 'PASTE_YOUR_KEY_HERE' }).aiConfigured, false);
});

test('error mapping: invalid key, quota, network, timeout, model', () => {
  assert.equal(mapGeminiError({ status: 400, message: 'API key not valid. Please pass a valid API key.' }).code, 'AI_INVALID_KEY');
  assert.equal(mapGeminiError({ status: 429, message: 'RESOURCE_EXHAUSTED' }).code, 'AI_QUOTA');
  assert.equal(mapGeminiError(new TypeError('fetch failed')).code, 'AI_NETWORK');
  assert.equal(mapGeminiError(Object.assign(new Error('x'), { name: 'AbortError' })).code, 'AI_TIMEOUT');
  assert.equal(mapGeminiError({ status: 404, message: 'models/x is not found' }).code, 'AI_MODEL_NOT_FOUND');
  assert.equal(mapGeminiError({ status: 503, message: 'overloaded' }).code, 'AI_UPSTREAM');
});

test('upstream errors reach the client safely, with no stack or key', async () => {
  const failing = { async generateReply() { throw new HttpError(429, 'AI_QUOTA', 'quota msg'); } };
  const s = createApp({ config, aiService: failing }).listen(0);
  await new Promise((r) => s.once('listening', r));
  const res = await fetch(`http://127.0.0.1:${s.address().port}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Hola' }),
  });
  const text = await res.text();
  assert.equal(res.status, 429);
  assert.ok(!text.includes('stack') && !text.includes(KEY));
  s.close();
});

test('rate limiting kicks in after 15 chat requests per minute', async () => {
  const s = createApp({ config, aiService: mockAi }).listen(0);
  await new Promise((r) => s.once('listening', r));
  const url = `http://127.0.0.1:${s.address().port}/api/chat`;
  let last;
  for (let i = 0; i < 17; i++) {
    last = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Hola' }) });
  }
  assert.equal(last.status, 429);
  assert.equal((await last.json()).error.code, 'RATE_LIMITED');
  s.close();
});

test('stream returns SSE events and final done payload', async () => {
  const res = await fetch(`${base}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hola', level: 'A1', mode: 'everyday' }),
  });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/event-stream/);
  const text = await res.text();
  assert.ok(text.includes('data: {"chunk":"Mock: "}'));
  assert.ok(text.includes('data: {"done":true'));
});

test('config models endpoint returns models list and current model', async () => {
  const res = await fetch(`${base}/api/config/models`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.models));
  assert.ok(data.models.length >= 3);
  assert.ok(data.currentModel);
});

test('config key validation and setting', async () => {
  const resBad = await fetch(`${base}/api/config/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: 'invalid' }),
  });
  assert.equal(resBad.status, 502);

  const resGood = await fetch(`${base}/api/config/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: 'mock-valid-api-key-test', model: 'gemini-2.5-flash' }),
  });
  assert.equal(resGood.status, 200);
  const data = await resGood.json();
  assert.equal(data.ok, true);
  assert.equal(data.aiConfigured, true);
});
