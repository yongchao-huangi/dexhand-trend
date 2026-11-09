import { getCollection } from 'astro:content';
import { SOURCE_ORDER, sortSources } from './source-order.mjs';
export { SOURCE_ORDER, sortSources };
export const B = import.meta.env.BASE_URL.replace(/\/$/, '');
export const u = (p: string) => B + p;
export const fmt = (d: Date) => d.toISOString().slice(0, 10);
/** Source tags in display order, then topic tags in their existing order. */
export const orderedTags = (sources: string[] = [], tags: string[] = []) => [...sortSources(sources), ...tags];
export async function all() {
  const d = (await getCollection('daily')).sort((a, b) => +b.data.date - +a.data.date);
  const w = (await getCollection('weekly')).sort((a, b) => +b.data.date - +a.data.date);
  return { d, w };
}
export const slug = (t: string) => encodeURIComponent(t);
