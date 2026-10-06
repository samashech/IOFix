import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { InputError, validateInput, validateReport, modelRequest } from './src/diagnosis.js';

const assets = new Map([
  ['/', ['index.html', 'text/html']], ['/src/app.js', ['src/app.js', 'text/javascript']],
  ['/src/style.css', ['src/style.css', 'text/css']],
]);
const MAX_BODY = 23 * 1024 * 1024;
const json = (res, status, data) => res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(data));
async function body(req) {
  let size = 0; const chunks = [];
  if (Number(req.headers['content-length']) > MAX_BODY) throw new InputError('Photos exceed the upload limit.', 413);
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new InputError('Photos exceed the upload limit.', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new InputError('Request is not valid JSON.'); }
}

export function createServer({ fetchImpl = fetch, modelUrl = process.env.IOFIX_MODEL_URL || 'http://127.0.0.1:1234', timeout = 180000 } = {}) {
  const endpoint = new URL(modelUrl);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname) || endpoint.protocol !== 'http:') throw new Error('Use a local HTTP LM Studio endpoint; remote uploads are not enabled.');
  let busy = false;
  const call = async (path, data, signal) => {
    const response = await fetchImpl(new URL(path, endpoint), {
      method: data ? 'POST' : 'GET', redirect: 'error', signal: signal || AbortSignal.timeout(5000),
      headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error('Local model request failed. Check the LM Studio model and its runtime support.');
    return response.json();
  };
  return http.createServer(async (req, res) => {
    const host = req.headers.host;
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host || '')) return json(res, 403, { error: 'Local access only.' });
    if (req.headers.origin && req.headers.origin !== `http://${host}`) return json(res, 403, { error: 'Cross-origin requests are not allowed.' });
    if (req.headers['sec-fetch-site'] === 'cross-site') return json(res, 403, { error: 'Cross-site requests are not allowed.' });
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/api/models' && req.method === 'GET') {
      try {
        const available = await call('/api/v1/models');
        const models = available.models.filter(item => item.type === 'llm' && item.capabilities?.vision === true).map(item => item.key);
        return json(res, 200, { models, message: models.length ? 'Local vision model available. Circuit accuracy has not been evaluated.' : 'No local vision model is available. Load an image-capable model in LM Studio, then refresh.' });
      } catch { return json(res, 503, { error: 'LM Studio is not reachable. Start its local server on port 1234, then refresh. No analysis has run.' }); }
    }
    if (path === '/api/analyze' && req.method === 'POST') {
      if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'Send JSON with image data.' });
      if (busy) return json(res, 409, { error: 'Another analysis is running. Try again when it finishes.' });
      busy = true;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      res.on('close', () => { if (!res.writableEnded) controller.abort(); });
      try {
        const input = validateInput(await body(req));
        const available = await call('/api/v1/models', undefined, controller.signal);
        const details = available.models.find(item => item.type === 'llm' && item.key === input.model);
        if (details?.capabilities?.vision !== true) throw new InputError('This model does not advertise image support. Select a vision model.');
        const output = await call('/v1/chat/completions', modelRequest(input), controller.signal);
        let report;
        try { report = validateReport(JSON.parse(output.choices?.[0]?.message?.content), input.photos.length); }
        catch { throw new InputError('The model returned an incomplete or invalid diagnostic report. No findings were accepted. Try a stronger vision model or clearer photos.', 502); }
        return json(res, 200, { report, model: input.model, generatedAt: new Date().toISOString(), status: 'unverified_model_assessment' });
      } catch (error) {
        return json(res, error.status || (controller.signal.aborted ? 504 : 502), { error: error instanceof InputError ? error.message : controller.signal.aborted ? 'Analysis timed out or was cancelled. No report was accepted.' : 'The local model could not complete analysis. Check LM Studio and the selected model. No report was accepted.' });
      } finally { clearTimeout(timer); busy = false; }
    }
    const asset = assets.get(path);
    if (!asset || !['GET', 'HEAD'].includes(req.method)) return res.writeHead(404).end('Not found');
    try {
      const data = await readFile(new URL(asset[0], import.meta.url));
      res.writeHead(200, {
        'Content-Type': `${asset[1]}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(500).end('Unable to load application'); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 5175);
  createServer().listen(port, '127.0.0.1', () => console.log(`IOfix: http://127.0.0.1:${port}`));
}
