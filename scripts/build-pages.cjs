const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { createHash } = require('node:crypto');
const { metadataConfig } = require('./metadata.cjs');

const root = path.resolve(__dirname, '..');
const outputRoot = process.env.BUILD_OUTPUT_DIR ? path.resolve(process.env.BUILD_OUTPUT_DIR) : root;
if (fs.existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'));
const { origin: siteUrl, publicUrl, canonicalUrl } = metadataConfig();
const template = fs.readFileSync(path.join(root, 'templates/layout.html'), 'utf8');
const productScript = fs.readFileSync(path.join(root, 'assets/data/products.js'), 'utf8');
const appScript = fs.readFileSync(path.join(root, 'assets/js/app.js'), 'utf8');
const pages = [
  ['index.html', '/', 'Discover New Indifood banana chips in nine flavours. Made in Hingoli, Maharashtra since 2018. Explore our range and enquire about retail and bulk orders.'],
  ['products.html', '/products', 'Browse the New Indifood banana chip collection. Explore nine banana chip flavours and prepare a product enquiry.'],
  ['about.html', '/story', 'Meet New Indifood and discover the simple pleasure of a good snack shared with good company.'],
  ['contact.html', '/contact', 'Contact New Indifood in Hingoli, Maharashtra. Call +91 96235 44741 for banana chips, bulk orders, dealership and distribution enquiries.'],
  ['bulk-orders.html', '/bulk', 'Explore retail, office, bulk and event enquiries for New Indifood banana chips.'],
  ['faq.html', '/faq', 'Answers about the New Indifood banana chip collection, product enquiries, pack information and availability.'],
  ['privacy.html', '/privacy', 'How this New Indifood website handles enquiry details and saved product selections.'],
  ['quality.html', '/quality', 'New Indifood quality and hygiene: high-quality oil, hygienic production and careful packaging.'],
  ['thank-you.html', '/thank-you', 'Thank you for contacting New Indifood. Your enquiry has been received.'],
  ['404.html', '/404', 'This page could not be found. Explore the New Indifood chip collection.']
];
const dataWindow = new JSDOM('', { runScripts: 'outside-only' });
dataWindow.window.eval(productScript);
for (const product of dataWindow.window.INDIFOOD.products) {
  pages.push([`products/${product.id}.html`, `/product/${product.id}`, `Explore ${product.name} banana chips from New Indifood. Available in 100 g, 200 g, 500 g and 1 kg packs. Contact us for product and bulk enquiries.`]);
}
dataWindow.window.close();

for (const [file, route, description] of pages) {
  const dom = new JSDOM(template, { url: `https://indifood.test/${file}`, runScripts: 'outside-only' });
  const w = dom.window;
  w.scrollTo = () => {};
  w.document.body.dataset.page = route;
  const base = w.document.createElement('base');
  base.href = '/';
  w.document.head.prepend(base);
  w.eval(productScript);
  w.eval(appScript);
  for (const image of w.document.querySelectorAll('img[src="assets/images/indifood-logo.jpg"]')) {
    const optimized = w.INDIFOOD.images?.['assets/images/indifood-logo.jpg'];
    if (!optimized) continue;
    image.src = optimized.src;
    image.srcset = optimized.srcset;
    image.sizes = '173px';
    image.width = optimized.width;
    image.height = optimized.height;
    image.decoding = 'async';
    image.loading = image.closest('footer') ? 'lazy' : 'eager';
  }
  const priorityImage = w.document.querySelector('img[fetchpriority="high"]');
  if (priorityImage) {
    const preload = w.document.createElement('link');
    preload.rel = 'preload';
    preload.setAttribute('as', 'image');
    preload.href = priorityImage.getAttribute('src');
    preload.setAttribute('imagesrcset', priorityImage.getAttribute('srcset'));
    preload.setAttribute('imagesizes', priorityImage.getAttribute('sizes'));
    preload.setAttribute('fetchpriority', 'high');
    w.document.head.append(preload);
  }
  for (const element of w.document.querySelectorAll('script[src], link[rel="stylesheet"]')) {
    const attribute = element.tagName === 'SCRIPT' ? 'src' : 'href';
    const assetPath = element.getAttribute(attribute);
    const version = createHash('sha256').update(fs.readFileSync(path.join(root, assetPath))).digest('hex').slice(0, 12);
    element.setAttribute(attribute, `${assetPath}?v=${version}`);
  }
  w.document.querySelector('meta[name="description"]').content = description;
  const cleanPath = file === 'index.html' ? '/' : '/' + file.replace(/\.html$/, '');
  w.document.querySelector('.skip').setAttribute('href', `${cleanPath}#main`);
  const addMeta = (key, content, property = false) => {
    const meta = w.document.createElement('meta');
    meta.setAttribute(property ? 'property' : 'name', key);
    meta.content = content;
    w.document.head.append(meta);
  };
  addMeta('robots', ['/404', '/thank-you'].includes(route) ? 'noindex, follow' : 'index, follow, max-image-preview:large');
  addMeta('og:type', 'website', true);
  addMeta('og:site_name', 'New Indifood', true);
  addMeta('og:locale', 'en_IN', true);
  addMeta('og:title', w.document.title, true);
  addMeta('og:description', description, true);
  const product = route.startsWith('/product/') ? w.INDIFOOD.products.find(item => item.id === route.split('/')[2]) : null;
  const imagePath = product?.image ? '/' + product.image : '/assets/images/og-image.png';
  const imageAlt = product ? `New Indifood ${product.name} banana chips packaging` : 'New Indifood banana chips - A little goodness in every crunch. Nine flavours, authentic Indian taste.';
  addMeta('og:image', publicUrl(imagePath), true);
  if (siteUrl?.startsWith('https:')) addMeta('og:image:secure_url', publicUrl(imagePath), true);
  addMeta('og:image:type', imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg', true);
  if (!product) {
    addMeta('og:image:width', '1200', true);
    addMeta('og:image:height', '630', true);
  }
  addMeta('og:image:alt', imageAlt, true);
  addMeta('twitter:card', 'summary_large_image');
  addMeta('twitter:title', w.document.title);
  addMeta('twitter:description', description);
  addMeta('twitter:image', publicUrl(imagePath));
  addMeta('twitter:image:alt', imageAlt);
  const canonicalAddress = canonicalUrl(file);
  if (canonicalAddress) {
    const canonical = w.document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = canonicalAddress;
    w.document.head.append(canonical);
    addMeta('og:url', canonicalAddress, true);
  }
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'New Indifood',
    foundingDate: '2018',
    founder: { '@type': 'Person', name: 'Umesh Babarao Mukke' },
    telephone: '+919623544741',
    email: w.INDIFOOD.contactEmail,
    sameAs: [w.INDIFOOD.facebookUrl, w.INDIFOOD.instagramUrl],
    address: { '@type': 'PostalAddress', streetAddress: 'Khajmapur, Near ZP School, Post Girgaon, Taluka Vasmath', addressLocality: 'Hingoli', addressRegion: 'Maharashtra', postalCode: '431512', addressCountry: 'IN' },
    ...(siteUrl ? { url: publicUrl('/'), logo: publicUrl('/assets/images/indifood-logo.jpg') } : {})
  };
  if (route !== '/404') {
    const schema = w.document.createElement('script');
    schema.type = 'application/ld+json';
    schema.textContent = JSON.stringify(organization).replace(/</g, '\\u003c');
    w.document.head.append(schema);
  }
  const target = path.join(outputRoot, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, dom.serialize() + '\n');
  dom.window.close();
}
console.log(`Built ${pages.length} complete HTML pages.`);
