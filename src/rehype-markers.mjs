// Replace 〔重要度 N｜标签〕 in rendered markdown with a badge and tag chips.
// Anchor ids follow document order (item-1, …) so they match extractMarkedItems.
import { slug, splitMarkerText } from './markers.mjs';

const INLINE = new Set(['strong', 'em', 'a', 'b', 'i', 'del', 'ins']);
const SKIP = new Set(['code', 'pre', 'script', 'style']);

function classList(node) {
  const cl = node?.properties?.className;
  if (Array.isArray(cl)) return cl.map(String);
  if (typeof cl === 'string') return cl.split(/\s+/);
  return [];
}
function isMeta(node) {
  return node?.type === 'element' && classList(node).includes('item-meta');
}

function tagHref(tag) {
  const base = (process.env.BASE || '/').replace(/\/$/, '');
  return `${base}/tags/${slug(tag)}/`;
}

function markerEl(importance, tags, id) {
  return {
    type: 'element',
    tagName: 'span',
    properties: { className: ['item-meta'], id },
    children: [
      {
        type: 'element',
        tagName: 'span',
        properties: {
          className: ['imp'],
          dataTier: String(importance),
          title: `重要度 ${importance}`,
          ariaLabel: `重要度 ${importance}`,
        },
        children: [{ type: 'text', value: String(importance) }],
      },
      ...tags.map((t) => ({
        type: 'element',
        tagName: 'a',
        properties: { className: ['tag', 'item-tag'], href: tagHref(t) },
        children: [{ type: 'text', value: `#${t}` }],
      })),
    ],
  };
}

function replaceText(value, alloc) {
  const parts = splitMarkerText(value);
  if (!parts) return null;
  return parts.map((p) => (p.type === 'text' ? { type: 'text', value: p.value } : markerEl(p.importance, p.tags, alloc())));
}

/** Pull badges out of bold/links so tag chips are not nested inside another link. */
function hoist(node) {
  if (!node?.children) return;
  const next = [];
  for (const child of node.children) {
    if (child.type === 'element') hoist(child);
    if (child.type === 'element' && INLINE.has(child.tagName) && (child.children || []).some(isMeta)) {
      let buf = [];
      const flush = () => {
        if (!buf.length) return;
        next.push({ type: 'element', tagName: child.tagName, properties: child.properties, children: buf });
        buf = [];
      };
      for (const g of child.children) {
        if (isMeta(g)) { flush(); next.push(g); }
        else buf.push(g);
      }
      flush();
    } else next.push(child);
  }
  node.children = next;
}

export default function rehypeMarkers() {
  return (tree) => {
    let n = 0;
    const alloc = () => `item-${++n}`;
    const walk = (node) => {
      const kids = node.children;
      if (!kids) return;
      if (node.type === 'element' && SKIP.has(node.tagName)) return;
      for (let i = 0; i < kids.length; i++) {
        const c = kids[i];
        if (c.type === 'text' && c.value.includes('〔')) {
          const repl = replaceText(c.value, alloc);
          if (repl) { kids.splice(i, 1, ...repl); i += repl.length - 1; continue; }
        }
        if (c.type === 'element' || c.type === 'root') walk(c);
      }
    };
    walk(tree);
    hoist(tree);
  };
}
