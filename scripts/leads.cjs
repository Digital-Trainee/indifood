const MAX_BODY_BYTES = 32768;

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function leadPayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Please complete the enquiry form.');
  const field = (key, max, required = false) => {
    if (input[key] != null && typeof input[key] !== 'string') throw new Error('Invalid form details.');
    const value = (input[key] || '').trim();
    if (value.length > max || (required && !value)) throw new Error(`Please check your ${key}.`);
    return value;
  };
  const name = field('name', 100, true);
  const email = field('email', 150);
  const phone = field('phone', 30);
  const city = field('city', 100, true);
  const message = field('message', 3000, true);
  const business = field('business', 150);
  const type = field('type', 40);
  const packSize = field('packSize', 80);
  if (!email && !phone) throw new Error('Please provide an email address or phone number.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.');
  if (phone && (!/^[+\d\s().-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15)) throw new Error('Please enter a valid phone number.');
  if (input.consent !== true) throw new Error('Please agree to be contacted about your enquiry.');
  const products = input.products || [];
  if (!Array.isArray(products) || products.length > 30) throw new Error('Please check your selected products.');
  const selections = products.map(product => {
    if (!product || typeof product.name !== 'string' || !product.name.trim() || product.name.length > 100 || !Number.isInteger(product.quantity) || product.quantity < 1 || product.quantity > 999) throw new Error('Please check your selected products.');
    return `${product.name.trim()}: ${product.quantity} pack(s)`;
  }).join('\n');
  return {
    name, email, phone, display_name: name,
    notes: [message, selections ? `Selected products:\n${selections}` : '', packSize ? `Preferred pack size: ${packSize}` : ''].filter(Boolean).join('\n\n'),
    source: 'New Indifood Website',
    other_fields: { city, interest: type || 'Product enquiry', business, pack_size: packSize, products: selections || 'General enquiry', form: input.formSource === 'popup' ? 'Enquiry popup' : 'Contact page' }
  };
}

async function handleLead(req, res, { webhookUrl, fetchImpl = fetch }) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Please submit the enquiry form.' });
  }
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return json(res, 415, { error: 'JSON content is required.' });
  if (req.headers.origin) {
    try { if (new URL(req.headers.origin).host !== req.headers.host) return json(res, 403, { error: 'Please submit from this website.' }); }
    catch { return json(res, 403, { error: 'Invalid request origin.' }); }
  }
  let payload;
  try {
    let bytes = 0;
    const chunks = [];
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) { json(res, 413, { error: 'Your enquiry is too large. Please shorten it.' }); return; }
      chunks.push(chunk);
    }
    payload = leadPayload(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  } catch (error) {
    return json(res, 400, { error: error instanceof SyntaxError ? 'Invalid form data.' : error.message });
  }
  let endpoint;
  try {
    endpoint = new URL(webhookUrl);
    if (endpoint.protocol !== 'https:') throw new Error('Invalid endpoint');
    endpoint.hash = '';
  } catch { return json(res, 503, { error: 'Online enquiries are temporarily unavailable. Please call +91 96235 44741.' }); }
  try {
    const response = await fetchImpl(endpoint.href, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(10000), redirect: 'error'
    });
    if (!response.ok) return json(res, 502, { error: 'Your enquiry could not be sent. Please try again or call +91 96235 44741.' });
    const result = await response.json().catch(() => null);
    if (result?.success === false || result?.status === 'error') return json(res, 502, { error: 'Your enquiry could not be accepted. Please try again or call +91 96235 44741.' });
    return json(res, 200, { success: true });
  } catch (error) {
    // Log transport diagnostics only, never the webhook URL or customer's details.
    const code = error.cause?.code || error.code || error.name;
    console.error('[leads] Privyr connection failed:', String(code).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 80));
    return json(res, 502, { error: 'We could not confirm your submission. Please call +91 96235 44741 before retrying.' });
  }
}

module.exports = { handleLead, leadPayload };
