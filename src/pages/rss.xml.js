import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const daily = (await getCollection('daily')).sort((a, b) => +b.data.date - +a.data.date);
  return rss({
    title: '灵巧手趋势',
    description: '灵巧手领域每日趋势：精选摘要，附原文链接。',
    site: context.site,
    trailingSlash: true,
    customData: '<language>zh-CN</language>',
    items: daily.map((e) => ({
      title: e.data.title,
      pubDate: e.data.date,
      description: e.data.summary || e.data.title,
      link: `${base}/daily/${e.id}/`,
      categories: [...e.data.sources, ...e.data.tags],
    })),
  });
}
