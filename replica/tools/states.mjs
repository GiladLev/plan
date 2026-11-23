// Interaction-state capture: dropdowns, mobile menu modal, tabs, accordions, map toggle, cookie banner trees.
// Usage: node states.mjs [--locale he-IL] [--pages a,b]
import { chromium } from '@playwright/test';
import fs from 'node:fs'; import path from 'node:path';
import { PAGES, UA_DESKTOP, UA_MOBILE, ORIGIN } from './pages.mjs';
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const locale = args.locale || 'he-IL';
const pageIds = args.pages ? args.pages.split(',') : Object.keys(PAGES);
const ROOT = path.resolve(import.meta.dirname, '../pixel');
const outDir = path.join(ROOT, 'extract', locale, 'states'); fs.mkdirSync(outDir, { recursive: true });

const TREE = (sel) => {
  const roots = typeof sel === 'string' ? [...document.querySelectorAll(sel)] : [document.body];
  const props = ['display','position','top','right','bottom','left','z-index','opacity','width','height','min-width','max-width','margin-top','margin-right','margin-bottom','margin-left','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-top-style','border-top-left-radius','border-top-right-radius','border-bottom-left-radius','border-bottom-right-radius','background-color','background-image','background-size','background-position','color','font-family','font-size','font-weight','line-height','letter-spacing','text-align','text-transform','text-decoration-line','white-space','box-shadow','transform','transition-property','transition-duration','transition-timing-function','float','flex-direction','justify-content','align-items','gap','overflow-x','overflow-y','cursor','vertical-align','direction'];
  const nodes = []; let idx = 0;
  const walk = (el, p, d) => {
    if (['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName)) return; const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || (r.width === 0 && r.height === 0)) return;
    const st = {}; for (const k of props) { const v = s.getPropertyValue(k); if (v && !['none','normal','auto','0px','static','visible','rgba(0, 0, 0, 0)','start'].includes(v)) st[k] = v; }
    const pseudo = {}; for (const ps of ['::before', '::after']) { const q = getComputedStyle(el, ps); if (q.content && q.content !== 'none' && q.content !== 'normal') pseudo[ps] = { content: q.content, fontFamily: q.fontFamily, color: q.color, fontSize: q.fontSize, width: q.width, height: q.height, position: q.position, top: q.top, left: q.left, right: q.right, bottom: q.bottom, transform: q.transform, background: q.backgroundColor, backgroundImage: q.backgroundImage, border: q.borderTopWidth + ' ' + q.borderTopStyle + ' ' + q.borderTopColor, borderRadius: q.borderTopLeftRadius }; }
    const me = idx++; const attrs = {}; for (const a of ['href','src','alt','type','name','placeholder','role','aria-label','data-toggle','data-target','for']) { const v = el.getAttribute(a); if (v != null) attrs[a] = v.slice(0, 200); }
    nodes.push({ i: me, p, d, tag: el.tagName.toLowerCase(), id: el.id || undefined, cls: typeof el.className === 'string' ? el.className.trim() || undefined : undefined, attrs: Object.keys(attrs).length ? attrs : undefined, rect: { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }, text: [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ').slice(0, 120) || undefined, style: st, pseudo: Object.keys(pseudo).length ? pseudo : undefined });
    for (const c of el.children) walk(c, me, d + 1);
  };
  roots.forEach(r => walk(r, -1, 0)); return nodes;
};

async function snap(page, tag, sel, opts = {}) {
  const tree = await page.evaluate(TREE, sel).catch(() => []);
  const shotPath = path.join(outDir, tag + '.png');
  if (opts.clip) await page.screenshot({ path: shotPath, clip: opts.clip, fullPage: true }); else await page.screenshot({ path: shotPath, fullPage: !!opts.full });
  fs.writeFileSync(path.join(outDir, tag + '.json'), JSON.stringify({ selector: sel, nodes: tree, note: opts.note }));
  console.log('  ', tag, 'nodes=' + tree.length);
}
const settle = async (page, ms = 500) => { await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(ms); };

async function run(id, w, h) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, userAgent: w <= 500 ? UA_MOBILE : UA_DESKTOP, isMobile: w <= 500, hasTouch: w <= 500 });
  const page = await ctx.newPage();
  const T = `${id}@${w}`;
  try {
    await page.goto(ORIGIN + '/' + locale + PAGES[id], { waitUntil: 'domcontentloaded', timeout: 60000 }); await settle(page, 800);
    // cookie banner tree (before dismissing)
    if (await page.locator('.privacy_cookies_banner').first().isVisible().catch(() => false)) { await snap(page, `${T}.cookie`, '.privacy_cookies_banner'); await page.locator('.privacy_cookies_banner button').first().click().catch(() => {}); await page.waitForTimeout(300); }
    // nav dropdowns
    if (await page.locator('#main_navigation').count()) {
      if (w > 767) {
        const toggles = page.locator('#main_navigation .navbar-nav > li.dropdown > a.dropdown-toggle');
        const n = await toggles.count();
        for (let i = 0; i < n; i++) { await toggles.nth(i).click().catch(() => {}); await page.waitForTimeout(400); await snap(page, `${T}.nav-dropdown-${i}`, '#main_navigation li.dropdown.open .dropdown-menu', { clip: { x: 0, y: 0, width: w, height: Math.min(h, 700) } }); await page.keyboard.press('Escape'); await page.mouse.click(w / 2, h - 5); await page.waitForTimeout(200); }
        // search typeahead focus
        const search = page.locator('#main_navigation input').first();
        if (await search.count()) { await search.focus(); await page.waitForTimeout(200); await snap(page, `${T}.nav-search-focus`, '#main_navigation', { clip: { x: 0, y: 0, width: w, height: 120 } }); await search.fill('אול').catch(() => {}); await page.waitForTimeout(1200); await snap(page, `${T}.nav-search-typeahead`, '.typeahead, .tt-menu, .tt-dropdown-menu, .dropdown-menu.typeahead, #main_navigation .dropdown-menu', { clip: { x: 0, y: 0, width: w, height: 500 } }); await page.keyboard.press('Escape'); await search.fill('').catch(() => {}); }
      } else {
        const tog = page.locator('#main_navigation .navbar-toggle').first();
        if (await tog.count()) { await tog.click().catch(() => {}); await page.waitForTimeout(700); await snap(page, `${T}.mobile-menu`, '#main_navigation_modal', { full: false }); 
          // expand collapsibles inside the modal
          const heads = page.locator('#main_navigation_modal [data-toggle="collapse"], #main_navigation_modal .dropdown-toggle, #main_navigation_modal .panel-heading a');
          const hn = await heads.count();
          for (let i = 0; i < Math.min(hn, 4); i++) { await heads.nth(i).click().catch(() => {}); await page.waitForTimeout(500); await snap(page, `${T}.mobile-menu-open-${i}`, '#main_navigation_modal', { full: false }); }
          await page.keyboard.press('Escape'); await page.waitForTimeout(500);
        }
      }
    }
    // page-specific
    const pills = page.locator('main [data-toggle="pill"], main [data-toggle="tab"]');
    const pn = await pills.count();
    for (let i = 0; i < pn && i < 8; i++) { await pills.nth(i).scrollIntoViewIfNeeded().catch(() => {}); await pills.nth(i).click().catch(() => {}); await page.waitForTimeout(500); const box = await pills.nth(i).locator('xpath=ancestor::section[1] | ancestor::div[contains(@class,"container")][1]').first().boundingBox().catch(() => null); const sc = await page.evaluate(() => scrollY); await snap(page, `${T}.tab-${i}`, '.tab-pane.active, .tab-content > .active', box ? { clip: { x: 0, y: Math.max(0, box.y + sc), width: w, height: Math.min(box.height, 1600) } } : {}); }
    if (id === 'contact') { const vis = page.locator('[data-toggle="visibility"]'); const vn = await vis.count(); for (let i = 0; i < vn; i++) { await vis.nth(i).click().catch(() => {}); await page.waitForTimeout(400); await snap(page, `${T}.visibility-${i}`, 'main form', { full: true }); } }
    if (id === 'client-guest-list') { const tt = page.locator('[data-toggle="tooltip"]'); const tn = await tt.count(); for (let i = 0; i < tn; i++) { await tt.nth(i).scrollIntoViewIfNeeded().catch(() => {}); await tt.nth(i).hover().catch(() => {}); await page.waitForTimeout(400); const b = await tt.nth(i).boundingBox(); const sc = await page.evaluate(() => scrollY); if (b) await snap(page, `${T}.tooltip-${i}`, '.tooltip', { clip: { x: Math.max(0, b.x - 200), y: Math.max(0, b.y + sc - 120), width: Math.min(w, 500), height: 260 } }); } }
    if (id === 'client-testimonials') { const more = page.locator('main a, main button').filter({ hasText: /עוד|more/i }).last(); if (await more.count()) { await more.scrollIntoViewIfNeeded().catch(() => {}); const before = await page.evaluate(() => document.documentElement.scrollHeight); await more.click().catch(() => {}); await settle(page, 1500); const after = await page.evaluate(() => document.documentElement.scrollHeight); fs.writeFileSync(path.join(outDir, `${T}.load-more.json`), JSON.stringify({ before, after })); console.log('   load-more', before, '->', after); } }
    if (id === 'client-sign-in') { const email = page.locator('main a, main button').filter({ hasText: /אימייל|email/i }).first(); if (await email.count()) { await email.click().catch(() => {}); await page.waitForTimeout(600); await snap(page, `${T}.email-form`, 'main', { full: true }); const inp = page.locator('main input:visible').first(); if (await inp.count()) { await inp.focus(); await snap(page, `${T}.email-form-focus`, 'main form', { full: true }); } const submit = page.locator('main form button[type=submit], main form input[type=submit]').first(); if (await submit.count()) { await submit.click().catch(() => {}); await settle(page, 1200); await snap(page, `${T}.email-form-error`, 'main', { full: true }); } } }
    if (id === 'corp-sign-in') { const inp = page.locator('input[type=email], input[type=text]').first(); await inp.focus().catch(() => {}); await snap(page, `${T}.focus`, 'form', {}); const pw = page.locator('[data-toggle="password"]').first(); if (await pw.count()) { await pw.click().catch(() => {}); await page.waitForTimeout(300); await snap(page, `${T}.password-shown`, 'form', {}); } const submit = page.locator('form button[type=submit], form input[type=submit]').first(); if (await submit.count()) { await submit.click().catch(() => {}); await settle(page, 1200); await snap(page, `${T}.submit-empty`, 'body', {}); } }
    if (id.startsWith('dir-')) {
      // filters accordion
      const heads = page.locator('.search_wrapper [data-toggle="collapse"], .search_wrapper .panel-heading, .search_wrapper .filter-title, .search_wrapper .filters .title');
      const hn = await heads.count(); console.log('   filter heads', hn);
      for (let i = 0; i < Math.min(hn, 9); i++) { await heads.nth(i).scrollIntoViewIfNeeded().catch(() => {}); await heads.nth(i).click().catch(() => {}); await page.waitForTimeout(450); }
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
      await snap(page, `${T}.filters-open`, '.search_wrapper .side-filters, .search_wrapper .filters, .search_wrapper aside, .search_wrapper form', { full: true });
      const more = page.locator('.search_wrapper a, .search_wrapper button').filter({ hasText: /סינונים נוספים|more filters/i }).first(); if (await more.count()) { await more.click().catch(() => {}); await page.waitForTimeout(500); await snap(page, `${T}.filters-more`, '.search_wrapper form', { full: true }); }
      const hide = page.locator('.search_wrapper a, .search_wrapper button').filter({ hasText: /הסתרת סינונים|hide filters/i }).first(); if (await hide.count()) { await hide.click().catch(() => {}); await page.waitForTimeout(600); await snap(page, `${T}.filters-hidden`, '.search_wrapper', { full: false }); await page.locator('.search_wrapper a, .search_wrapper button').filter({ hasText: /סינונים|filters/i }).first().click().catch(() => {}); await page.waitForTimeout(600); }
      const map = page.locator('.search_wrapper a, .search_wrapper button').filter({ hasText: /תצוגת מפה|map view|מפה/i }).first(); if (await map.count()) { await map.click().catch(() => {}); await settle(page, 2500); await snap(page, `${T}.map-view`, '.search_wrapper', { full: false }); await page.screenshot({ path: path.join(outDir, `${T}.map-view.full.png`), fullPage: true }); }
      // card hover + gallery arrows
      const card = page.locator('.search_wrapper .result, .search_wrapper [class*="brand"], .search_wrapper .thumbnail, .search_wrapper .card').first(); if (await card.count()) { await card.scrollIntoViewIfNeeded().catch(() => {}); await card.hover().catch(() => {}); await page.waitForTimeout(400); const b = await card.boundingBox(); const sc = await page.evaluate(() => scrollY); if (b) await snap(page, `${T}.card-hover`, null, { clip: { x: Math.max(0, b.x - 10), y: Math.max(0, b.y + sc - 10), width: Math.min(w, b.width + 20), height: b.height + 20 } }); const next = card.locator('.flickity-prev-next-button.next, .carousel-control, [class*="next"]').first(); if (await next.count()) { await next.click().catch(() => {}); await page.waitForTimeout(700); if (b) await snap(page, `${T}.card-next-slide`, null, { clip: { x: Math.max(0, b.x - 10), y: Math.max(0, b.y + sc - 10), width: Math.min(w, b.width + 20), height: b.height + 20 } }); } }
      // pagination / load more at bottom
      const pager = page.locator('.search_wrapper .pagination, .search_wrapper a, .search_wrapper button').filter({ hasText: /עוד|הבא|next|more|טען/i }).last(); if (await pager.count()) { await pager.scrollIntoViewIfNeeded().catch(() => {}); const b = await pager.boundingBox(); const sc = await page.evaluate(() => scrollY); if (b) await snap(page, `${T}.pager`, null, { clip: { x: 0, y: Math.max(0, b.y + sc - 150), width: w, height: 300 } }); }
    }
    if (id === 'home' || id === 'vendor-home') { const next = page.locator('.flickity-prev-next-button.next').first(); if (await next.count()) { await next.scrollIntoViewIfNeeded().catch(() => {}); await next.hover(); await page.waitForTimeout(300); const b = await next.locator('xpath=ancestor::*[contains(@class,"carousel")][1]').boundingBox(); const sc = await page.evaluate(() => scrollY); if (b) await snap(page, `${T}.carousel-arrow-hover`, '.flickity-prev-next-button', { clip: { x: 0, y: Math.max(0, b.y + sc - 10), width: w, height: b.height + 20 } }); await next.click(); await page.waitForTimeout(800); if (b) await snap(page, `${T}.carousel-next`, '.flickity-slider', { clip: { x: 0, y: Math.max(0, b.y + sc - 10), width: w, height: b.height + 20 } }); } }
  } catch (e) { console.log('  ERR', T, e.message.slice(0, 150)); }
  await browser.close();
}
for (const id of pageIds) { console.log(id); for (const [w, h] of [[1440, 900], [390, 844]]) await run(id, w, h); }
