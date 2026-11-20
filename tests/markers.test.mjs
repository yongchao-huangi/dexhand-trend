import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkSmartypants from 'remark-smartypants';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { extractMarkedItems, slug, splitMarkerText } from '../src/markers.mjs';
import rehypeMarkers from '../src/rehype-markers.mjs';
import { SOURCE_ORDER, reorderBriefBody, sortSources } from '../src/source-order.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = fs.readFileSync(path.join(root, 'tests/fixtures/2026-11-21.md'), 'utf8');
const fixtureBody = fixture.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');

function text(value) { return { type: 'text', value }; }
function el(tagName, children, properties) {
  return { type: 'element', tagName, properties: properties || {}, children };
}

async function toHtml(md, markers) {
  let proc = unified().use(remarkParse).use(remarkGfm).use(remarkSmartypants).use(remarkRehype, { allowDangerousHtml: true });
  if (markers) proc = proc.use(rehypeMarkers);
  proc = proc.use(rehypeStringify, { allowDangerousHtml: true });
  return String(await proc.process(md));
}

describe('markers', () => {
  it('parses the fixture in document order', () => {
    const items = extractMarkedItems(fixtureBody);
    assert.deepEqual(items.map((it) => [it.id, it.importance, it.title, it.tags, it.section]), [
      ['item-1', 4, '样例：触觉 VLA 零样本抓取', ['VLA', '触觉'], 'X · 个人讨论与观点'],
      ['item-2', 5, '样例：掌内转笔', ['掌内操作', 'RL', '仿真/sim2real'], 'X · 个人讨论与观点'],
      ['item-3', 3, '样例：模仿学习抓取基准', ['抓取', '模仿学习'], 'arXiv'],
      ['item-4', 2, '样例：遥操作和数据手套', ['重定向/遥操作', '数据'], 'Hacker News 与 Reddit'],
      ['item-5', 1, '样例：英文博客谈硬件成本', ['硬件', '产业'], '英文媒体与博客'],
    ]);
  });

  it('accepts an ascii pipe and chinese commas, and ignores out-of-range scores', () => {
    const items = extractMarkedItems('- **甲**〔重要度 3|RL，数据〕\n- **乙**〔重要度 9｜触觉〕\n- **丙**〔重要度 0｜抓取〕\n');
    assert.equal(items.length, 1);
    assert.equal(items[0].importance, 3);
    assert.deepEqual(items[0].tags, ['RL', '数据']);
  });

  it('ignores markers inside fenced code', () => {
    const items = extractMarkedItems('```\n〔重要度 4｜VLA〕\n```\n- **真**〔重要度 2｜硬件〕\n');
    assert.equal(items.length, 1);
    assert.equal(items[0].id, 'item-1');
    assert.equal(items[0].importance, 2);
  });

  it('leaves published posts unmarked', () => {
    for (const kind of ['daily', 'weekly']) {
      const dir = path.join(root, 'src/content', kind);
      for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
        const items = extractMarkedItems(fs.readFileSync(path.join(dir, name), 'utf8'));
        assert.equal(items.length, 0, `${kind}/${name}`);
      }
    }
  });

  it('slug encodes a slash as a single path segment', () => {
    const s = slug('重定向/遥操作');
    assert.equal(s.includes('%2F'), false);
    assert.equal(decodeURIComponent(s), '重定向／遥操作');
    assert.equal(splitMarkerText('〔重要度 4｜重定向/遥操作〕')[0].tags[0], '重定向/遥操作');
  });
});

describe('rehype markers', () => {
  it('renders badges outside the link and keeps code fences raw', () => {
    const tree = {
      type: 'root',
      children: [
        el('pre', [el('code', [text('〔重要度 4｜VLA〕')])]),
        el('p', [
          el('strong', [el('a', [text('标题')], { href: 'https://example.com' })]),
          text('〔重要度 4｜VLA、触觉〕后文'),
        ]),
      ],
    };
    rehypeMarkers()(tree);
    const p = tree.children[1];
    assert.equal(p.children[0].tagName, 'strong');
    assert.equal(p.children[1].tagName, 'span');
    assert.equal(p.children[1].properties.id, 'item-1');
    assert.equal(p.children[2].value, '后文');
    assert.equal(tree.children[0].children[0].children[0].value, '〔重要度 4｜VLA〕');
    const badge = p.children[1].children[0];
    assert.equal(badge.properties.dataTier, '4');
    assert.equal(p.children[1].children[1].properties.href, '/tags/VLA/');
    assert.equal(p.children[1].children[2].properties.href, `/tags/${slug('触觉')}/`);
  });

  it('matches extract ids on the fixture and drops the raw marker', async () => {
    const html = await toHtml(fixtureBody, true);
    const items = extractMarkedItems(fixtureBody);
    for (const it of items) {
      assert.match(html, new RegExp(`id="${it.id}"`));
      assert.match(html, new RegExp(`data-tier="${it.importance}"`));
    }
    assert.equal(html.includes('〔重要度'), false);
    assert.match(html, new RegExp(`/tags/${slug('重定向/遥操作')}/`));
    assert.match(html, new RegExp(`/tags/${slug('仿真/sim2real')}/`));
  });

  it('does not change published markdown', async () => {
    for (const kind of ['daily', 'weekly']) {
      const dir = path.join(root, 'src/content', kind);
      for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
        const raw = fs.readFileSync(path.join(dir, name), 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
        const plain = await toHtml(raw, false);
        const marked = await toHtml(raw, true);
        assert.equal(marked, plain, `${kind}/${name}`);
      }
    }
  });
});

describe('source order', () => {
  it('places the new sections after arXiv and before 中文媒体', () => {
    assert.deepEqual(SOURCE_ORDER, ['X', '小红书', 'GitHub', 'arXiv', 'Hacker News 与 Reddit', '英文媒体与博客', '微信']);
    assert.deepEqual(sortSources(['微信', '英文媒体与博客', 'X', 'Hacker News 与 Reddit']), ['X', 'Hacker News 与 Reddit', '英文媒体与博客', '微信']);
    const body = [
      'intro',
      '',
      '### 中文媒体 / 微信公众号',
      'w',
      '',
      '### 英文媒体与博客',
      'e',
      '',
      '### X · 个人讨论与观点',
      'x',
      '',
      '### Hacker News 与 Reddit',
      'h',
      '',
      '### arXiv',
      'a',
      '',
    ].join('\n');
    const out = reorderBriefBody(body);
    const at = (s) => out.indexOf(s);
    assert.ok(at('### X') < at('### arXiv'));
    assert.ok(at('### arXiv') < at('### Hacker News 与 Reddit'));
    assert.ok(at('### Hacker News 与 Reddit') < at('### 英文媒体与博客'));
    assert.ok(at('### 英文媒体与博客') < at('### 中文媒体'));
    assert.ok(out.startsWith('intro'));
  });

  it('keeps already ordered source sections byte-for-byte, including published posts', () => {
    const ordered = 'lead\n\n### X\nx\n\n### arXiv\na\n\n### Hacker News 与 Reddit\nh\n\n### 英文媒体与博客\ne\n\n### 中文媒体 / 微信公众号\nw\n';
    assert.equal(reorderBriefBody(ordered), ordered);
    for (const kind of ['daily', 'weekly']) {
      const dir = path.join(root, 'src/content', kind);
      for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
        const raw = fs.readFileSync(path.join(dir, name), 'utf8');
        const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
        assert.equal(reorderBriefBody(body), body, `${kind}/${name}`);
      }
    }
  });
});
