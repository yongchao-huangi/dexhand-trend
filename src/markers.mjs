// Item headlines may end with 〔重要度 4｜VLA、触觉〕.
// Importance is an ASCII digit 1–5. Tags are split on 、 , ， (not /).
// Unknown tags are kept so a typo is still visible; ITEM_TAGS is the intended vocabulary.

export const ITEM_TAGS = ['RL', '模仿学习', 'VLA', '重定向/遥操作', '掌内操作', '抓取', '触觉', '仿真/sim2real', '硬件', '数据', '产业'];

const MARKER_SRC = '〔\\s*重要度\\s*([1-5])\\s*[｜|]\\s*([^〕]*?)\\s*〕';

export function slug(t) {
  return encodeURIComponent(String(t).replaceAll('/', '\uFF0F'));
}

export function splitTags(raw) {
  return String(raw ?? '').split(/[、,，]/).map((s) => s.trim()).filter(Boolean);
}

/** Split a string into text and marker parts. Null when it has no marker. */
export function splitMarkerText(value) {
  const re = new RegExp(MARKER_SRC, 'g');
  const parts = [];
  let last = 0;
  let m;
  while ((m = re.exec(value))) {
    if (m.index > last) parts.push({ type: 'text', value: value.slice(last, m.index) });
    parts.push({ type: 'marker', importance: Number(m[1]), tags: splitTags(m[2]) });
    last = m.index + m[0].length;
  }
  if (!parts.some((p) => p.type === 'marker')) return null;
  if (last < value.length) parts.push({ type: 'text', value: value.slice(last) });
  return parts;
}

export function stripMd(s) {
  let t = String(s);
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  t = t.replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1');
  t = t.replace(/`([^`]+)`/g, '$1');
  t = t.replace(/^#{1,6}\s+/, '');
  t = t.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '');
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/__([^_]+)__/g, '$1');
  return t.replace(/\s+/g, ' ').trim();
}

function cleanSection(s) {
  return String(s).replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
}

/** Marked items in document order. Ids are item-1, item-2, … and match the rehype plugin. */
export function extractMarkedItems(markdown) {
  const items = [];
  let section = '';
  let n = 0;
  let fence = false;
  const lines = String(markdown).replace(/\r\n/g, '\n').split('\n');
  for (const line of lines) {
    if (/^\s*```/.test(line)) { fence = !fence; continue; }
    if (fence) continue;
    const heading = line.match(/^#{1,6}\s+(.*?)\s*#*\s*$/);
    if (heading && !splitMarkerText(heading[1])) { section = cleanSection(heading[1]); continue; }
    const parts = splitMarkerText(line);
    if (!parts) continue;
    let buf = '';
    for (const p of parts) {
      if (p.type === 'text') { buf += p.value; continue; }
      n += 1;
      items.push({
        id: `item-${n}`,
        importance: p.importance,
        tags: p.tags,
        title: stripMd(buf) || '未命名条目',
        section,
        order: n,
      });
      buf = '';
    }
  }
  return items;
}
