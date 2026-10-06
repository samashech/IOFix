import http from 'node:http';
import { readFile } from 'node:fs/promises';

const assets = new Map([
  ['/', ['index.html', 'text/html']],
  ['/src/app.js', ['src/app.js', 'text/javascript']],
  ['/src/lab.js', ['src/lab.js', 'text/javascript']],
  ['/src/style.css', ['src/style.css', 'text/css']],
]);
const port = Number(process.env.PORT || 5175);
const server = http.createServer(async (req, res) => {
  const asset = assets.get(new URL(req.url, 'http://localhost').pathname);
  if (!asset || !['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(404).end('Not found');
    return;
  }
  try {
    const data = await readFile(new URL(asset[0], import.meta.url));
    res.writeHead(200, { 'Content-Type': `${asset[1]}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(500).end('Unable to load application');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`FixLens: http://127.0.0.1:${port}`));
