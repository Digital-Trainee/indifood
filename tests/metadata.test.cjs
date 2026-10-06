const { test } = require('node:test');
const assert = require('node:assert/strict');
const { metadataConfig } = require('../scripts/metadata.cjs');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { JSDOM } = require('jsdom');

test('canonical addresses follow the configured domain and clean page paths', () => {
  const config = metadataConfig({ SITE_URL: 'https://www.example.com/', NODE_ENV: 'production' });
  for (const [file, route] of [['index.html', '/'], ['about.html', '/about'], ['contact.html', '/contact'], ['products/chatpata.html', '/products/chatpata'], ['thank-you.html', '/thank-you']]) {
    assert.equal(config.canonicalUrl(file), 'https://www.example.com' + route);
  }
  assert.equal(config.canonicalUrl('404.html'), null);
  assert.equal(config.publicUrl('/assets/images/products/chatpata.png'), 'https://www.example.com/assets/images/products/chatpata.png');
  assert.equal(metadataConfig({ SITE_URL: 'https://new.example.com' }).canonicalUrl('about.html'), 'https://new.example.com/about');
});

test('local builds omit canonical URLs; production rejects missing or invalid domains', () => {
  assert.equal(metadataConfig({}).canonicalUrl('index.html'), null);
  for (const value of ['', 'http://example.com', 'https://localhost', 'https://127.0.0.1', 'https://example.com/subpath', 'https://example.com/?track=1', 'https://example.com/#hash', 'https://user:password@example.com', 'invalid']) {
    assert.throws(() => metadataConfig({ SITE_URL: value, NODE_ENV: 'production' }));
  }
});

test('production build emits one correct canonical and matching social metadata per page', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'indifood-seo-'));
  try {
    execFileSync(process.execPath, ['scripts/build-pages.cjs'], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, SITE_URL: 'https://www.example.com', NODE_ENV: 'production', BUILD_OUTPUT_DIR: directory },
      stdio: 'pipe'
    });
    const files = fs.readdirSync(directory).filter(file => file.endsWith('.html')).concat(fs.readdirSync(path.join(directory, 'products')).map(file => 'products/' + file));
    assert.equal(files.length, 19);
    for (const file of files) {
      const dom = new JSDOM(fs.readFileSync(path.join(directory, file), 'utf8'));
      const document = dom.window.document;
      const canonicals = document.querySelectorAll('link[rel="canonical"]');
      if (file === '404.html') {
        assert.equal(canonicals.length, 0);
      } else {
        const expected = 'https://www.example.com' + (file === 'index.html' ? '/' : '/' + file.replace(/\.html$/, ''));
        assert.equal(canonicals.length, 1);
        assert.equal(canonicals[0].href, expected);
        assert.equal(document.querySelector('meta[property="og:url"]').content, expected);
      }
      assert.ok(document.querySelector('meta[name="description"]').content.length > 40);
      assert.ok(document.querySelector('meta[property="og:image"]').content.startsWith('https://www.example.com/assets/'));
      if (file === 'products/pudina.html') assert.ok(document.querySelector('meta[property="og:image"]').content.endsWith('/products/pudina.png'));
      if (file === 'thank-you.html' || file === '404.html') assert.match(document.querySelector('meta[name="robots"]').content, /noindex/);
      dom.window.close();
    }
  } finally {
    if (path.dirname(directory) !== os.tmpdir() || !path.basename(directory).startsWith('indifood-seo-')) throw new Error('Unexpected test output directory');
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
