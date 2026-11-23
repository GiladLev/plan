// Visual diff: clone vs original screenshots at identical viewports.
// Usage: node compare.mjs --base=http://localhost:3000 [--locale=he-IL] [--pages=home,about] [--viewports=1440,390] [--update-clone-only]
import { chromium } from '@playwright/test';
import fs from 'node:fs'; import path from 'node:path';
import { PNG } from 'pngjs'; import pixelmatch from 'pixelmatch';
import { PAGES, VIEWPORTS, UA_DESKTOP, UA_MOBILE } from './pages.mjs';
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const base = args.base || 'http://localhost:3000'; const locale = args.locale || 'he-IL';
const pageIds = args.pages ? args.pages.split(',') : Object.keys(PAGES);
const viewports = args.viewports ? VIEWPORTS.filter(([w]) => args.viewports.split(',').includes(String(w))) : VIEWPORTS;
const ROOT = path.resolve(import.meta.dirname, '../pixel');
const origDir = path.join(ROOT, 'screens/original', locale), cloneDir = path.join(ROOT, 'screens/clone', locale), diffDir = path.join(ROOT, 'diff', locale);
[cloneDir, diffDir].forEach(d => fs.mkdirSync(d, { recursive: true }));
const browser = await chromium.launch();
const results = [];
for (const id of pageIds) {
  for (const [w, h] of viewports) {
    const tag = `${id}@${w}`; const origPath = path.join(origDir, tag + '.png'); if (!fs.existsSync(origPath)) { console.log(tag, 'no original'); continue; }
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, userAgent: w <= 500 ? UA_MOBILE : UA_DESKTOP, isMobile: w <= 500, hasTouch: w <= 500, locale });
    const page = await ctx.newPage(); const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); }); page.on('pageerror', e => errors.push('PAGEERROR ' + e.message.slice(0, 200)));
    try {
      await page.goto(base + '/' + locale + PAGES[id], { waitUntil: 'networkidle', timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(async () => { const hh = document.documentElement.scrollHeight; for (let y = 0; y < hh; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } scrollTo(0, 0); });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      const banner = page.locator('.privacy_cookies_banner button, [data-testid=cookie-dismiss]').first(); if (await banner.isVisible().catch(() => false)) { await banner.click(); await page.waitForTimeout(300); }
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(400);
      const clonePath = path.join(cloneDir, tag + '.png');
      await page.screenshot({ path: clonePath, fullPage: true, animations: 'disabled' });
      const docInfo = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
      const a = PNG.sync.read(fs.readFileSync(origPath)), b = PNG.sync.read(fs.readFileSync(clonePath));
      const W = Math.max(a.width, b.width), H = Math.max(a.height, b.height);
      const pad = (img) => { if (img.width === W && img.height === H) return img; const o = new PNG({ width: W, height: H, fill: true }); o.data.fill(255); PNG.bitblt(img, o, 0, 0, img.width, img.height, 0, 0); return o; };
      const A = pad(a), B = pad(b), D = new PNG({ width: W, height: H });
      const mismatched = pixelmatch(A.data, B.data, D.data, W, H, { threshold: 0.1, includeAA: false, alpha: 0.4 });
      const score = 100 * (1 - mismatched / (W * H));
      // per-band mismatch (every 100px) to localize
      const bands = []; for (let y = 0; y < H; y += 100) { let m = 0; const yEnd = Math.min(H, y + 100); for (let yy = y; yy < yEnd; yy++) for (let x = 0; x < W; x++) { const i = (yy * W + x) * 4; if (D.data[i] === 255 && D.data[i + 1] === 0 && D.data[i + 2] === 0) m++; } bands.push({ y, pct: +(100 * m / (W * (yEnd - y))).toFixed(1) }); }
      fs.writeFileSync(path.join(diffDir, tag + '.png'), PNG.sync.write(D));
      const worst = bands.filter(b => b.pct > 2).sort((x, y) => y.pct - x.pct).slice(0, 8);
      results.push({ tag, score: +score.toFixed(2), origH: a.height, cloneH: b.height, hscroll: docInfo.hscroll, errors: errors.slice(0, 5), worstBands: worst });
      console.log(`${tag.padEnd(32)} match=${score.toFixed(2)}%  origH=${a.height} cloneH=${b.height} dH=${b.height - a.height}${docInfo.hscroll ? ' HSCROLL!' : ''}${errors.length ? ' consoleErrors=' + errors.length : ''}  worst: ${worst.map(b => `y${b.y}:${b.pct}%`).join(' ')}`);
    } catch (e) { console.log(tag, 'ERROR', e.message.slice(0, 160)); results.push({ tag, error: e.message.slice(0, 200) }); }
    await ctx.close();
  }
}
fs.writeFileSync(path.join(diffDir, '_results.json'), JSON.stringify(results, null, 1));
await browser.close();
