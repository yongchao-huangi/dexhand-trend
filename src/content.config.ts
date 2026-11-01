import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
const schema = z.object({ title: z.string(), date: z.coerce.date(), start: z.coerce.date().optional(), summary: z.string().optional(), sources: z.array(z.string()).default([]), tags: z.array(z.string()).default([]) });
export const collections = {
  daily: defineCollection({ loader: glob({ pattern: '*.md', base: './src/content/daily' }), schema }),
  weekly: defineCollection({ loader: glob({ pattern: '*.md', base: './src/content/weekly' }), schema }),
};
