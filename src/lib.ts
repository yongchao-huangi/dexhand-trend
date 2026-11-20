import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getCollection } from 'astro:content';
import { SOURCE_ORDER, sortSources } from './source-order.mjs';
import { extractMarkedItems, slug } from './markers.mjs';
export { SOURCE_ORDER, sortSources, slug };
export { ITEM_TAGS } from './markers.mjs';
export const B = import.meta.env.BASE_URL.replace(/\/$/, '');
export const u = (p: string) => B + p;
export const fmt = (d: Date) => new Date(d).toISOString().slice(0, 10);
/** Source tags in display order, then topic tags in their existing order. */
export const orderedTags = (sources: string[] = [], tags: string[] = []) => [...sortSources(sources), ...tags];
export async function all() {
  const d = (await getCollection('daily')).sort((a, b) => +b.data.date - +a.data.date);
  const w = (await getCollection('weekly')).sort((a, b) => +b.data.date - +a.data.date);
  return { d, w };
}
export function markedIn(entry: { id: string }, kind: 'daily' | 'weekly') {
  const file = path.join(process.cwd(), 'src/content', kind, `${entry.id}.md`);
  const raw = readFileSync(file, 'utf8');
  return extractMarkedItems(raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, ''));
}
export async function markedItems() {
  const { d } = await all();
  return d.flatMap((e) => markedIn(e, 'daily').map((it) => ({ ...it, postId: e.id, date: e.data.date, postTitle: e.data.title })));
}
