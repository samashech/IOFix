import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.mjs';
import { validateReport, validateInput, modelRequest } from '../src/diagnosis.js';

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGZkAAAAASUVORK5CYII=';
const input = () => ({ model: 'test-vision:latest', photos: [{ name: 'assembly.png', data: png }], symptoms: 'Controller resets under motor load' });
const report = () => ({ summary: 'Test fixture only: evidence is insufficient.', observations: ['The test image does not show a circuit.'], findings: [], limitations: ['No wiring is visible.'], nextChecks: ['Provide a clear circuit overview.'] });
const response = data => ({ ok: true, json: async () => data });
async function withServer(t, fetchImpl, options = {}) {
  const server = createServer({ fetchImpl, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}
const post = (base, payload, extra = {}) => fetch(`${base}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(payload) });

test('photo-only cases reach a vision model with images and the schema; context is not fabricated', () => {
  const normalized = validateInput(input());
  const request = modelRequest(normalized);
  assert.equal(normalized.purpose, '');
  assert.equal(request.messages[1].content[1].image_url.url, png);
  assert.match(request.messages[1].content[0].text, /Controller resets/);
  assert.ok(request.response_format.json_schema.schema.properties.findings);
});

test('rejects unsupported uploads, missing pictures and excessive context', () => {
  assert.throws(() => validateInput({ ...input(), photos: [] }));
  assert.throws(() => validateInput({ ...input(), photos: [{ data: 'data:image/svg+xml;base64,AAAA' }] }));
  assert.throws(() => validateInput({ ...input(), photos: [{ data: 'data:image/png;base64,AAAA' }] }));
  assert.throws(() => validateInput({ ...input(), reference: 'x'.repeat(12001) }));
});

test('zero findings is valid; visible findings need real photo indices and evidence', () => {
  assert.equal(validateReport(report(), 1).findings.length, 0);
  const value = report();
  value.findings = [{ title: 'Example', severity: 'medium', basis: 'visible_evidence', evidence: [], explanation: 'Example only.', proposedFix: 'Verify first.', verification: 'Inspect while unpowered.', unknowns: [] }];
  assert.throws(() => validateReport(value, 1));
  value.findings[0].evidence = [{ photo: 2, detail: 'Test fixture.' }];
  assert.throws(() => validateReport(value, 1));
  value.findings[0].evidence[0].photo = 1;
  assert.equal(validateReport(value, 1).findings.length, 1);
  value.limitations = [];
  assert.throws(() => validateReport(value, 1));
});

test('API returns validated model output with unverified provenance', async t => {
  let sent;
  const base = await withServer(t, async (url, init) => {
    if (url.pathname === '/api/v1/models') return response({ models: [{ key: 'test-vision:latest', type: 'llm', capabilities: { vision: true } }] });
    sent = JSON.parse(init.body); return response({ choices: [{ message: { content: JSON.stringify(report()) } }] });
  });
  const result = await post(base, input()); assert.equal(result.status, 200);
  const body = await result.json(); assert.equal(body.status, 'unverified_model_assessment');
  assert.equal(body.report.findings.length, 0); assert.equal(sent.messages[1].content.filter(item => item.type === 'image_url').length, 1);
});

test('text-only models and malformed output cannot generate accepted diagnoses', async t => {
  let vision = false;
  const base = await withServer(t, async url => url.pathname === '/api/v1/models' ? response({ models: [{ key: 'test-vision:latest', type: 'llm', capabilities: { vision } }] }) : response({ choices: [{ message: { content: '{"summary":"made up"}' } }] }));
  assert.equal((await post(base, input())).status, 400);
  vision = true;
  const result = await post(base, input()); assert.equal(result.status, 502);
  assert.match((await result.json()).error, /No findings were accepted/);
});

test('offline model, cross-origin calls and timeout fail without fake findings', async t => {
  const base = await withServer(t, async () => { throw new Error('offline'); });
  assert.equal((await fetch(`${base}/api/models`)).status, 503);
  assert.equal((await post(base, input(), { Origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await post(base, input())).status, 502);
  const slow = await withServer(t, async (url, init) => new Promise((resolve, reject) => { init.signal.addEventListener('abort', () => reject(Error('aborted')), { once: true }); }), { timeout: 30 });
  assert.equal((await post(slow, input())).status, 504);
});
