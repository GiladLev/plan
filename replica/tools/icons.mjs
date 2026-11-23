// Crop every icon-font glyph (ip-icon-*, fa-*) at 4x for reference when choosing/drawing open replacements.
import { chromium } from '@playwright/test';
import fs from 'node:fs'; import path from 'node:path';
import { PAGES, UA_DESKTOP, ORIGIN } from './pages.mjs';
const out = path.resolve(import.meta.dirname, '../pixel/assets/icon-ref'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 4, userAgent: UA_DESKTOP });
const page = await ctx.newPage();
const seen = new Set(fs.readdirSync(out).map(f => f.replace('.png', '')));
const manifest = fs.existsSync(path.join(out, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8')) : {};
async function harvest(label) {
  const items = await page.evaluate(() => [...document.querySelectorAll('[class*="ip-icon"], [class*="fa-"], .glyphicon')].map(el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); const b = getComputedStyle(el, '::before'); const cls = (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).filter(k => /^(fa[srlbd]?|fa-[a-z0-9-]+|ip-icon-[a-z0-9-]+|glyphicon-[a-z0-9-]+)$/.test(k) && !/^fa-(spin|fw|lg|[0-9]x|pull-|flip|rotate)/.test(k)).join(' '); return { cls, x: r.x, y: r.y, w: r.width, h: r.height, vis: s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0 && r.y >= 0 && r.y < innerHeight, glyph: b.content, font: b.fontFamily, weight: b.fontWeight, size: b.fontSize, color: s.color }; }).filter(i => i.cls && i.vis));
  for (const it of items) {
    const key = it.cls.replace(/[^\w-]/g, '_'); if (seen.has(key)) continue; seen.add(key);
    const pad = 2; await page.screenshot({ path: path.join(out, key + '.png'), clip: { x: Math.max(0, it.x - pad), y: Math.max(0, it.y - pad), width: it.w + pad * 2, height: it.h + pad * 2 } }).catch(() => seen.delete(key));
    manifest[key] = { classes: it.cls, glyph: it.glyph, fontFamily: it.font, fontWeight: it.weight, fontSize: it.size, color: it.color, from: label };
  }
  console.log(label, 'total icons so far', seen.size);
}
const go = async (id) => { await page.goto(ORIGIN + '/he-IL' + PAGES[id], { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {}); await page.locator('.privacy_cookies_banner button').first().click({ timeout: 1000 }).catch(() => {}); await page.waitForTimeout(400); };
await go('home');
await harvest('home');
const toggles = page.locator('#main_navigation .navbar-nav > li.dropdown > a.dropdown-toggle');
for (let i = 0; i < await toggles.count(); i++) { await toggles.nth(i).click(); await page.waitForTimeout(400); await harvest('home-dropdown-' + i); await page.keyboard.press('Escape'); await page.mouse.click(700, 880); }
// scroll through home and harvest at each position (icons in tabs etc)
for (const id of ['home', 'client-guest-list', 'client-rsvp', 'client-help', 'client-minisite', 'client-sketches', 'client-tasks', 'client-credit-gifts', 'client-digital-invitation', 'client-notify', 'client-reception', 'client-testimonials', 'vendor-home', 'vendor-marketing', 'about', 'contact', 'jobs', 'dir-1-venues', 'dir-8-catering', 'client-sign-in', 'corp-sign-in']) {
  if (id !== 'home') await go(id);
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 800) { await page.evaluate(yy => scrollTo(0, yy), y); await page.waitForTimeout(250); await harvest(id + '@' + y); }
  if (id === 'home') { const pills = page.locator('main [data-toggle="pill"]'); for (let i = 0; i < await pills.count(); i++) { await pills.nth(i).scrollIntoViewIfNeeded(); await pills.nth(i).click(); await page.waitForTimeout(400); await harvest('home-tab-' + i); } }
  if (id.startsWith('dir-')) { const heads = page.locator('.search_wrapper [data-toggle="collapse"]'); for (let i = 0; i < Math.min(await heads.count(), 9); i++) { await heads.nth(i).click().catch(() => {}); await page.waitForTimeout(300); } await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300); await harvest(id + '-filters'); }
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
await browser.close();
console.log('icons:', Object.keys(manifest).length);
