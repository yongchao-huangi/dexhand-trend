// Display order for source sections and source tags.
// Lead copy (今日要点 / 本周要点, etc.) stays put; these five sources follow it.
export const SOURCE_ORDER = ['X', '小红书', 'GitHub', 'arXiv', '微信'];

const RANK = { x: 0, xhs: 1, gh: 2, arxiv: 3, wx: 4 };

export function sortSources(list) {
  const rank = (s) => {
    const i = SOURCE_ORDER.indexOf(s);
    return i < 0 ? SOURCE_ORDER.length : i;
  };
  return [...list].sort((a, b) => rank(a) - rank(b));
}

function headingMode(body) {
  if (/^## /m.test(body)) return /^## /;
  if (/^### /m.test(body)) return /^### /;
  return /^\*\*[^*]+\*\*(（[^）]*）)?\s*$/;
}

function splitSections(body) {
  const isHeading = headingMode(body);
  const lines = body.split('\n');
  const chunks = [];
  let cur = [];
  for (const line of lines) {
    if (isHeading.test(line) && cur.some((l) => l.trim())) {
      chunks.push(cur.join('\n'));
      cur = [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.length) chunks.push(cur.join('\n'));
  return chunks.filter((c) => c.trim());
}

function kindOf(chunk) {
  const line = chunk.split('\n').find((l) => l.trim()) || '';
  let t = line.replace(/^#{2,3}\s+/, '');
  const bold = t.match(/^\*\*([^*]+)\*\*/);
  if (bold) t = bold[1];
  t = t.trim().replace(/（[^）]*）\s*$/, '').trim().replace(/^分源[：:]\s*/, '');
  if (/^X(讨论|[\s·｜|:：\/]|$)/.test(t)) return 'x';
  if (t.startsWith('小红书')) return 'xhs';
  if (/^GitHub\b/i.test(t)) return 'gh';
  if (/^arXiv\b/i.test(t)) return 'arxiv';
  if (/微信|中文媒体|公众号/.test(t)) return 'wx';
  return 'other';
}

function joinChunks(chunks) {
  let out = '';
  for (const raw of chunks) {
    const c = raw.replace(/^\n+/, '');
    if (!out) { out = c; continue; }
    if (!out.endsWith('\n')) out += '\n';
    if (!out.endsWith('\n\n')) out += '\n';
    out += c;
  }
  return out;
}

/** Reorder source sections inside a brief body. Non-source blocks stay in place. */
export function reorderBriefBody(body) {
  const chunks = splitSections(body);
  const slots = [];
  const sources = [];
  chunks.forEach((c, i) => {
    const k = kindOf(c);
    if (k in RANK) {
      slots.push(i);
      sources.push({ c, k, i });
    }
  });
  sources.sort((a, b) => RANK[a.k] - RANK[b.k] || a.i - b.i);
  const next = chunks.slice();
  slots.forEach((slot, j) => { next[slot] = sources[j].c; });
  if (slots.every((slot, j) => next[slot] === chunks[slot])) return body;
  let out = joinChunks(next);
  if (!/\n---\s*$/.test(body)) out = out.replace(/\n+---\s*$/, '');
  return out.replace(/^\n+/, '').replace(/\n*$/, '\n');
}

export function sectionLabels(body) {
  return splitSections(body).map((c) => {
    const line = (c.split('\n').find((l) => l.trim()) || '').trim();
    return `${kindOf(c)}: ${line}`;
  });
}
