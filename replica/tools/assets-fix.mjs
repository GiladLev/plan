// Re-download every asset in index.json using collision-free names, then remove old files.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { chromium } from '@playwright/test';
const dir = path.resolve(import.meta.dirname, '../pixel/assets'); const idxPath = path.join(dir, 'index.json');
const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
const sha = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
const name = url => { const u = new URL(url); let base = path.basename(u.pathname).replace(/-[0-9a-f]{64}(?=\.[a-z0-9]+$)/i, ''); if (u.hostname.includes('amazonaws') || u.hostname.includes('iplan-uuc')) return (sha(u.pathname) + '-' + decodeURIComponent(base)).replace(/[^\w.\-]/g, '_'); const d = path.dirname(u.pathname).replace(/^\/assets\/?/, '').replace(/[^\w-]+/g, '_'); return ((d ? d + '__' : '') + decodeURIComponent(base)).replace(/[^\w.\-]/g, '_'); };
const browser = await chromium.launch(); const ctx = await browser.newContext();
const keep = new Set(['index.json', 'icon-ref', 'directory']); let n = 0, fail = 0;
for (const [url, v] of Object.entries(idx)) {
  if (!/^https?:/.test(url) || /youtube|doubleclick/.test(url)) continue;
  const f = name(url); const p = path.join(dir, f); keep.add(f);
  if (!fs.existsSync(p) || v.file !== f) { try { const r = await ctx.request.get(url, { timeout: 30000 }); if (!r.ok()) throw new Error('HTTP ' + r.status()); fs.writeFileSync(p, await r.body()); v.bytes = (await r.body()).length; v.type = r.headers()['content-type']; delete v.error; } catch (e) { v.error = e.message; fail++; } }
  v.file = f; n++;
}
for (const f of fs.readdirSync(dir)) if (!keep.has(f) && fs.statSync(path.join(dir, f)).isFile()) fs.unlinkSync(path.join(dir, f));
fs.writeFileSync(idxPath, JSON.stringify(idx, null, 1)); await browser.close(); console.log('assets', n, 'failed', fail, 'files now', fs.readdirSync(dir).length);
