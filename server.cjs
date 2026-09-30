'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, 'dist');
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function sendFile(req, res, file) {
  fs.stat(file, (statError, stat) => {
    if (statError || !stat.isFile()) return sendFile(req, res, path.join(root, 'index.html'));
    const headers = {
      'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': file.includes(`${path.sep}assets${path.sep}`)
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
    };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  });
}

function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end('Method Not Allowed');
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end('Bad Request'); }
  const requested = path.resolve(root, `.${pathname}`);
  if (requested !== root && !requested.startsWith(`${root}${path.sep}`)) {
    res.writeHead(400);
    return res.end('Bad Request');
  }
  fs.stat(requested, (error, stat) => {
    const file = !error && stat.isDirectory() ? path.join(requested, 'index.html') : requested;
    sendFile(req, res, file);
  });
}

const server = http.createServer(handler);
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 3000;
server.listen(port, host, () => {
  console.log(`Konnectik dashboard listening on ${host}:${port}`);
});
server.on('error', (error) => {
  console.error('Konnectik dashboard failed to start:', error);
});

module.exports = { handler, server };
