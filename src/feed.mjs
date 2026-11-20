import { feedSelfUrl, siteWithBase } from './site-url.mjs';

/** Path-absolute daily permalink. `base` is Astro `BASE_URL` (`/` or `/dexhand-trend/`). */
export function itemPath(base, id) {
  const root = String(base ?? '/').replace(/\/$/, '');
  return `${root}/daily/${id}/`;
}

function xmlAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Options for `@astrojs/rss`. `site` must include `base`, or the channel `<link>`
 * (and the atom self URL) point at the origin and 404 off the project site.
 * Item `link` values stay path-absolute from the origin (`/dexhand-trend/daily/…`),
 * so a site URL that already contains `base` does not double-prefix them.
 */
export function buildFeedOptions({ site, base, items }) {
  const rooted = siteWithBase(site, base);
  const self = feedSelfUrl(rooted).href;
  return {
    title: '灵巧手趋势',
    description: '灵巧手领域每日趋势：精选摘要，附原文链接。',
    site: rooted.href,
    trailingSlash: true,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: `<language>zh-CN</language><atom:link href="${xmlAttr(self)}" rel="self" type="application/rss+xml"/>`,
    items,
  };
}
