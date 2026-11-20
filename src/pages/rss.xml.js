import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { buildFeedOptions, itemPath } from '../feed.mjs';

export async function GET(context) {
  const base = import.meta.env.BASE_URL;
  const daily = (await getCollection('daily')).sort((a, b) => +b.data.date - +a.data.date);
  return rss(buildFeedOptions({
    site: context.site,
    base,
    items: daily.map((e) => ({
      title: e.data.title,
      pubDate: e.data.date,
      description: e.data.summary || e.data.title,
      link: itemPath(base, e.id),
      categories: [...e.data.sources, ...e.data.tags],
    })),
  }));
}
