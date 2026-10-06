const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../scripts/server.cjs');

test('lead endpoint validates, maps Privyr fields, and handles delivery failures', async () => {
  const deliveries = [];
  let outcome = 'ok';
  const server = createServer({ webhookUrl: 'https://example.test/incoming-leads/test#generic-webhook', fetchImpl: async (url, options) => {
    deliveries.push({ url, ...options, payload: JSON.parse(options.body) });
    if (outcome === 'timeout') throw new DOMException('Timed out', 'TimeoutError');
    return { ok: outcome !== 'http-error', json: async () => ({ success: outcome !== 'rejected' }) };
  } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const valid = { name: 'Test Customer', email: 'test@example.com', phone: '+919876543210', city: 'Pune', message: 'Bulk pricing please', business: 'Test Store', type: 'Bulk', packSize: '500 g', consent: true, formSource: 'popup', products: [{ name: 'Masala', quantity: 3 }] };
  const post = data => fetch(base + '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  try {
    const response = await post(valid);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true });
    assert.equal(deliveries.length, 1);
    const delivery = deliveries[0];
    assert.equal(delivery.url, 'https://example.test/incoming-leads/test');
    assert.equal(delivery.headers['Content-Type'], 'application/json');
    assert.equal(delivery.payload.display_name, valid.name);
    assert.equal(delivery.payload.source, 'New Indifood Website');
    assert.equal(delivery.payload.other_fields.city, 'Pune');
    assert.equal(delivery.payload.other_fields.interest, 'Bulk');
    assert.equal(delivery.payload.other_fields.pack_size, '500 g');
    assert.match(delivery.payload.notes, /Masala: 3 pack/);
    for (const invalid of [{ ...valid, consent: false }, { ...valid, name: ' ' }, { ...valid, email: 'bad' }, { ...valid, email: '', phone: '' }, { ...valid, products: [{ name: 'Masala', quantity: -1 }] }]) assert.equal((await post(invalid)).status, 400);
    assert.equal(deliveries.length, 1);
    assert.equal((await fetch(base + '/api/leads')).status, 405);
    assert.equal((await fetch(base + '/api/leads', { method: 'POST', body: '{}' })).status, 415);
    assert.equal((await fetch(base + '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' })).status, 400);
    assert.equal((await fetch(base + '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://unrelated.test' }, body: JSON.stringify(valid) })).status, 403);
    for (const failure of ['http-error', 'rejected', 'timeout']) {
      outcome = failure;
      const failed = await post(valid);
      assert.equal(failed.status, 502);
      assert.ok((await failed.json()).error);
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('clean URLs, redirects, refreshes, assets and missing pages', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ['/', '/products', '/about', '/contact?type=Bulk', '/bulk-orders', '/faq', '/thank-you', '/quality', '/privacy', '/products/masala']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200, route);
      assert.match(await response.text(), /<h1\b[^>]*>/);
    }
    for (const [before, after] of [['/index.html', '/'], ['/products.html', '/products'], ['/about/', '/about'], ['/contact.html?type=Bulk', '/contact?type=Bulk'], ['/products/masala.html', '/products/masala']]) {
      const response = await fetch(base + before, { redirect: 'manual' });
      assert.equal(response.status, 308);
      assert.equal(response.headers.get('location'), after);
    }
    const css = await fetch(base + '/assets/css/styles.css');
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type'), /text\/css/);
    for (const route of ['/missing', '/products/missing', '/package.json', '/.env', '/.env.example', '/assets/%2e%2e%2fpackage.json', '/404']) assert.equal((await fetch(base + route)).status, 404, route);
    assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
    assert.equal(await (await fetch(base + '/products', { method: 'HEAD' })).text(), '');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
