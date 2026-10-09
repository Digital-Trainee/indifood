const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream');
const { createGzip } = require('node:zlib');
const { handleLead } = require('./leads.cjs');

const root = path.resolve(__dirname, '..');
if (fs.existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'));
const pages = new Set(['index', 'products', 'about', 'contact', 'bulk-orders', 'faq', 'privacy', 'quality', 'thank-you', '404']);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function createServer(options = {}) {
  return http.createServer(async (req, res) => {
    if (req.url.split('?')[0] === '/api/leads') {
      return handleLead(req, res, { webhookUrl: options.webhookUrl ?? process.env.PRIVYR_WEBHOOK_URL, fetchImpl: options.fetchImpl });
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end();
    }
    let url;
    let pathname;
    try {
      url = new URL(req.url, 'http://localhost');
      pathname = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400);
      return res.end('Invalid URL');
    }
    const normalized = pathname.replace(/\/+$/, '') || '/';
    const slug = normalized.replace(/^\//, '').replace(/\.html$/, '');
    const pageFile = normalized === '/' ? 'index.html' : pages.has(slug) || /^products\/[a-z0-9-]+$/.test(slug) ? slug + '.html' : null;
    let file = pageFile && path.join(root, pageFile);
    let status = 200;
    if (!file && pathname.startsWith('/assets/')) {
      const candidate = path.resolve(root, '.' + pathname);
      if (candidate.startsWith(path.join(root, 'assets') + path.sep) && types[path.extname(candidate)]) file = candidate;
    }
    let stat;
    try { if (file) stat = await fs.promises.stat(file); } catch { /* Unknown files use the branded 404 page. */ }
    if (!stat?.isFile()) {
      file = path.join(root, '404.html');
      status = 404;
      stat = await fs.promises.stat(file);
    } else if (pageFile) {
      const canonical = pageFile === 'index.html' ? '/' : '/' + pageFile.replace(/\.html$/, '');
      if (pathname !== canonical) {
        res.writeHead(308, { Location: canonical + url.search });
        return res.end();
      }
      if (pageFile === '404.html') status = 404;
    }
    const extension = path.extname(file);
    const isAsset = status === 200 && pathname.startsWith('/assets/');
    const fingerprinted = /\.[a-f0-9]{12}\.webp$/.test(file) || /^[a-f0-9]{12}$/.test(url.searchParams.get('v') || '');
    const cacheControl = isAsset && fingerprinted ? 'public, max-age=31536000, immutable' : isAsset && ['.jpg', '.png', '.webp', '.ico'].includes(extension) ? 'public, max-age=3600' : 'no-cache';
    const etag = `W/"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
    const compressible = ['.html', '.css', '.js', '.svg'].includes(extension);
    const gzip = compressible && (req.headers['accept-encoding'] || '').split(',').some(value => /^\s*gzip\s*(?:;\s*q\s*=\s*(\d(?:\.\d+)?))?\s*$/.test(value) && !/;\s*q\s*=\s*0(?:\.0*)?\s*$/.test(value));
    const headers = { 'Content-Type': types[extension] || 'application/octet-stream', 'Cache-Control': cacheControl, 'ETag': etag, 'X-Content-Type-Options': 'nosniff' };
    if (compressible) headers.Vary = 'Accept-Encoding';
    if (isAsset) headers['Vercel-CDN-Cache-Control'] = 'public, s-maxage=86400';
    else if (status === 200 && extension === '.html') headers['Vercel-CDN-Cache-Control'] = 'public, s-maxage=3600';
    if (status === 200 && (req.headers['if-none-match'] || '').split(',').map(value => value.trim()).some(value => value === etag || value === '*')) {
      res.writeHead(304, headers);
      return res.end();
    }
    if (gzip) headers['Content-Encoding'] = 'gzip';
    else headers['Content-Length'] = stat.size;
    res.writeHead(status, headers);
    if (req.method === 'HEAD') return res.end();
    if (gzip) pipeline(fs.createReadStream(file), createGzip(), res, () => {});
    else pipeline(fs.createReadStream(file), res, () => {});
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 5500);
  const server = createServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Indifood is running at http://localhost:${port}`));
}
module.exports = { createServer };
