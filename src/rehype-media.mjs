// 根据 src/data/media.json，把精选条目链接对应的图片插到条目后（不改正文文字）
import fs from 'node:fs';
const MAP = JSON.parse(fs.readFileSync(new URL('./data/media.json', import.meta.url)));
const BASE = (process.env.BASE || '/').replace(/\/$/, '');
const keyOf = (u = '') => {
  let m = u.match(/arxiv\.org\/(?:abs|html|pdf)\/(\d{4}\.\d{4,5})/); if (m) return 'arxiv:' + m[1];
  m = u.match(/(?:x|twitter)\.com\/\w+\/status\/(\d+)/); if (m) return 'x:' + m[1];
  m = u.match(/xiaohongshu\.com\/explore\/([0-9a-f]+)/); if (m) return 'xhs:' + m[1];
  return null;
};
const h = (tag, props, children = []) => ({ type: 'element', tagName: tag, properties: props, children });
const txt = (value) => ({ type: 'text', value });
const licName = (l) => !l ? '' : l.includes('creativecommons') ? 'CC ' + (l.match(/licenses\/([^/]+)\/([^/]+)/) || []).slice(1).join(' ').toUpperCase() : 'arXiv 非独占许可';
function figure(key) {
  const e = MAP[key];
  return e.images.map((im) => h('figure', { className: ['media', 'media-' + e.platform.toLowerCase()] }, [
    h('a', { href: BASE + im.src, className: ['zoom'], 'data-zoom': '' }, [
      h('img', { src: BASE + im.src, width: im.w, height: im.h, loading: 'lazy', decoding: 'async', alt: `${e.author} 在 ${e.platform} 发布的配图` }),
      ...(im.video ? [h('span', { className: ['play'] }, [txt('▶ 视频')])] : []),
    ]),
    h('figcaption', {}, [txt('图源：'), h('a', { href: e.href, target: '_blank', rel: 'noopener' }, [txt(`${e.author || '原作者'} / ${e.platform}`)]),
      ...(e.license ? [txt(' · ' + licName(e.license))] : [])]),
  ]));
}
function links(node, out = []) {
  if (node.tagName === 'a' && node.properties?.href) { const k = keyOf(String(node.properties.href)); if (k && MAP[k]) out.push(k); }
  for (const c of node.children || []) if (c.type === 'element' && !['ul', 'ol'].includes(c.tagName)) links(c, out);
  return out;
}
export default function rehypeMedia() {
  return (tree) => {
    const used = new Set();
    const take = (ks) => ks.filter((k) => !used.has(k) && used.add(k));
    const walk = (parent) => {
      const kids = parent.children || [];
      for (let i = 0; i < kids.length; i++) {
        const n = kids[i]; if (n.type !== 'element') continue;
        if (n.tagName === 'table') {
          const ks = []; const coll = (x) => { if (x.type === 'element') { if (x.tagName === 'a') { const k = keyOf(String(x.properties?.href)); if (k && MAP[k]) ks.push(k); } (x.children || []).forEach(coll); } }; coll(n);
          const t = take(ks); if (t.length) { kids.splice(i + 1, 0, h('div', { className: ['media-strip'] }, t.flatMap(figure))); i++; }
        } else if (n.tagName === 'li' || n.tagName === 'p') {
          const t = take(links(n)); if (t.length) {
            const g = h('div', { className: ['media-row'] }, t.flatMap(figure));
            if (n.tagName === 'li') { const sub = (n.children || []).findIndex((c) => ['ul', 'ol'].includes(c.tagName)); sub >= 0 ? n.children.splice(sub, 0, g) : n.children.push(g); }
            else { kids.splice(i + 1, 0, g); i++; }
          }
          walk(n);
        } else walk(n);
      }
    };
    walk(tree);
  };
}
