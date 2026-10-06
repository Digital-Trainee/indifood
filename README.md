# New Indifood website

Run `npm start` and open http://localhost:5500. Use `npm run build` after editing content and `npm test` to run checks.

## Pages

Home, Products, nine individual flavour pages, About, Quality & Hygiene, Bulk Orders, Contact, FAQs, Privacy, Thank You, and 404. URLs have no .html extension.

## Editing

- `assets/data/products.js`: nine catalogue flavours, pack sizes and contact settings.
- `assets/js/app.js`: page content and interactions.
- `templates/layout.html`: shared navigation and footer.
- `assets/css/styles.css`: responsive styling.
- `scripts/build-pages.cjs`: generates the 19 HTML pages.
- `scripts/server.cjs`: clean URL preview server.
- `tests/`: content, interaction, link and server checks.

Generated HTML files should be rebuilt from these sources.

## Business content

Content supplied by the owner: New Indifood; established 2018; Umesh Babarao Mukke; KVK Tondapur training on 11 January 2021; approximate 1,200 sq. ft. facility; capacity up to 300 kg per day; 10 workers (7 women and 3 men). Quality and hygiene statements follow the supplied copy; no certification numbers or additional accreditations have been added.

Flavours: Chatpata, Masala, Salted, Peri Peri, Sweet, Pudina, Onion & Tomato.
Pack sizes: 100 g, 200 g, 500 g, 1 kg.
Phone: +91 96235 44741.
Address: Khajmapur, Near ZP School, Post Girgaon, Taluka Vasmath, District Hingoli, Maharashtra - 431512.

## Enquiries and images

The header Enquire button and basket's Continue to enquiry action open an accessible enquiry dialog. It includes contact details, pack size, enquiry type, requirements, and the current basket. Close it with the X button, Escape, or a click outside. Draft inputs survive closing and reopening within the page; no personal details are stored persistently. Both forms POST JSON to `/api/leads`. The Node server forwards validated details to Privyr and the browser redirects to `/thank-you` only after a successful response. Errors preserve inputs and allow retrying.

The phone links open the visitor's calling app. The enquiry forms send contact details, selected products, pack size and requirements to Privyr. An enquiry does not place an order. No email address, WhatsApp availability, prices or delivery terms have been assumed.

The supplied logo is preserved. Uploaded packaging images are stored in `assets/images/products/`. Masala, Salted and Peri Peri use their matching uploaded images in product cards, detail views and the basket. The Home and Products pages show each product image once in the product grid; the duplicate packaging gallery has been removed. The two Masala uploads were identical. Garlic and Sweet & Spicy are included as separate catalogue products using their matching packaging images, bringing the range to nine flavours. Chatpata, Sweet, Pudina and Onion & Tomato now have AI-generated matching packaging images (PNG), created with the built-in image generation tool using the supplied Classic Salted package as reference. These are packaging concepts, not photographs of manufactured packs. All nine products have dedicated images in cards, details, and the basket. Packaging images are shown fully without cropping.

The basket stores product IDs and quantities locally. Contact details are forwarded through the server to Privyr to manage the enquiry; they are not saved in browser storage.

## Lead configuration

The server loads `.env` using Node's built-in environment-file loader (Node 22+). `PRIVYR_WEBHOOK_URL` is configured there; its fragment is removed because URL fragments are not sent in HTTP requests. `.env` is ignored by Git and cannot be served by the web server. Use `.env.example` for new installations and keep the real webhook private.

The Privyr payload contains `name`, `email`, `phone`, `display_name`, `notes`, `source`, and `other_fields` for city, enquiry type, business, pack size, products and form origin. Server-side validation and a delivery timeout are included. Live forms require the Node server and outbound HTTPS access to Privyr; static-only hosting cannot handle submissions.

Tests use an injected mock webhook. No test lead was submitted to the real account.

## Publishing

Every generated page includes its own title and description, Open Graph and Twitter preview metadata, a brand-colour SVG favicon, robots directives, and business structured data. The 404 page is marked noindex.

The build reads `SITE_URL` from `.env` or your hosting environment. Hosting environment values take precedence. Set it to the final HTTPS domain, including your preferred `www` or non-`www` hostname, without a page path:

```dotenv
SITE_URL=https://your-domain.com
```

Then build and restart the Node application:

```powershell
$env:NODE_ENV = 'production'
npm run build
npm start
```

Deployments should install build dependencies with `npm ci`, run `npm run build` with `SITE_URL` and `NODE_ENV=production` configured, and start the server with `npm start`. Configure the process manager/reverse proxy for your hosting environment and retain the private `PRIVYR_WEBHOOK_URL` setting.

Examples using the configured domain:

| Page | Canonical |
| --- | --- |
| Home | `https://your-domain.com/` |
| Products | `https://your-domain.com/products` |
| About | `https://your-domain.com/about` |
| Pudina | `https://your-domain.com/products/pudina` |

Canonical URLs are written into each page's HTML at build time and match `og:url`. They use the clean page path without `.html`, query parameters, or fragments. Product social previews use the matching product photo. The 404 page has no canonical; 404 and Thank You are `noindex`.

After changing domains, update `SITE_URL` and rebuild/redeploy. Changing only the runtime environment does not rewrite existing HTML. Redirect alternate hostnames to your chosen public hostname at the hosting/proxy layer. Canonical URLs are not derived from an incoming request's Host header.

Leave `SITE_URL` blank during local development: canonical and Open Graph page URLs are omitted rather than pointing search engines to localhost. A production build fails if `SITE_URL` is missing, non-HTTPS, localhost, or includes a path/query/fragment.

Serve generated root HTML files, `products/` and `assets/` through clean URL routing. Keep development dependencies, tests and templates outside public hosting. The provided server supports clean URLs, .html redirects and a branded 404 response.
# Customer Reviews

Product ratings and homepage testimonials use `reviews` in `assets/data/products.js`. Keep this list empty until genuine customer feedback is approved for publication. Add entries with `productId`, `rating` (integer 1 to 5), `name` (approved public display name), and `text`, then run `npm run build`. Do not include contact details in public entries.

The Write a review popup sends the rating and feedback to Privyr through the existing enquiry endpoint. Publication is manual; there is no moderation dashboard or automatic verification of purchases.
