import { defineConfig } from 'astro/config';
import rehypeMedia from './src/rehype-media.mjs';
// 部署到 GitHub Pages 时设置 SITE/BASE，例如 SITE=https://<user>.github.io BASE=/dexhand-trend
export default defineConfig({ site: process.env.SITE || 'http://localhost:4321', base: process.env.BASE || '/', trailingSlash: 'ignore', markdown: { rehypePlugins: [rehypeMedia] } });
