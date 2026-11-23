// Pixel-perfect extraction: screenshots + computed-style tree + states + assets.
// Usage: node extract.mjs [--locale he-IL|en-US] [--pages id,id] [--viewports 1440,390] [--no-assets]
import { chromium } from '@playwright/test';
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { PAGES, VIEWPORTS, UA_DESKTOP, UA_MOBILE, ORIGIN } from './pages.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const locale = args.locale || 'he-IL';
const pageIds = args.pages ? args.pages.split(',') : Object.keys(PAGES);
const viewports = args.viewports ? VIEWPORTS.filter(([w]) => args.viewports.split(',').includes(String(w))) : VIEWPORTS;
const ROOT = path.resolve(import.meta.dirname, '../pixel');
const dirs = { extract: path.join(ROOT, 'extract', locale), shots: path.join(ROOT, 'screens/original', locale), assets: path.join(ROOT, 'assets') };
Object.values(dirs).forEach(d => fs.mkdirSync(d, { recursive: true }));
const assetIndexPath = path.join(dirs.assets, 'index.json');
const assetIndex = fs.existsSync(assetIndexPath) ? JSON.parse(fs.readFileSync(assetIndexPath, 'utf8')) : {};

const STYLE_PROPS = ['display','position','top','right','bottom','left','float','clear','z-index','overflow-x','overflow-y','visibility','opacity',
  'flex-direction','flex-wrap','flex-grow','flex-shrink','flex-basis','justify-content','align-items','align-self','align-content','gap','order',
  'grid-template-columns','grid-template-rows','grid-column','grid-row',
  'width','height','min-width','max-width','min-height','max-height','box-sizing',
  'margin-top','margin-right','margin-bottom','margin-left','padding-top','padding-right','padding-bottom','padding-left',
  'border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-style','border-top-color','border-right-color','border-bottom-color','border-left-color',
  'border-top-left-radius','border-top-right-radius','border-bottom-left-radius','border-bottom-right-radius',
  'background-color','background-image','background-size','background-position','background-repeat','background-attachment','background-clip',
  'color','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-transform','text-decoration-line','text-shadow','white-space','word-break','direction','unicode-bidi','vertical-align','text-overflow','list-style-type',
  'box-shadow','transform','transform-origin','transition-property','transition-duration','transition-timing-function','transition-delay','animation-name','animation-duration','animation-timing-function','animation-iteration-count',
  'cursor','pointer-events','object-fit','object-position','outline-style','outline-width','outline-color','-webkit-font-smoothing','content'];

const sha = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
function assetLocalName(url) {
  try {
    const u = new URL(url); let base = path.basename(u.pathname);
    base = base.replace(/-[0-9a-f]{64}(?=\.[a-z0-9]+$)/i, ''); // strip rails digest
    if (u.hostname.includes('amazonaws') || u.hostname.includes('iplan-uuc')) return (sha(u.pathname) + '-' + decodeURIComponent(base)).replace(/[^\w.\-]/g, '_');
    const dir = path.dirname(u.pathname).replace(/^\/assets\/?/, '').replace(/[^\w-]+/g, '_'); // keep path to avoid basename collisions
    return ((dir ? dir + '__' : '') + decodeURIComponent(base)).replace(/[^\w.\-]/g, '_');
  } catch { return sha(url); }
}
async function downloadAsset(ctx, url, meta) {
  if (!url || url.startsWith('data:') || assetIndex[url]) { if (assetIndex[url]) assetIndex[url].uses = (assetIndex[url].uses || 0) + 1; return assetIndex[url]?.file; }
  const file = assetLocalName(url);
  try {
    const resp = await ctx.request.get(url, { timeout: 30000 });
    if (!resp.ok()) throw new Error('HTTP ' + resp.status());
    const buf = await resp.body();
    fs.writeFileSync(path.join(dirs.assets, file), buf);
    assetIndex[url] = { file, bytes: buf.length, type: resp.headers()['content-type'], uses: 1, ...meta };
    return file;
  } catch (e) { assetIndex[url] = { file: null, error: e.message, uses: 1, ...meta }; return null; }
}

const PAGE_SCRIPT = (styleProps) => {
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return !(s.display === 'none' || s.visibility === 'hidden' || (r.width === 0 && r.height === 0)); };
  const rnd = n => Math.round(n * 100) / 100;
  const nodes = []; let idx = 0;
  const walk = (el, parentIdx, depth) => {
    if (['SCRIPT','STYLE','NOSCRIPT','LINK','META','TEMPLATE'].includes(el.tagName)) return;
    if (!vis(el)) return;
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    const st = {}; for (const p of styleProps) { const v = s.getPropertyValue(p); if (v && v !== 'none' && v !== 'normal' && v !== 'auto' && v !== '0px' && v !== 'static' && v !== 'visible' && v !== 'rgba(0, 0, 0, 0)' && v !== 'start') st[p] = v; }
    const before = getComputedStyle(el, '::before'), after = getComputedStyle(el, '::after');
    const pseudo = {};
    if (before.content && before.content !== 'none' && before.content !== 'normal') pseudo.before = { content: before.content, fontFamily: before.fontFamily, color: before.color, width: before.width, height: before.height, display: before.display, background: before.backgroundColor, position: before.position, top: before.top, left: before.left, right: before.right, bottom: before.bottom, transform: before.transform, fontSize: before.fontSize, backgroundImage: before.backgroundImage, border: before.borderTopWidth + ' ' + before.borderTopStyle + ' ' + before.borderTopColor, borderRadius: before.borderTopLeftRadius, boxShadow: before.boxShadow };
    if (after.content && after.content !== 'none' && after.content !== 'normal') pseudo.after = { content: after.content, fontFamily: after.fontFamily, color: after.color, width: after.width, height: after.height, display: after.display, background: after.backgroundColor, position: after.position, top: after.top, left: after.left, right: after.right, bottom: after.bottom, transform: after.transform, fontSize: after.fontSize, backgroundImage: after.backgroundImage, border: after.borderTopWidth + ' ' + after.borderTopStyle + ' ' + after.borderTopColor, borderRadius: after.borderTopLeftRadius, boxShadow: after.boxShadow };
    const ownText = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ');
    const me = idx++;
    const attrs = {}; for (const a of ['href','src','alt','type','name','placeholder','value','role','aria-label','data-toggle','data-target','data-action','for','title','target','rel']) { const v = el.getAttribute(a); if (v != null) attrs[a] = v.slice(0, 300); }
    nodes.push({ i: me, p: parentIdx, d: depth, tag: el.tagName.toLowerCase(), id: el.id || undefined, cls: el.className && typeof el.className === 'string' ? el.className.trim() : undefined, attrs: Object.keys(attrs).length ? attrs : undefined,
      rect: { x: rnd(r.x + scrollX), y: rnd(r.y + scrollY), w: rnd(r.width), h: rnd(r.height) }, text: ownText ? ownText.slice(0, 120) : undefined, style: st, pseudo: Object.keys(pseudo).length ? pseudo : undefined });
    for (const c of el.children) walk(c, me, depth + 1);
  };
  walk(document.body, -1, 0);
  // assets
  const assets = [];
  document.querySelectorAll('img').forEach(img => { const r = img.getBoundingClientRect(); assets.push({ kind: 'img', url: img.currentSrc || img.src, srcset: img.getAttribute('srcset') || undefined, alt: img.alt, rendered: [Math.round(r.width), Math.round(r.height)], intrinsic: [img.naturalWidth, img.naturalHeight], visible: vis(img) }); });
  document.querySelectorAll('video, source, iframe').forEach(v => assets.push({ kind: v.tagName.toLowerCase(), url: v.src || v.getAttribute('src'), poster: v.poster }));
  document.querySelectorAll('svg').forEach(svg => { const r = svg.getBoundingClientRect(); assets.push({ kind: 'inline-svg', rendered: [Math.round(r.width), Math.round(r.height)], cls: svg.getAttribute('class'), markup: svg.outerHTML.slice(0, 4000) }); });
  document.querySelectorAll('*').forEach(el => { const bg = getComputedStyle(el).backgroundImage; if (bg && bg !== 'none') { const m = [...bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)]; m.forEach(x => { const r = el.getBoundingClientRect(); assets.push({ kind: 'bg', url: x[1], el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''), rendered: [Math.round(r.width), Math.round(r.height)], size: getComputedStyle(el).backgroundSize, position: getComputedStyle(el).backgroundPosition, repeat: getComputedStyle(el).backgroundRepeat }); }); } });
  document.querySelectorAll('*').forEach(el => { for (const ps of ['::before', '::after']) { const st = getComputedStyle(el, ps); const bg = st.backgroundImage; if (bg && bg !== 'none' && st.content !== 'none') { [...bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)].forEach(x => assets.push({ kind: 'pseudo-bg', pseudo: ps, url: x[1], el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''), rendered: [parseFloat(st.width) || 0, parseFloat(st.height) || 0], size: st.backgroundSize, position: st.backgroundPosition })); } } });
  document.querySelectorAll('link[rel*="icon"]').forEach(l => assets.push({ kind: 'favicon', url: l.href, sizes: l.sizes?.value }));
  // icon font glyphs used
  const icons = {}; document.querySelectorAll('i, span, [class*="fa-"], [class*="ip-icon"], .glyphicon').forEach(el => { const c = (typeof el.className === 'string' ? el.className : '').trim(); if (!/\bfa[srlbd]?\b|fa-|ip-icon|glyphicon/.test(c)) return; const b = getComputedStyle(el, '::before'); if (b.content && b.content !== 'none' && b.content !== 'normal') { const key = c.split(/\s+/).filter(k => /^(fa-|ip-icon|glyphicon-|fa[srlbd]?$)/.test(k)).join(' '); if (!icons[key]) { const r = el.getBoundingClientRect(); icons[key] = { glyph: b.content, fontFamily: b.fontFamily, fontWeight: b.fontWeight, fontSize: b.fontSize, color: b.color, sample: { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }, count: 0 }; } icons[key].count++; } });
  const fonts = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight + ' ' + f.style);
  const html = document.documentElement;
  return { doc: { url: location.href, title: document.title, lang: html.lang, dir: html.dir || getComputedStyle(document.body).direction, bodyClass: document.body.className, scrollHeight: html.scrollHeight, scrollWidth: html.scrollWidth, clientWidth: html.clientWidth, rootFontSize: getComputedStyle(html).fontSize, bodyFont: getComputedStyle(document.body).fontFamily, bodyFontSize: getComputedStyle(document.body).fontSize, bodyColor: getComputedStyle(document.body).color, bodyBg: getComputedStyle(document.body).backgroundColor, htmlBg: getComputedStyle(html).backgroundColor, fontsLoaded: [...new Set(fonts)], hasHScroll: html.scrollWidth > html.clientWidth }, nodes, assets, icons };
};

const CLEAN_HTML = () => {
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll('script, noscript, style, iframe[src*="recaptcha"], .grecaptcha-badge').forEach(n => n.remove());
  clone.querySelectorAll('*').forEach(n => { for (const a of [...n.attributes]) if (/^(data-react|data-v-|nonce|integrity|crossorigin)/.test(a.name)) n.removeAttribute(a.name); });
  return '<!-- snapshot ' + location.href + ' @ ' + new Date().toISOString() + ' -->\n<body class="' + document.body.className + '">\n' + clone.innerHTML + '\n</body>';
};

async function hoverFocusStates(page) {
  // Uses CDP forced pseudo-classes so transitions do not matter.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: false });
  const sel = 'a, button, .btn, input, select, textarea, [role=button], [tabindex], label.btn, .nav > li, .dropdown, .thumbnail, .panel, .card, .brand, .list-group-item, .carousel-control, .owl-item, .filter, [class*=card], [class*=item] > a';
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: sel });
  const watch = ['color','background-color','border-top-color','border-bottom-color','box-shadow','text-decoration-line','opacity','transform','outline-style','outline-width','outline-color','outline-offset','text-shadow','filter','background-image'];
  const out = []; const seen = new Set();
  for (const nodeId of nodeIds.slice(0, 400)) {
    try {
      const { object } = await cdp.send('DOM.resolveNode', { nodeId });
      const desc = await cdp.send('Runtime.callFunctionOn', { objectId: object.objectId, returnByValue: true, functionDeclaration: `function(){ const r=this.getBoundingClientRect(); const s=getComputedStyle(this); if(s.display==='none'||s.visibility==='hidden'||(r.width===0&&r.height===0)) return null; return { tag:this.tagName.toLowerCase(), id:this.id||undefined, cls:(typeof this.className==='string'?this.className.trim():'')||undefined, text:(this.innerText||this.value||'').replace(/\\s+/g,' ').trim().slice(0,60), rect:{x:Math.round(r.x+scrollX),y:Math.round(r.y+scrollY),w:Math.round(r.width),h:Math.round(r.height)} }; }` });
      const info = desc.result.value; if (!info) continue;
      const key = info.tag + '|' + (info.cls || '') + '|' + info.text.slice(0, 20); if (seen.has(key)) continue; seen.add(key);
      const read = async () => { const { computedStyle } = await cdp.send('CSS.getComputedStyleForNode', { nodeId }); const m = Object.fromEntries(computedStyle.map(c => [c.name, c.value])); return Object.fromEntries(watch.map(k => [k, m[k]])); };
      const base = await read();
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] }); const hover = await read();
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['focus', 'focus-visible'] }); const focus = await read();
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['active'] }); const active = await read();
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
      const diff = (a, b) => Object.fromEntries(Object.entries(b).filter(([k, v]) => v !== a[k]));
      const dh = diff(base, hover), df = diff(base, focus), da = diff(base, active);
      if (Object.keys(dh).length || Object.keys(df).length || Object.keys(da).length) out.push({ ...info, base: Object.fromEntries(Object.entries(base).filter(([k]) => k in dh || k in df || k in da)), hover: dh, focus: df, active: da });
    } catch {}
  }
  await cdp.detach();
  return out;
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  // trigger lazy loading by scrolling through
  await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(600);
}

async function dismissCookie(page) {
  const banner = page.locator('.privacy_cookies_banner');
  if (await banner.count() && await banner.first().isVisible().catch(() => false)) {
    await banner.locator('button').first().click().catch(() => {});
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

const browser = await chromium.launch();
const summary = [];
for (const id of pageIds) {
  const rel = PAGES[id]; if (rel === undefined) { console.log('unknown page', id); continue; }
  for (const [w, h] of viewports) {
    const t0 = Date.now();
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, userAgent: w <= 500 ? UA_MOBILE : UA_DESKTOP, locale: locale === 'he-IL' ? 'he-IL' : 'en-US', isMobile: w <= 500, hasTouch: w <= 500 });
    const page = await ctx.newPage();
    const tag = `${id}@${w}`;
    try {
      const url = ORIGIN + '/' + locale + rel;
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await settle(page);
      // cookie banner: record then dismiss
      let cookieShot = null;
      if (await page.locator('.privacy_cookies_banner').first().isVisible().catch(() => false)) {
        cookieShot = `${tag}.cookie-banner.png`;
        await page.screenshot({ path: path.join(dirs.shots, cookieShot), fullPage: false });
      }
      const dismissed = await dismissCookie(page);
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(dirs.shots, `${tag}.png`), fullPage: true, animations: 'disabled' });
      await page.screenshot({ path: path.join(dirs.shots, `${tag}.fold.png`), fullPage: false, animations: 'disabled' });
      const data = await page.evaluate(PAGE_SCRIPT, STYLE_PROPS);
      data.meta = { capturedAt: new Date().toISOString(), status: resp?.status(), finalUrl: page.url(), viewport: [w, h], cookieBannerDismissed: dismissed, cookieBannerShot: cookieShot };
      if (w === 1440 || w === 390) data.states = await hoverFocusStates(page);
      // icon glyph reference crops (1440 only)
      if (w === 1440 && !args['no-assets']) {
        const iconDir = path.join(dirs.assets, 'icon-ref'); fs.mkdirSync(iconDir, { recursive: true });
        for (const [k, v] of Object.entries(data.icons)) {
          const f = path.join(iconDir, k.replace(/[^\w-]/g, '_') + '.png'); if (fs.existsSync(f)) continue;
          const s = v.sample; if (s.w > 0 && s.h > 0 && s.w < 400 && s.h < 400) await page.screenshot({ path: f, clip: { x: s.x, y: s.y, width: s.w, height: s.h }, fullPage: true, scale: 'device' }).catch(() => {});
        }
      }
      if (!args['no-assets']) {
        for (const a of data.assets) { if (a.url && /^https?:/.test(a.url) && !/fontawesome|iplan-fonts|maps\.googleapis|gstatic|recaptcha/.test(a.url)) a.file = await downloadAsset(ctx, a.url, { kind: a.kind, firstSeen: tag }); }
      }
      fs.writeFileSync(path.join(dirs.extract, `${tag}.json`), JSON.stringify(data));
      if (w === 1440) fs.writeFileSync(path.join(dirs.extract, `${id}.html`), await page.evaluate(CLEAN_HTML));
      summary.push({ tag, status: resp?.status(), h: data.doc.scrollHeight, nodes: data.nodes.length, assets: data.assets.length, hscroll: data.doc.hasHScroll, states: data.states?.length, ms: Date.now() - t0 });
      console.log(`${tag.padEnd(34)} ${resp?.status()} h=${data.doc.scrollHeight} nodes=${data.nodes.length} assets=${data.assets.length} states=${data.states?.length ?? '-'} ${data.doc.hasHScroll ? 'HSCROLL!' : ''} ${Date.now() - t0}ms`);
    } catch (e) { console.log(`${tag} ERROR ${e.message.slice(0, 120)}`); summary.push({ tag, error: e.message.slice(0, 200) }); }
    await ctx.close();
    fs.writeFileSync(assetIndexPath, JSON.stringify(assetIndex, null, 1));
  }
}
fs.writeFileSync(path.join(dirs.extract, `_summary.${Date.now()}.json`), JSON.stringify(summary, null, 1));
await browser.close();
