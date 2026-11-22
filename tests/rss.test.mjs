import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import { getRssString } from '@astrojs/rss';
import { feedSelfUrl, siteWithBase } from '../src/site-url.mjs';
import { buildFeedOptions, itemPath } from '../src/feed.mjs';

const ORIGIN = 'https://yongchao-huangi.github.io';
const ROOT = `${ORIGIN}/dexhand-trend/`;

describe('siteWithBase', () => {
  it('joins the GitHub Pages origin with the project base', () => {
    assert.equal(siteWithBase(ORIGIN, '/dexhand-trend').href, ROOT);
    assert.equal(siteWithBase(`${ORIGIN}/`, '/dexhand-trend/').href, ROOT);
    assert.equal(siteWithBase(new URL(ORIGIN), '/dexhand-trend').href, ROOT);
  });

  it('does not double the base when site already contains it', () => {
    assert.equal(siteWithBase(`${ORIGIN}/dexhand-trend`, '/dexhand-trend/').href, ROOT);
  });

  it('keeps a root deployment on the origin', () => {
    assert.equal(siteWithBase('http://localhost:4321', '/').href, 'http://localhost:4321/');
    assert.equal(siteWithBase('http://localhost:4321/', '/').href, 'http://localhost:4321/');
  });

  it('points the atom self URL at rss.xml under that root', () => {
    assert.equal(feedSelfUrl(siteWithBase(ORIGIN, '/dexhand-trend')).href, `${ROOT}rss.xml`);
    assert.equal(feedSelfUrl('http://localhost:4321/').href, 'http://localhost:4321/rss.xml');
  });
});

describe('item paths', () => {
  it('keeps the project base on daily permalinks and omits it at the root', () => {
    assert.equal(itemPath('/dexhand-trend/', '2026-11-16'), '/dexhand-trend/daily/2026-11-16/');
    assert.equal(itemPath('/dexhand-trend', '2026-11-16'), '/dexhand-trend/daily/2026-11-16/');
    assert.equal(itemPath('/', '2026-11-16'), '/daily/2026-11-16/');
  });
});

describe('rss document', () => {
  const item = {
    title: '灵巧手每日简报 · 2026-11-16',
    pubDate: new Date('2026-11-16T00:00:00Z'),
    description: '摘要',
    categories: ['X', '触觉'],
  };

  it('puts the project base on every absolute URL', async () => {
    const xml = await getRssString(buildFeedOptions({
      site: ORIGIN,
      base: '/dexhand-trend/',
      items: [{ ...item, link: itemPath('/dexhand-trend/', '2026-11-16') }],
    }));
    assert.match(xml, new RegExp(`<link>${ROOT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</link>`));
    assert.match(xml, /<atom:link\b[^>]*href="https:\/\/yongchao-huangi\.github\.io\/dexhand-trend\/rss\.xml"[^>]*rel="self"/);
    assert.match(xml, /type="application\/rss\+xml"/);
    assert.match(xml, /<language>zh-CN<\/language>/);
    assert.match(xml, /<link>https:\/\/yongchao-huangi\.github\.io\/dexhand-trend\/daily\/2026-11-16\/<\/link>/);
    assert.match(xml, /<guid[^>]*>https:\/\/yongchao-huangi\.github\.io\/dexhand-trend\/daily\/2026-11-16\/<\/guid>/);
    assert.equal(xml.includes(`<link>${ORIGIN}/</link>`), false);
    assert.equal(xml.includes('/dexhand-trend/dexhand-trend/'), false);
    const linked = [
      ...xml.matchAll(/<(?:link|guid)\b[^>]*>\s*(https?:\/\/[^<\s]+)\s*<\/(?:link|guid)>/g),
      ...xml.matchAll(/<atom:link\b[^>]*\bhref="(https?:\/\/[^"]+)"/g),
    ].map((m) => m[1]);
    assert.ok(linked.length >= 3);
    for (const url of linked) assert.ok(url.startsWith(ROOT), url);
  });

  it('does not invent a project base for a root site', async () => {
    const xml = await getRssString(buildFeedOptions({
      site: 'http://localhost:4321',
      base: '/',
      items: [{ ...item, link: itemPath('/', '2026-11-16') }],
    }));
    assert.match(xml, /<link>http:\/\/localhost:4321\/<\/link>/);
    assert.match(xml, /href="http:\/\/localhost:4321\/rss\.xml"/);
    assert.match(xml, /<link>http:\/\/localhost:4321\/daily\/2026-11-16\/<\/link>/);
    assert.equal(xml.includes('/dexhand-trend/'), false);
  });

  it('wires the endpoint through the shared helper', () => {
    const src = fs.readFileSync(new URL('../src/pages/rss.xml.js', import.meta.url), 'utf8');
    assert.match(src, /return rss\(buildFeedOptions\(/);
    assert.match(src, /itemPath\(base/);
    assert.equal(/return rss\(\{/.test(src), false);
  });
});
