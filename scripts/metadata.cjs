function metadataConfig(env = process.env) {
  const value = (env.SITE_URL || '').trim();
  if (!value) {
    if (env.NODE_ENV === 'production') throw new Error('Set SITE_URL to the public HTTPS domain before a production build.');
    return { origin: null, publicUrl: pathname => pathname, canonicalUrl: () => null };
  }
  let site;
  try { site = new URL(value); } catch { throw new Error('SITE_URL must be an HTTP(S) origin, such as https://your-domain.com.'); }
  if (!['https:', 'http:'].includes(site.protocol) || site.username || site.password || site.pathname !== '/' || site.search || site.hash) {
    throw new Error('SITE_URL must contain only the protocol and domain, without a path, query or fragment.');
  }
  if (env.NODE_ENV === 'production' && (site.protocol !== 'https:' || site.hostname === 'localhost' || site.hostname === '[::1]' || /^127\./.test(site.hostname))) {
    throw new Error('Production SITE_URL must use HTTPS and a public domain.');
  }
  const publicUrl = pathname => new URL(pathname, site.origin).href;
  return {
    origin: site.origin,
    publicUrl,
    canonicalUrl: file => file === '404.html' ? null : publicUrl(file === 'index.html' ? '/' : '/' + file.replace(/\.html$/, ''))
  };
}
module.exports = { metadataConfig };
