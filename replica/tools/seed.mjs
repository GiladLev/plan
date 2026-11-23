// Harvest structured seed data (directory results + filters + SEO links; testimonials) and download referenced imagery.
import { chromium } from '@playwright/test';
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { PAGES, UA_DESKTOP, ORIGIN } from './pages.mjs';
const locale = process.argv[2] || 'he-IL';
const ROOT = path.resolve(import.meta.dirname, '../pixel');
const outDir = path.join(ROOT, 'seed', locale); fs.mkdirSync(outDir, { recursive: true });
const imgDir = path.join(ROOT, 'assets', 'directory'); fs.mkdirSync(imgDir, { recursive: true });
const sha = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
const localName = url => { try { const u = new URL(url); return sha(u.pathname) + '-' + path.basename(u.pathname).replace(/[^\w.\-]/g, '_'); } catch { return sha(url); } };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA_DESKTOP });
const page = await ctx.newPage();
const dl = new Map();
async function download(url) { if (!url || dl.has(url)) return dl.get(url); const file = localName(url); const p = path.join(imgDir, file); if (!fs.existsSync(p)) { try { const r = await ctx.request.get(url, { timeout: 30000 }); if (r.ok()) fs.writeFileSync(p, await r.body()); else throw new Error(r.status()); } catch (e) { dl.set(url, null); return null; } } dl.set(url, 'directory/' + file); return 'directory/' + file; }

for (const id of Object.keys(PAGES).filter(k => k.startsWith('dir-'))) {
  await page.goto(ORIGIN + '/' + locale + PAGES[id], { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 0); });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  const data = await page.evaluate(() => {
    const t = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
    const bgUrl = el => { const m = (el?.getAttribute('style') || '').match(/url\(["']?([^"')]+)["']?\)/); return m ? m[1] : (el?.getAttribute('data-flickity-bg-lazyload') || null); };
    const category = { title: t(document.querySelector('.results h2.category')).trim(), icon: document.querySelector('.results h2.category i')?.className, meta: t(document.querySelector('.results .meta-data')), pageTitle: document.title, h1: t(document.querySelector('h1')), metaDescription: document.querySelector('meta[name=description]')?.content };
    const filters = [...document.querySelectorAll('.filters .filter-wrapper')].map(fw => { const adv = fw.classList.contains('advanced'); const sw = fw.querySelector('label.switch'); if (sw) { const inp = fw.querySelector('input'); return { kind: 'switch', advanced: adv, id: inp?.id, name: inp?.name, label: t(fw.querySelector('.switch-attribute-label')), tooltip: fw.querySelector('[data-original-title]')?.getAttribute('data-original-title') || fw.querySelector('[title]')?.getAttribute('title') || null }; } return { kind: 'checkbox-group', advanced: adv, collapsed: fw.classList.contains('collapsed'), title: t(fw.querySelector('.form-group > a > div:not(.pull-right)')), options: [...fw.querySelectorAll('li')].map(li => { const i = li.querySelector('input'); return { name: i?.name, value: i?.value, label: t(li.querySelector('label')), checked: !!i?.checked }; }) }; });
    const cards = [...document.querySelectorAll('.results .tiles .brand-col')].map(col => { const b = col.querySelector('.brand'); const cells = [...b.querySelectorAll('.carousel-cell')]; return { locationId: b?.getAttribute('data-location_id'), href: b.querySelector('.content a.strong')?.getAttribute('href'), name: t(b.querySelector('.content a.strong')), logo: bgUrl(b.querySelector('.brand_logo_or_brand_page_category_icon')), logoIcon: b.querySelector('.brand_logo_or_brand_page_category_icon i')?.className || null, rating: t(b.querySelector('.rating_total')) || null, stars: [...b.querySelectorAll('.rating_stars i')].map(i => i.className), ratingTitle: b.querySelector('.rating_stars')?.getAttribute('data-original-title') || b.querySelector('.rating_stars')?.getAttribute('title') || null, reviews: t(b.querySelector('.rating_stars')?.parentElement?.parentElement?.querySelector('.inline-block.small')), details: [...b.querySelectorAll('.content > .text-ellipsis')].map(t).filter(Boolean), gallery: cells.map(c => ({ img: bgUrl(c), promo: !!c.querySelector('.promotion-call-to-action'), promoPhone: t(c.querySelector('.promotion-call-to-action .phone')) || null })), cta: [...b.querySelectorAll('.call-to-action a')].map(a => ({ text: t(a), href: a.getAttribute('href'), action: a.getAttribute('data-action'), icon: a.querySelector('i')?.className })), html: b.querySelector('.content')?.innerHTML.replace(/\s+/g, ' ').slice(0, 2500) }; });
    const pager = document.querySelector('.results .pagination, .results [data-action*="page"], .results .load-more, .results .more'); const pagerInfo = pager ? { cls: pager.className, text: t(pager), html: pager.outerHTML.slice(0, 1500) } : null;
    const seo = [...document.querySelectorAll('.results .results-container > div')].slice(-3).map(d => ({ cls: d.className, h: t(d.querySelector('h2,h3,h4')), links: [...d.querySelectorAll('a')].map(a => ({ text: t(a), href: a.getAttribute('href') })) })).filter(s => s.links.length);
    const mapMarkers = (window.__markers || null);
    return { category, filters, cards, pagerInfo, seo, resultsCount: cards.length, afterTilesHtml: (() => { const tiles = document.querySelector('.results .tiles'); let s = ''; let n = tiles?.nextElementSibling; while (n) { s += n.outerHTML.replace(/\s+/g, ' ').slice(0, 6000) + '\n'; n = n.nextElementSibling; } return s; })() };
  });
  for (const c of data.cards) { c.logoFile = await download(c.logo); for (const g of c.gallery) g.file = await download(g.img); }
  fs.writeFileSync(path.join(outDir, id + '.json'), JSON.stringify(data, null, 1));
  console.log(id, 'cards=' + data.cards.length, 'filters=' + data.filters.length, 'seo=' + data.seo.length, data.category.meta);
}
// testimonials (home + testimonials page + vendor-home)
for (const id of ['home', 'client-testimonials', 'vendor-home']) {
  await page.goto(ORIGIN + '/' + locale + PAGES[id], { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const data = await page.evaluate(() => { const t = el => (el?.textContent || '').replace(/\s+/g, ' ').trim(); return [...document.querySelectorAll('.review, .testimonial, .carousel-cell')].map(r => ({ cls: r.className, html: r.outerHTML.replace(/\s+/g, ' ').slice(0, 4000), imgs: [...r.querySelectorAll('img')].map(i => i.src), text: t(r).slice(0, 1500) })); });
  for (const r of data) r.files = await Promise.all(r.imgs.map(download));
  fs.writeFileSync(path.join(outDir, id + '.reviews.json'), JSON.stringify(data, null, 1)); console.log(id, 'reviews', data.length);
}
fs.writeFileSync(path.join(outDir, '_downloads.json'), JSON.stringify(Object.fromEntries(dl), null, 1));
await browser.close();
