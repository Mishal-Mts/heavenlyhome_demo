// Small static server that behaves like a typical web host: gzip for text files, correct types (incl. AVIF),
// short cache. Used for realistic Lighthouse runs.  Usage: node tools/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';

const port = +process.argv[2] || 8081, root = process.cwd();
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const TEXT = /\.(html|css|js|json|svg|xml|txt)$/;

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(root, p));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    await stat(file);
    let body = await readFile(file);
    const headers = { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'public, max-age=600' };
    if (TEXT.test(file) && /gzip/.test(req.headers['accept-encoding'] || '')) { body = gzipSync(body); headers['Content-Encoding'] = 'gzip'; }
    // byte ranges for video, like a real host (browsers stream video with Range requests)
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range && !headers['Content-Encoding']) {
      const size = body.length, start = range[1] ? +range[1] : size - +range[2], end = range[1] && range[2] ? Math.min(+range[2], size - 1) : size - 1;
      Object.assign(headers, { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      res.writeHead(206, headers); res.end(req.method === 'HEAD' ? undefined : body.subarray(start, end + 1)); return;
    }
    res.writeHead(200, headers); res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); }
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
