#!/usr/bin/env node
// 用法: node scripts/add-daily.mjs path/to/brief.md [--force]
// 输入 Markdown 需带 frontmatter: date (YYYY-MM-DD), tags, sources；title/summary 可选。
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [file, ...rest] = process.argv.slice(2);
if (!file) { console.error('用法: node scripts/add-daily.mjs brief.md [--force]'); process.exit(1); }
const raw = fs.readFileSync(file, 'utf8');
const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
if (!m) { console.error('缺少 frontmatter'); process.exit(1); }
const fm = {}; for (const l of m[1].split('\n')) { const i = l.indexOf(':'); if (i > 0) fm[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }
const date = (fm.date || '').replace(/['"]/g, '');
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.error('date 必须是 YYYY-MM-DD'); process.exit(1); }
const arr = (v) => !v ? [] : v.startsWith('[') ? v.slice(1, -1).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) : v.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
const allowed = ['X', '小红书', '微信', 'arXiv', 'GitHub'];
const sources = arr(fm.sources); const bad = sources.filter((s) => !allowed.includes(s)); if (bad.length) console.warn('提示：非标准来源', bad);
let body = m[2].replace(/^\s*#\s+.*\n/, '').trim() + '\n';
const blk=(process.env.DEXTREND_BLOCKLIST||'').split(',').filter(Boolean); if (blk.some(w=>body.includes(w))) console.warn('⚠️ 正文含屏蔽词，请检查后再发布');
const q = (s) => JSON.stringify(s);
const title = fm.title ? fm.title.replace(/^['"]|['"]$/g, '') : `灵巧手每日简报 · ${date}`;
const out = `---\ntitle: ${q(title)}\ndate: ${date}\n${fm.summary ? `summary: ${q(fm.summary.replace(/^['"]|['"]$/g, ''))}\n` : ''}sources: ${q(sources)}\ntags: ${q(arr(fm.tags))}\n---\n\n${body}`;
const dest = path.join(root, 'src/content/daily', `${date}.md`);
if (fs.existsSync(dest) && !rest.includes('--force')) { console.error(`已存在 ${dest}，加 --force 覆盖`); process.exit(1); }
fs.writeFileSync(dest, out); console.log('已写入', dest);
