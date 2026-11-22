/** Absolute site root, including Astro `base` (for example GitHub Pages `/dexhand-trend/`). */
export function siteWithBase(site, base = '/') {
  const href = site instanceof URL ? site.href : String(site ?? '');
  if (!href) throw new Error('site is empty');
  let path = base == null || base === '' ? '/' : String(base);
  if (!path.startsWith('/')) path = `/${path}`;
  if (!path.endsWith('/')) path += '/';
  return new URL(path, href);
}

/** Canonical URL of `/rss.xml` under a site root that already includes `base`. */
export function feedSelfUrl(site) {
  const root = site instanceof URL ? new URL(site.href) : new URL(String(site));
  if (!root.pathname.endsWith('/')) root.pathname = `${root.pathname}/`;
  return new URL('rss.xml', root);
}
