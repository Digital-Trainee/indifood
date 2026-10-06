'use strict';
const config = window.INDIFOOD;
const main = document.getElementById('main');
const basketDialog = document.getElementById('basket');
const icon = name => `<i data-lucide="${name}"></i>`;
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const pageFiles = { '/': 'index.html', '/products': 'products.html', '/story': 'about.html', '/contact': 'contact.html', '/bulk': 'bulk-orders.html', '/faq': 'faq.html', '/privacy': 'privacy.html', '/thank-you': 'thank-you.html', '/quality': 'quality.html', '/404': '404.html' };
function pageUrl(route) {
  const [pathname, query] = route.split('?');
  const file = pathname.startsWith('/product/') ? 'products/' + pathname.split('/')[2] + '.html' : (pageFiles[pathname] || '404.html');
  const cleanPath = file === 'index.html' ? '/' : '/' + file.replace(/\.html$/, '');
  return cleanPath + (query ? '?' + query : '');
}
function currentRoute() {
  return (location.hash.startsWith('#/') ? location.hash.slice(1) : (document.body.dataset.page || '/')).split('?')[0];
}
function normalizeLinks() {
  document.querySelectorAll('a[href^="#/"]').forEach(link => {
    const route = link.getAttribute('href').slice(1);
    link.dataset.route = route.split('?')[0];
    link.setAttribute('href', pageUrl(route));
  });
}
const icons = () => { normalizeLinks(); window.lucide?.createIcons(); };
let basket = [];
try { const saved = JSON.parse(localStorage.getItem('indifood-basket') || '[]'); if (Array.isArray(saved)) basket = saved.filter(row => row && config.products.some(p => p.id === row.id) && Number.isInteger(row.quantity) && row.quantity > 0 && row.quantity <= 999).filter((row, i, all) => all.findIndex(other => other.id === row.id) === i); } catch { /* Storage is optional. */ }
let toastTimer;
function toast(message) { const el = document.getElementById('toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3200); }
function persist() { try { localStorage.setItem('indifood-basket', JSON.stringify(basket)); } catch { /* Keep the basket in memory if storage is unavailable. */ } document.getElementById('basket-count').textContent = basket.reduce((sum, row) => sum + row.quantity, 0); }
function photo(p, extra = '') {
  if (p.image) return `<div class="product-photo has-pack ${extra}"><img src="${escapeHTML(p.image)}" alt="New Indifood ${escapeHTML(p.name)} banana chips packaging${p.generatedImage ? ' concept' : ''}" loading="lazy" decoding="async"></div>`;
  return `<div class="product-photo ${extra}" role="img" aria-label="Illustrative ${escapeHTML(p.name)} banana chips" style="--photo-position:${p.position};--product-color:${p.color}"></div>`;
}
function starIcons(average) {
  return Array.from({ length: 5 }, (_, index) => '<span class="rating-star"><span class="rating-star-outline">' + icon('star') + '</span><span class="rating-star-fill" style="width:' + Math.min(100, Math.max(0, (average - index) * 100)) + '%">' + icon('star') + '</span></span>').join('');
}
function ratingStars(rating) {
  return '<span class="rating-stars" aria-hidden="true">' + starIcons(rating) + '</span>';
}
function productRating(id) {
  const valid = (config.reviews || []).filter(review => Number.isFinite(review.rating) && review.rating >= 1 && review.rating <= 5);
  const productReviews = valid.filter(review => review.productId === id);
  const reviews = productReviews.length ? productReviews : valid.filter(review => !review.productId);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null;
  if (!Number.isFinite(average) || average < 1 || average > 5) return '<div class="product-rating"><span>No reviews yet</span></div>';
  const stars = starIcons(average);
  return '<div class="product-rating"><span class="rating-stars" aria-hidden="true">' + stars + '</span><strong>' + average.toFixed(1) + ' / 5</strong><span>' + (productReviews.length ? 'Product rating' : 'New Indifood rating') + ' (' + reviews.length + ' reviews)</span></div>';
}
function reviewsSection(id) {
  const approved = (config.reviews || []).filter(review => (!id || review.productId === id) && Number.isFinite(review.rating) && review.rating >= 1 && review.rating <= 5);
  const reviews = approved;
  return '<section class="section customer-reviews"><div class="section-heading"><div><h2>Reviews</h2></div><button type="button" class="button" data-write-review="' + escapeHTML(id || '') + '">' + icon('square-pen') + ' Write a review</button></div>' + (reviews.length ? '<div class="review-grid review-slider" tabindex="0" role="region" aria-label="Customer reviews" aria-roledescription="carousel">' + reviews.map(review => '<article class="review-item"><div class="product-rating">' + ratingStars(review.rating) + '<strong>' + review.rating.toFixed(1) + ' / 5</strong></div><blockquote>' + escapeHTML(review.text) + '</blockquote><strong>' + escapeHTML(review.name) + '</strong><p>' + escapeHTML(config.products.find(p => p.id === review.productId)?.name || '') + '</p></article>').join('') + '</div>' : '<p class="review-empty">No reviews yet. Tried our chips? We would love to hear what you think.</p>') + '</section>';
}
function bindReviewSlider() {
  const slider = main.querySelector('.review-slider');
  if (!slider || slider.children.length < 2) return;
  slider.insertAdjacentHTML('afterend', '<div class="review-controls"><button type="button" class="icon-button" data-review-step="-1" aria-label="Previous reviews" title="Previous reviews">' + icon('arrow-left') + '</button><button type="button" class="icon-button" data-review-step="1" aria-label="Next reviews" title="Next reviews">' + icon('arrow-right') + '</button></div>');
  const buttons = slider.nextElementSibling.querySelectorAll('button');
  const update = () => {
    buttons[0].disabled = slider.scrollLeft <= 2;
    buttons[1].disabled = slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 2;
  };
  buttons.forEach(button => button.addEventListener('click', () => {
    const step = slider.firstElementChild.getBoundingClientRect().width + 28;
    slider.scrollBy({ left: Number(button.dataset.reviewStep) * step, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }));
  slider.addEventListener('scroll', update, { passive: true });
  if (window.ResizeObserver) {
    if (window.reviewSliderObserver) window.reviewSliderObserver.disconnect();
    window.reviewSliderObserver = new ResizeObserver(update);
    window.reviewSliderObserver.observe(slider);
  }
  update();
}
function card(p) { return `<article class="product-card"><a href="#/product/${p.id}" class="product-visual" aria-label="View ${escapeHTML(p.name)}">${photo(p)}${p.image ? '' : `<span class="product-tag">${p.tag}</span>`}</a><div class="product-meta"><span>${p.category.toUpperCase()} COLLECTION</span><span>${p.heat}</span></div><div class="product-heading"><a href="#/product/${p.id}"><h3>${p.name}</h3></a><button class="icon-button add-product" data-id="${p.id}" aria-label="Add ${escapeHTML(p.name)} to enquiry">${icon('plus')}</button></div>${productRating(p.id)}<p>${p.note}. A handful of happiness.</p><a class="text-link" href="#/product/${p.id}">Explore flavour ${icon('arrow-up-right')}</a></article>`; }
const sampleNotice = () => config.sampleCatalogue ? '<p class="sample-note">Preview collection &middot; Sample flavours and illustrative photography.</p>' : '';
function home() { return `<section class="hero"><img class="hero-image" src="assets/images/banana-chips.png" alt="Golden crispy banana chips"><div class="hero-copy"><span class="eyebrow">AUTHENTIC INDIAN FOOD SINCE 2018</span><h1 class="brand-headline">New Indifood &ndash; Authentic Indian Taste with a Promise of Purity!</h1><p>Deliciously crispy banana chips made with high-quality oil, prepared with care for better taste, quality, and freshness.</p><div class="hero-actions"><button type="button" class="button cta-orange" data-open-enquiry aria-haspopup="dialog" aria-controls="enquiry-popup">Enquire Now ${icon('message-circle')}</button><a href="#/products" class="text-link">Explore our ${config.products.length} flavours ${icon('arrow-right')}</a></div><div class="hero-signoff">${icon('leaf')} Authentic Indian Taste. Quality You Can Trust.</div></div><div class="hero-stamp">Fresh &amp;<br><strong>Crispy</strong><span>SINCE 2018</span></div></section><div class="value-strip"><span>${icon('sun')} High-quality oil</span><span>${icon('heart')} Hygiene first</span><span>${icon('package')} 100 g to 1 kg packs</span></div><section class="section story-band"><div class="story-picture home-story-picture"><img src="assets/images/banana-chips-story.png" alt="Golden banana chips served on a banana leaf in a woven tray" loading="lazy" decoding="async" width="1536" height="1024"><span>Authentic Indian taste.<br><em>Quality you can trust.</em></span></div><div><span class="eyebrow">WELCOME TO NEW INDIFOOD</span><h2>Indian at heart.<br>Quality in every pack.</h2><p>Welcome to <strong>New Indifood</strong>, where <strong>&ldquo;Indi&rdquo; represents Indian and &ldquo;Food&rdquo; represents authentic food</strong>.</p><p>Since <strong>2018</strong>, we have been serving our customers fresh, hygienically prepared, crispy banana chips in a variety of delicious flavours. Our focus is on maintaining high standards of quality, hygiene, taste, and customer satisfaction in every pack.</p><a href="#/story" class="text-link">About New Indifood ${icon('arrow-right')}</a></div></section><section class="section"><div class="section-heading"><div><span class="eyebrow">OUR PRODUCTS &amp; FLAVOURS</span><h2>${config.products.length} delicious flavours.<br>One signature crunch.</h2></div><a href="#/products" class="text-link">Explore all flavours ${icon('arrow-up-right')}</a></div>${packSizes()}<div class="product-grid">${config.products.map(card).join('')}</div></section><section class="section quality-overview"><span class="eyebrow">WHY CHOOSE US?</span><h2>Quality you can trust.</h2>${qualityPoints()}<a href="#/quality" class="text-link">Our quality &amp; hygiene practices ${icon('arrow-right')}</a></section>${businessBand()}`; }
function packSizes() { return `<div class="pack-sizes"><strong>Available pack sizes</strong><span>${config.packSizes.join(' &nbsp; | &nbsp; ')}</span><p>From a small snack pack to a larger family pack, an option for every requirement.</p></div>`; }
function qualityPoints() { return `<div class="quality-grid"><article>${icon('droplet')}<h3>Premium Quality Oil</h3><p>We use high-quality oil for preparing our banana chips and <strong>do not reuse previously used cooking oil</strong>. This helps us maintain consistent taste, freshness, and product quality.</p></article><article>${icon('sparkles')}<h3>Hygiene First</h3><p>Cleanliness is a top priority at New Indifood. Our workers use <strong>hand gloves and head caps</strong> during production, and our machines and production areas are cleaned regularly.</p></article><article>${icon('shield-check')}<h3>Food Safety Standards</h3><p>We follow applicable <strong>Food Safety standards, hygiene practices, and manufacturing guidelines</strong> to ensure safe and quality products for our customers.</p></article><article>${icon('package')}<h3>Fresh &amp; Crispy</h3><p>Our banana chips are carefully prepared and packed to preserve their signature crunch, flavour, and freshness.</p></article></div>`; }
function quality() { return `<section class="page-intro section"><span class="eyebrow">QUALITY &amp; HYGIENE</span><h1>Quality You Can Trust<span>.</span></h1><p>At New Indifood, quality and hygiene are at the heart of our manufacturing process.</p></section><section class="section">${qualityPoints()}</section><section class="section story-band"><div class="story-picture"><img src="assets/images/banana-chips.png" alt="Golden banana chips"><span>Prepared with care.<br><em>Packed for freshness.</em></span></div><div><span class="eyebrow">HYGIENIC PRODUCTION</span><h2>Care at every step.</h2><p>Every batch of banana chips is prepared with proper care and attention to cleanliness.</p><ul class="hygiene-list"><li>Use of hand gloves</li><li>Use of head caps</li><li>Regular cleaning of machinery</li><li>Clean production environment</li><li>Hygienic handling and packaging</li></ul><p>From preparation to final packaging, we focus on delivering a product that customers can enjoy with confidence.</p><a class="button" href="#/products">Explore our banana chips ${icon('arrow-right')}</a></div></section>`; }
function businessBand() { return `<section class="business-band section"><div><span class="eyebrow">LET'S GROW TOGETHER</span><h2>Big on crunch.<br>Open to possibilities.</h2><p>Stocking your shelves or planning a bigger occasion?<br>Let's start with your requirements.</p></div><button type="button" class="button light" data-open-enquiry data-enquiry-type="Bulk" aria-haspopup="dialog" aria-controls="enquiry-popup">Enquire Now ${icon('arrow-up-right')}</button></section>`; }
function catalogue() { return `<section class="page-intro section"><span class="eyebrow">THE INDIFOOD COLLECTION</span><h1>Find your kind of crunch<span>.</span></h1><p>At New Indifood, we understand that everyone has a different taste. Our crispy banana chips are available in ${config.products.length} delicious flavours.</p></section><section class="catalogue section">${packSizes()}<div class="catalogue-toolbar"><div class="filters" role="group" aria-label="Filter by flavour">${['All flavours', 'Classic', 'Spicy', 'Tangy', 'Sweet', 'Herby'].map((label, i) => `<button class="filter ${i === 0 ? 'active' : ''}" aria-pressed="${i === 0}" data-category="${label}">${label}</button>`).join('')}</div><label class="search">${icon('search')}<input type="search" id="product-search" placeholder="Find a flavour" aria-label="Search products"></label></div><p id="result-count" class="result-count" role="status">${config.products.length} flavours to explore</p><div class="product-grid" id="product-results">${config.products.map(card).join('')}</div></section>${businessBand()}`; }
function productDetails(p) {
  const facts = [
    ['Product', p.name + ' banana chips'],
    ['Brand', 'New Indifood'],
    ['Flavour profile', p.flavourProfile],
    ['Texture', 'Crispy'],
    ['Pack sizes', config.packSizes.join(' / ')],
    ['Manufacturer location', 'Hingoli, Maharashtra']
  ];
  return '<section class="product-specifications" aria-label="Product details"><h2>Product details</h2><dl>' + facts.map(([label, value]) => '<div><dt>' + escapeHTML(label) + '</dt><dd>' + escapeHTML(value) + '</dd></div>').join('') + '</dl></section>' +
    '<details open><summary>Serving suggestions ' + icon('plus') + '</summary><p>Enjoy this flavour during ' + escapeHTML(p.pairing.toLowerCase()) + '. Choose a 100 g or 200 g pack for a smaller requirement, or explore 500 g and 1 kg options for sharing.</p></details>' +
    '<details><summary>Quality &amp; preparation ' + icon('plus') + '</summary><p>We prepare our banana chips using high-quality oil and do not reuse previously used cooking oil. Our production team uses hand gloves and head caps, with regular cleaning of machinery and production areas.</p><a class="text-link" href="#/quality">Our quality practices ' + icon('arrow-right') + '</a></details>' +
    '<details><summary>Ingredients, allergens &amp; nutrition ' + icon('plus') + '</summary><p><strong>Provided ingredient list:</strong> ' + escapeHTML(config.ingredients) + '</p><p>Confirm the ingredient list for your selected flavour before ordering; recipes may differ between varieties.</p><p>Check the actual pack for the complete ingredient list, allergen declaration and nutritional information. Please contact our team for the current label information before ordering if you have a dietary requirement.</p></details>' +
    '<details><summary>Storage &amp; shelf life ' + icon('plus') + '</summary><p>Follow the storage instructions and best-before date printed on your pack. Contact us to confirm the shelf life and packaging details for your selected flavour and size.</p></details>' +
    '<details><summary>Ordering &amp; delivery ' + icon('plus') + '</summary><p>Retail, bulk, dealership and distribution enquiries are welcome. Share your flavour, pack size, quantity and delivery city. Our team will confirm prices, availability, minimum order quantities, delivery charges and dispatch timing before an order is placed.</p><a class="text-link" href="tel:+919623544741">' + icon('phone') + ' +91 96235 44741</a></details>';
}
function detail(id) { const p = config.products.find(item => item.id === id); if (!p) return notFound(); return `<section class="section detail"><div class="breadcrumbs"><a href="#/">Home</a><span>/</span><a href="#/products">Our chips</a><span>/</span><span>${p.name}</span></div><div class="detail-grid"><div class="detail-photo">${photo(p)}</div><div class="detail-copy"><span class="eyebrow">${p.tag}</span><h1>${p.name}<span>.</span></h1><p class="detail-subtitle">Fresh, hygienically prepared, crispy banana chips.</p><div class="product-share"><button type="button" class="text-link" data-share-product="${p.id}">${icon('share-2')} Share this flavour</button><label class="share-fallback" hidden>Product link<input type="url" readonly aria-label="Product link"></label><p class="share-status" role="status"></p></div>${sampleNotice()}<p>${p.description}</p><div class="flavour-facts"><div><span>FLAVOUR</span><strong>${escapeHTML(p.flavourProfile || p.note)}</strong></div><div><span>PACK SIZES</span><strong>100 g to 1 kg</strong></div></div><div class="flavour-picker"><span class="quantity-label">EXPLORE THE FLAVOURS</span><div>${config.products.map(flavour => `<a href="#/product/${flavour.id}" class="flavour-option${flavour.id === p.id ? ' selected' : ''}" ${flavour.id === p.id ? 'aria-current="page"' : ''} title="${flavour.name}" aria-label="${flavour.name}">${photo(flavour)}<span>${flavour.name}</span></a>`).join('')}</div></div>${packSizes()}<p class="availability">Contact us for prices and availability.</p><label class="quantity-label" for="product-quantity">Quantity of packs requested</label><div class="purchase-row"><div class="stepper"><button type="button" data-step="-1" aria-label="Decrease quantity">${icon('minus')}</button><input id="product-quantity" aria-label="Quantity" type="number" min="1" max="999" value="1"><button type="button" data-step="1" aria-label="Increase quantity">${icon('plus')}</button></div><button class="button" id="detail-add" data-id="${p.id}">Add to enquiry ${icon('shopping-bag')}</button></div><button type="button" class="button cta-orange product-enquire" data-open-enquiry data-enquiry-product="${p.id}" aria-haspopup="dialog" aria-controls="enquiry-popup">Enquire Now ${icon('message-circle')}</button><p class="small-print">${icon('info')} No payment is taken. Final order details need confirmation.</p>${productDetails(p)}</div></div></section><section class="section related"><div class="section-heading"><div><span class="eyebrow">KEEP EXPLORING</span><h2>Another flavour to fall for.</h2></div><a href="#/products" class="text-link">All flavours ${icon('arrow-right')}</a></div><div class="product-grid">${config.products.filter(item => item.id !== id).slice(0, 3).map(card).join('')}</div></section>`; }
function brandBackground() {
  return '<section class="section brand-background"><span class="eyebrow">ROOTED IN MAHARASHTRA</span><h2>Our beginnings and our focus.</h2><div class="information-columns"><div><h3>Serving since 2018</h3><p>Founded by Umesh Babarao Mukke, New Indifood is based in Khajmapur, District Hingoli. Our focus is on banana chips that bring together authentic Indian taste, freshness and consistent quality.</p><h3>Learning and development</h3><p>Training was received at KVK Tondapur, Taluka Kalamnuri, District Hingoli, on 11 January 2021. This is a training milestone, not a claim of product certification.</p></div><div><h3>People behind the packs</h3><p>Our team of 7 women and 3 men supports the preparation, handling and packing of our banana chips. Clean working areas and careful handling are priorities throughout production.</p><h3>A range for different tastes</h3><p>From classic Salted to Chatpata, Pudina and Sweet &amp; Spicy, our collection offers different flavour choices in 100 g, 200 g, 500 g and 1 kg packs.</p></div></div><h3 class="process-title">From preparation to packing</h3><ol class="production-stages">' + [
    ['Peeling', 'Our facility includes a peeling machine for banana preparation.'],
    ['Slicing', 'A slicer machine supports preparation of the banana slices.'],
    ['Frying', 'Our fryer is used with high-quality oil. Previously used cooking oil is not reused.'],
    ['Flavouring', 'A masala coating machine supports the preparation of flavoured varieties.'],
    ['Packing', 'A packing machine supports the final packaging stage.']
  ].map(([title, description]) => '<li><strong>' + title + '</strong><p>' + description + '</p></li>').join('') + '</ol></section>';
}
function businessInformation() {
  return '<section class="section business-information"><span class="eyebrow">PLANNING YOUR REQUIREMENT</span><h2>A clearer start to your business enquiry.</h2><div class="information-columns"><div><h3>Details to share</h3><ul><li>Your business name and contact person</li><li>Delivery city and postal code</li><li>Flavours and preferred pack sizes</li><li>Approximate quantity per flavour</li><li>One-time requirement or expected repeat demand</li><li>Any target date or special packaging request</li></ul></div><div><h3>Details we will discuss</h3><p>Prices, minimum order quantities, current availability, payment arrangements, dispatch timing and delivery charges need confirmation with our team.</p><p>Our facility has a production capacity of up to 300 kg per day. This is a capacity figure, not a guarantee of stock or a delivery commitment for a particular order.</p><p>For dealership or distribution, share your proposed area and business background so the team can discuss your enquiry.</p></div></div><a class="text-link" href="#/contact?type=Bulk">Discuss your requirements ' + icon('arrow-right') + '</a></section>';
}
function story() { return `<section class="page-intro section"><span class="eyebrow">OUR STORY</span><h1>About New Indifood<span>.</span></h1><p>Authentic Indian Taste. Quality You Can Trust.</p></section><section class="section story-band"><div class="story-picture"><img src="assets/images/banana-chips.png" alt="Golden banana chips"><span>New Indifood.<br><em>Since 2018.</em></span></div><div><span class="eyebrow">OUR BRAND NAME</span><h2>Indi = Indian.<br>Food = Food.</h2><p>The name <strong>New Indifood</strong> represents our passion for authentic Indian food. Together, it reflects our commitment to delivering authentic Indian taste and quality food products.</p><p><strong>Founder / Owner:</strong> Umesh Babarao Mukke<br><strong>Established:</strong> 2018</p><h3>Training &amp; Recognition</h3><p>Training received from <strong>KVK Tondapur, Taluka Kalamnuri, District Hingoli</strong>.<br><strong>Date:</strong> 11 January 2021</p></div></section><section class="section"><span class="eyebrow">OUR INFRASTRUCTURE</span><h2>Prepared for quality.<br>Built for consistency.</h2><div class="factory-facts"><div><strong>1,200 sq. ft.</strong><span>Approximate factory area</span></div><div><strong>Up to 300 kg</strong><span>Production capacity per day</span></div><div><strong>10 workers</strong><span>7 women + 3 men</span></div></div><h3>Modern Machinery</h3><p class="section-description">Our production facility is equipped with machinery designed to maintain efficiency and consistent product quality.</p><ul class="machinery-list">${['Peeling Machine','Slicer Machine','Fryer Machine','Masala Coating Machine','Packing Machine'].map(name => `<li>${icon('settings-2')} ${name}</li>`).join('')}</ul></section><section class="section team-band"><span class="eyebrow">OUR TEAM</span><h2>Dedicated people.<br>Consistent quality.</h2><p>New Indifood is supported by a dedicated team of <strong>10 skilled workers, including 7 women and 3 men</strong>. Our team works together to maintain quality, hygiene, freshness, and consistency throughout the production process.</p><a class="text-link" href="#/quality">Quality &amp; hygiene ${icon('arrow-right')}</a></section>${brandBackground()}${businessBand()}`; }
function contact() { const selected = new URLSearchParams(location.hash.split('?')[1] || location.search).get('type'); return `<section class="page-intro section"><span class="eyebrow">LET'S TALK GOOD FOOD</span><h1>Get in Touch with New Indifood<span>.</span></h1><p>For product enquiries, bulk orders, dealership, distribution, or other business enquiries, feel free to contact us.</p></section><section class="section contact-layout"><aside><h2>New Indifood</h2><p><strong>Founder / Owner:</strong><br>Umesh Babarao Mukke</p><address>Khajmapur, Near ZP School,<br>Post Girgaon, Taluka Vasmath,<br>District Hingoli, Maharashtra &ndash; 431512</address><a class="text-link directions-link" href="https://www.google.com/maps/dir/?api=1&amp;destination=${encodeURIComponent('Khajmapur, Near ZP School, Post Girgaon, Taluka Vasmath, District Hingoli, Maharashtra 431512')}" target="_blank" rel="noopener noreferrer" aria-label="Get directions in Google Maps (opens in a new tab)">${icon('map-pin')} Get directions ${icon('external-link')}</a><a class="button phone-link" href="tel:+919623544741">${icon('phone')} +91 96235 44741</a><div class="contact-online"><a class="text-link" href="mailto:${escapeHTML(config.contactEmail)}">${icon('mail')} ${escapeHTML(config.contactEmail)}</a><a class="text-link" href="${escapeHTML(config.facebookUrl)}" target="_blank" rel="noopener noreferrer">${icon('facebook')} Facebook ${icon('external-link')}</a><a class="text-link" href="${escapeHTML(config.instagramUrl)}" target="_blank" rel="noopener noreferrer" aria-label="New Indifood on Instagram (opens in a new tab)">${icon('instagram')} Instagram ${icon('external-link')}</a></div><p>Authentic Indian Taste.<br>Quality You Can Trust.</p><div class="contact-reason">${icon('store')}<div><h3>Retail &amp; distribution</h3><p>Bring New Indifood to your shelves.</p></div></div><div class="contact-reason">${icon('package')}<div><h3>Bulk &amp; events</h3><p>A little goodness, on a bigger scale.</p></div></div><div class="contact-reason">${icon('message-circle')}<div><h3>Product enquiries</h3><p>Ask about flavours and pack options.</p></div></div><p class="contact-status">Call +91 96235 44741 or send your enquiry using the form below.</p></aside><form id="enquiry-form" method="post" action="/api/leads"><h2>Your enquiry</h2><div id="contact-selection"></div><div class="form-row"><label>Your name<input name="name" autocomplete="name" required maxlength="100" placeholder="Full name"></label><label>Email address<input name="email" type="email" autocomplete="email" required maxlength="150" placeholder="you@example.com"></label></div><div class="form-row"><label>Phone <span>(optional)</span><input name="phone" type="tel" autocomplete="tel" maxlength="30" placeholder="Phone number"></label><label>City<input name="city" autocomplete="address-level2" required maxlength="100" placeholder="Your city"></label></div><div class="form-row"><label>Enquiry type<select name="type">${['Personal', 'Retail', 'Bulk', 'Events', 'Other'].map(type => `<option${selected === type ? ' selected' : ''}>${type}</option>`).join('')}</select></label><label>Business name <span>(optional)</span><input name="business" autocomplete="organization" maxlength="150" placeholder="Company or store"></label></div><label>Preferred pack size<select name="packSize"><option value="">Please select</option>${config.packSizes.map(size => `<option>${size}</option>`).join('')}<option>Mixed sizes (specify below)</option></select></label><label>Your requirements<textarea name="message" required rows="4" maxlength="3000" placeholder="Preferred pack sizes, approximate quantity, delivery requirements..."></textarea></label><label class="consent"><input type="checkbox" name="consent" required><span>I agree to be contacted by New Indifood about this enquiry.</span></label><button type="submit" class="button">Send enquiry ${icon('send')}</button><p class="form-status" id="form-status" role="status"></p><p class="small-print">Your details are shared with New Indifood to respond to your enquiry. <a href="#/privacy">Privacy information</a></p></form></section>`; }
const questions = [
 ['Can I request different flavours and pack sizes together?', 'Share the flavours, pack sizes and quantities you would like. Our team will confirm whether your requested combination is available and provide the relevant quotation.'],
 ['What is the minimum quantity for a bulk order?', 'Minimum quantities are confirmed by our team for your requirement. Include your preferred flavours, pack sizes and estimated quantity when enquiring.'],
 ['Where do you deliver and how long does delivery take?', 'Delivery coverage, dispatch timing and charges are confirmed for each enquiry. Share your city, postal code and required date before finalising an order.'],
 ['Can I get a current price list?', 'Please contact New Indifood for current prices. Mention whether your enquiry is for personal use, retail, bulk supply or distribution, along with the required pack sizes.'],
 ['Are the product pictures the final packaging?', 'Some images are illustrative packaging concepts. Confirm the current packaging and label details with our team before ordering; the actual product label is the reference for product information.'],
 ['How can I ask about an existing enquiry?', 'Call +91 96235 44741 and mention the name and contact details used in your enquiry. If you saw a submission error, check with our team before sending it again to avoid duplicates.'],
 ['Which flavours are available?', `Our ${config.products.length} banana chip flavours are ${config.products.map(p => p.name).join(', ')}.`],
 ['What pack sizes are available?', 'Our banana chips are available in 100 g, 200 g, 500 g and 1 kg packs, from small snack packs to larger family packs. Contact us for current prices and availability.'],
 ['What are your quality and hygiene practices?', 'We use high-quality oil and do not reuse previously used cooking oil. Workers use hand gloves and head caps, and our machinery and production areas are cleaned regularly.'],
 ['Can I enquire about dealership, distribution or bulk orders?', 'Yes. Call +91 96235 44741 or prepare a business enquiry with your city, preferred flavours, pack sizes and approximate quantities.'],
 ['Does the enquiry form place an order?', 'No. The form sends your enquiry to New Indifood. It does not take a payment, reserve products or place an order.'],
 ['Where can I find ingredients and allergen information?', 'Refer to the actual product packaging for ingredients, allergens, nutrition, storage instructions and the best-before date.'],
 ['Where is New Indifood located?', 'Khajmapur, Near ZP School, Post Girgaon, Taluka Vasmath, District Hingoli, Maharashtra - 431512.']
];
function faq() { return `<section class="page-intro section"><span class="eyebrow">A LITTLE MORE TO KNOW</span><h1>Let's clear things up<span>.</span></h1><p>A few answers before your next handful.</p></section><section class="section faq-list">${questions.map(([q, a]) => `<details><summary>${q}${icon('plus')}</summary><p>${a}</p></details>`).join('')}<a class="button" href="#/contact">Have another question? ${icon('arrow-right')}</a></section>`; }
function privacy() { return `<section class="section legal"><span class="eyebrow">YOUR INFORMATION</span><h1>Privacy<span>.</span></h1><h2>Enquiries</h2><p>When you submit a form, your name, contact details, city, requirements and selected products are sent securely through our server to Privyr, our lead-management service. New Indifood uses these details to respond to your enquiry.</p><h2>Saved selections</h2><p>The site stores product IDs and quantities in your browser's local storage so your enquiry basket can survive a reload. Remove products from the basket or clear your browser's site data to erase these selections. Personal contact details and form messages are not saved in browser storage. Submitted enquiries are handled through Privyr.</p><h2>External services</h2><p>Forms use Privyr to deliver and manage enquiries. This website does not process payments. Images, icons and fonts are served locally.</p><h2>Contact</h2><p>For questions about your enquiry, call New Indifood at <a href="tel:+919623544741">+91 96235 44741</a>.</p></section>`; }
function bulk() {
  return `<section class="page-intro section"><span class="eyebrow">GOODNESS FOR YOUR BUSINESS</span><h1>Bring more crunch<br>to the table<span>.</span></h1><p>For store shelves, office pantries, celebrations and everything in between.</p></section>
  <section class="section business-options"><div class="section-heading"><div><span class="eyebrow">LET'S FIND YOUR FIT</span><h2>A little goodness.<br>On a bigger scale.</h2></div><p>Tell us what you need.<br>We'll start with the right questions.</p></div>
  <div class="moment-grid"><article>${icon('store')}<h3>Retail &amp; distribution</h3><p>Interested in adding New Indifood to your store? Share your location, business type and the flavours you have in mind.</p><a class="text-link" href="#/contact?type=Retail">Retail enquiry ${icon('arrow-up-right')}</a></article><article>${icon('package')}<h3>Office &amp; bulk supply</h3><p>Planning snacks for your team or a larger purchase? Let us know your estimated quantities and preferred pack sizes.</p><a class="text-link" href="#/contact?type=Bulk">Bulk enquiry ${icon('arrow-up-right')}</a></article><article>${icon('gift')}<h3>Events &amp; celebrations</h3><p>Add a little crunch to your next occasion. Share your date, number of guests and any packaging requirements.</p><a class="text-link" href="#/contact?type=Events">Event enquiry ${icon('arrow-up-right')}</a></article></div></section>
  <section class="section story-band"><div class="story-picture"><img src="assets/images/banana-chips.png" alt="Golden banana chips to share"><span>Good company.<br><em>Even better crunch.</em></span></div><div><span class="eyebrow">FROM A THOUGHT TO AN ENQUIRY</span><h2>Let's get the details right.</h2><ol class="enquiry-steps"><li><strong>Explore the flavours</strong><p>Add the products you are interested in to your enquiry basket.</p></li><li><strong>Share your requirements</strong><p>Include quantities, your city, preferred sizes and any important dates.</p></li><li><strong>Send your enquiry</strong><p>Send your requirements to our team. Prices, availability and delivery details need confirmation before ordering.</p></li></ol><a class="button" href="#/products">Explore the collection ${icon('arrow-right')}</a></div></section>${businessInformation()}<section class="section bulk-close"><span class="eyebrow">HAVE SOMETHING IN MIND?</span><h2>Let's start a conversation.</h2><p>No confirmed quantity yet? A general enquiry is a good place to begin.</p><button type="button" class="button" data-open-enquiry data-enquiry-type="Bulk" aria-haspopup="dialog" aria-controls="enquiry-popup">Enquire Now ${icon('arrow-right')}</button></section>`;
}

function thankYou() { return `<section class="section thank-you-page"><div class="thank-you-mark">${icon('circle-check')}</div><span class="eyebrow">THANK YOU FOR CHOOSING NEW INDIFOOD</span><h1>Thank you for your enquiry!</h1><p>Your enquiry has been received. Our team will contact you using the details you provided.</p><p class="thank-you-note">This confirms your enquiry, not an order or payment.</p><div class="thank-you-actions"><a class="button" href="#/products">Explore our flavours ${icon('arrow-right')}</a><a class="text-link" href="tel:+919623544741">${icon('phone')} +91 96235 44741</a></div><a class="text-link" href="#/">Back to home ${icon('house')}</a></section>`; }
function notFound() { return `<section class="section empty-page"><span class="eyebrow">404</span><h1>This one's off the menu.</h1><p>Let's get you back to something good.</p><a href="#/products" class="button">Explore our chips ${icon('arrow-right')}</a></section>`; }
function closeMenu() { document.getElementById('nav').classList.remove('open'); document.getElementById('menu').setAttribute('aria-expanded', 'false'); }
function render() { const route = currentRoute(); closeMenu(); if (basketDialog.open) basketDialog.close(); const views = { '/': home, '/products': catalogue, '/story': story, '/contact': contact, '/faq': faq, '/privacy': privacy, '/bulk': bulk, '/quality': quality, '/thank-you': thankYou }; main.innerHTML = route.startsWith('/product/') ? detail(route.split('/')[2]) : (views[route] || notFound)(); document.querySelectorAll('#nav a').forEach(a => { const active = (a.dataset.route || a.getAttribute('href').slice(1)) === route || (route.startsWith('/product/') && a.dataset.route === '/products'); if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); const title = route.startsWith('/product/') ? config.products.find(p => p.id === route.split('/')[2])?.name : ({ '/': 'Taste the Goodness', '/products': 'Our Chips', '/story': 'Our Story', '/contact': 'Get in Touch', '/faq': 'FAQs', '/privacy': 'Privacy', '/bulk': 'Bulk Orders', '/quality': 'Quality & Hygiene', '/thank-you': 'Thank You' })[route]; document.title = `${title || 'Page not found'} | New Indifood`; if (route === '/' || route.startsWith('/product/')) main.insertAdjacentHTML('beforeend', reviewsSection(route.startsWith('/product/') ? route.split('/')[2] : null)); bindReviewSlider(); icons(); bindPage(); window.scrollTo(0, 0); }
function add(id, quantity = 1) { if (!config.products.some(p => p.id === id)) return; const row = basket.find(item => item.id === id); if (row) row.quantity = Math.min(999, row.quantity + quantity); else basket.push({ id, quantity }); persist(); toast('Added to your enquiry basket'); }
function drawBasket() { document.getElementById('basket-items').innerHTML = basket.length ? basket.map(row => { const p = config.products.find(item => item.id === row.id); return `<div class="basket-row">${photo(p)}<div><a href="#/product/${p.id}"><h3>${p.name}</h3></a><span>Requested packs</span><div class="stepper"><button data-change="-1" data-id="${p.id}" aria-label="Decrease ${p.name} quantity">${icon('minus')}</button><span>${row.quantity}</span><button data-change="1" data-id="${p.id}" aria-label="Increase ${p.name} quantity" ${row.quantity >= 999 ? 'disabled' : ''}>${icon('plus')}</button></div></div><button class="icon-button" data-remove="${p.id}" aria-label="Remove ${p.name}">${icon('trash-2')}</button></div>`; }).join('') : `<div class="basket-empty">${icon('shopping-bag')}<h3>A little room for goodness.</h3><p>Add a flavour to start your enquiry.</p><a href="#/products" class="text-link" id="browse-basket">Explore our chips ${icon('arrow-right')}</a></div>`; document.getElementById('basket-enquire').disabled = !basket.length; icons(); }
function selection() { const el = document.getElementById('contact-selection'); if (el) el.innerHTML = basket.length ? `<div class="selection-summary"><strong>Your selected flavours</strong>${basket.map(row => `<span>${config.products.find(p => p.id === row.id).name} <b>${row.quantity} pack${row.quantity === 1 ? '' : 's'}</b></span>`).join('')}<button type="button" class="text-link" id="edit-selection">Edit selection ${icon('arrow-right')}</button></div>` : '<p class="no-selection">No products selected yet. You can still make a general enquiry, or <a href="#/products">explore our chips</a>.</p>'; icons(); }
function bindPage() { if (document.getElementById('product-search')) { let category = 'All flavours'; const filter = () => { const query = document.getElementById('product-search').value.trim().toLowerCase(); const products = config.products.filter(p => (category === 'All flavours' || p.category === category) && `${p.name} ${p.category} ${p.note}`.toLowerCase().includes(query)); document.getElementById('product-results').innerHTML = products.length ? products.map(card).join('') : '<div class="no-results"><h2>No flavours found.</h2><p>Try another search or choose All flavours.</p><button class="text-link" id="reset-filters">Reset filters</button></div>'; document.getElementById('result-count').textContent = `${products.length} flavour${products.length === 1 ? '' : 's'} to explore`; icons(); }; document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => { category = button.dataset.category; document.querySelectorAll('.filter').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); }); filter(); })); document.getElementById('product-search').addEventListener('input', filter); document.getElementById('product-results').addEventListener('click', event => { if (event.target.closest('#reset-filters')) { document.getElementById('product-search').value = ''; document.querySelector('.filter').click(); } }); } selection(); document.getElementById('enquiry-form')?.addEventListener('submit', submitEnquiry); }
async function submitEnquiry(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.submitting === 'true' || !form.reportValidity()) return;
  const data = new FormData(form);
  for (const name of ['name', 'city', 'message']) {
    if (!String(data.get(name) || '').trim()) {
      const input = form.elements[name];
      input.setCustomValidity('Please enter a value.');
      input.reportValidity();
      input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
      return;
    }
  }
  const payload = Object.fromEntries(['name', 'email', 'phone', 'city', 'type', 'business', 'packSize', 'message'].map(key => [key, String(data.get(key) || '').trim()]));
  if (data.get('rating')) payload.message = 'Customer review: ' + data.get('rating') + '/5 stars\n' + payload.message;
  payload.consent = data.get('consent') === 'on';
  payload.formSource = form.id === 'popup-enquiry-form' ? 'popup' : 'contact';
  payload.products = basket.map(row => ({ name: config.products.find(product => product.id === row.id).name, quantity: row.quantity }));
  const button = form.querySelector('[type="submit"]');
  const status = form.querySelector('.form-status');
  const originalButton = button.innerHTML;
  form.dataset.submitting = 'true';
  form.setAttribute('aria-busy', 'true');
  button.disabled = true;
  button.textContent = 'Sending...';
  status.textContent = 'Sending your enquiry...';
  try {
    const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
    const result = await response.json();
    if (!response.ok || result.success !== true) throw new Error(result.error || 'Your enquiry could not be sent. Please try again.');
    status.textContent = 'Your enquiry has been received. Thank you!';
    location.assign(pageUrl('/thank-you'));
  } catch (error) {
    status.textContent = error.name === 'TimeoutError' || error.name === 'AbortError' ? 'We could not confirm your submission. Please call +91 96235 44741 before retrying.' : error.message || 'Unable to send your enquiry. Please try again.';
    button.disabled = false;
    button.innerHTML = originalButton;
    delete form.dataset.submitting;
  } finally { form.removeAttribute('aria-busy'); }
}
main.addEventListener('click', event => { const addButton = event.target.closest('.add-product'); if (addButton) add(addButton.dataset.id); const step = event.target.closest('[data-step]'); if (step) { const input = document.getElementById('product-quantity'); input.value = Math.max(1, Math.min(999, (Number(input.value) || 1) + Number(step.dataset.step))); } const detailButton = event.target.closest('#detail-add'); if (detailButton) { const input = document.getElementById('product-quantity'); if (input.reportValidity() && Number.isInteger(Number(input.value)) && Number(input.value) >= 1) add(detailButton.dataset.id, Number(input.value)); } if (event.target.closest('#edit-selection')) { drawBasket(); basketDialog.showModal(); } });
document.getElementById('open-basket').addEventListener('click', () => { drawBasket(); basketDialog.showModal(); });
basketDialog.addEventListener('click', event => { if (event.target.closest('[data-close]') || event.target.closest('a[href]')) basketDialog.close(); const remove = event.target.closest('[data-remove]'); const change = event.target.closest('[data-change]'); if (remove) basket = basket.filter(row => row.id !== remove.dataset.remove); if (change) { const row = basket.find(item => item.id === change.dataset.id); row.quantity = Math.max(0, Math.min(999, row.quantity + Number(change.dataset.change))); basket = basket.filter(item => item.quantity > 0); } if (remove || change) { persist(); drawBasket(); selection(); } });
document.getElementById('basket-enquire').addEventListener('click', () => { basketDialog.close(); openEnquiryPopup(); });
document.getElementById('menu').addEventListener('click', () => { const open = document.getElementById('nav').classList.toggle('open'); document.getElementById('menu').setAttribute('aria-expanded', String(open)); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
window.addEventListener('hashchange', () => { render(); main.focus({ preventScroll: true }); });
document.getElementById('year').textContent = new Date().getFullYear();
document.getElementById('mobile-basket').addEventListener('click', () => { drawBasket(); basketDialog.showModal(); });
function updateMobileNavigation() {
  const route = currentRoute();
  document.querySelectorAll('.mobile-navigation a').forEach(link => {
    const active = link.dataset.route === route || (route.startsWith('/product/') && link.dataset.route === '/products');
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
}
window.addEventListener('hashchange', updateMobileNavigation);
const enquiryPopup = document.getElementById('enquiry-popup');
let enquiryOpener;
function openEnquiryPopup() {
  enquiryOpener = document.activeElement;
  closeMenu();
  const summary = basket.map(row => config.products.find(p => p.id === row.id).name + ' (' + row.quantity + ' packs)').join(', ');
  document.getElementById('popup-selection').textContent = summary ? 'Included in your enquiry: ' + summary : 'Product, retail, distribution and bulk enquiries welcome.';
  if (!enquiryPopup.open) enquiryPopup.showModal();
  document.querySelector('#popup-enquiry-form input[name="name"]').focus();
}
document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-open-enquiry]');
  if (!trigger) return;
  document.getElementById('review-rating').hidden = true;
  document.getElementById('review-rating').disabled = true;
  const form = document.getElementById('popup-enquiry-form');
  if (trigger.dataset.enquiryType) form.elements.type.value = trigger.dataset.enquiryType;
  if (trigger.dataset.enquiryProduct) {
    const product = config.products.find(p => p.id === trigger.dataset.enquiryProduct);
    const quantity = document.getElementById('product-quantity');
    if (!quantity.reportValidity() || !Number.isInteger(Number(quantity.value)) || Number(quantity.value) < 1) return;
    const request = 'Please share pricing and availability for ' + quantity.value + ' pack(s) of ' + product.name + ' banana chips.';
    if (!form.elements.message.value.includes(request)) form.elements.message.value = [form.elements.message.value.trim(), request].filter(Boolean).join('\n');
  }
  openEnquiryPopup();
});
document.getElementById('close-enquiry-popup').addEventListener('click', () => enquiryPopup.close());
enquiryPopup.addEventListener('click', event => {
  if (event.target !== enquiryPopup) return;
  const bounds = enquiryPopup.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) enquiryPopup.close();
});
enquiryPopup.addEventListener('close', () => { if (enquiryOpener?.isConnected) enquiryOpener.focus(); });
document.getElementById('popup-pack-size').innerHTML = '<option value="">Please select</option>' + config.packSizes.map(size => '<option>' + escapeHTML(size) + '</option>').join('') + '<option>Mixed sizes</option>';
document.getElementById('popup-enquiry-form').addEventListener('submit', submitEnquiry);

document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-write-review]');
  if (!trigger) return;
  const product = config.products.find(p => p.id === trigger.dataset.writeReview);
  const form = document.getElementById('popup-enquiry-form');
  const rating = document.getElementById('review-rating');
  rating.hidden = false;
  rating.disabled = false;
  form.elements.type.value = 'Other';
  form.elements.message.value = product ? 'My review of ' + product.name + ' banana chips: ' : '';
  openEnquiryPopup();
  document.getElementById('popup-selection').textContent = product ? 'Review: ' + product.name : 'Tell us which flavour you tried and share your experience.';
});

main.addEventListener('click', async event => {
  const button = event.target.closest('[data-share-product]');
  if (!button || button.disabled) return;
  const product = config.products.find(item => item.id === button.dataset.shareProduct);
  if (!product) return;
  const url = new URL(pageUrl('/product/' + product.id), location.origin).href;
  const panel = button.closest('.product-share');
  const status = panel.querySelector('.share-status');
  const fallback = panel.querySelector('.share-fallback');
  status.textContent = '';
  fallback.hidden = true;
  button.disabled = true;
  try {
    if (navigator.share) {
      await navigator.share({ title: product.name + ' | New Indifood', text: 'Explore New Indifood ' + product.name + ' banana chips.', url });
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      status.textContent = 'Product link copied.';
    } else {
      throw new Error('Sharing unavailable');
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      fallback.hidden = false;
      const input = fallback.querySelector('input');
      input.value = url;
      input.focus();
      input.select();
      status.textContent = 'Copy this link to share the product.';
    }
  } finally { button.disabled = false; }
});
const backToTop = document.getElementById('back-to-top');
function updateBackToTop() { backToTop.hidden = window.scrollY < 600; }
window.addEventListener('scroll', updateBackToTop, { passive: true });
backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  document.querySelector('.header .logo').focus({ preventScroll: true });
});
updateBackToTop();
persist(); render(); updateMobileNavigation();
