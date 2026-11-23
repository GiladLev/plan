// Turns the extracted DOM snapshots into clean, locally-wired page bodies for the Next.js app.
// Output: content/<locale>/<id>.json  { id, title, lang, dir, bodyClass, html }  + public/assets/*
import { chromium } from '@playwright/test';
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { PAGES } from './pages.mjs';
const ROOT = path.resolve(import.meta.dirname, '../..'); const PIX = path.join(ROOT, 'replica/pixel');
const OUT = path.join(ROOT, 'content'); const PUB = path.join(ROOT, 'public/assets');
fs.mkdirSync(PUB, { recursive: true });
const index = JSON.parse(fs.readFileSync(path.join(PIX, 'assets/index.json'), 'utf8'));
const urlMap = {}; // remote url (no query) -> /assets/file
const norm = u => { try { const x = new URL(u, 'https://iplan.co.il'); return x.origin + x.pathname; } catch { return u; } };
for (const [u, v] of Object.entries(index)) if (v.file) { urlMap[norm(u)] = '/assets/' + v.file; const src = path.join(PIX, 'assets', v.file); const dst = path.join(PUB, v.file); if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst); }
for (const loc of ['he-IL', 'en-US']) { const p = path.join(PIX, 'seed', loc, '_downloads.json'); if (!fs.existsSync(p)) continue; for (const [u, f] of Object.entries(JSON.parse(fs.readFileSync(p, 'utf8')))) if (f) { const file = path.basename(f); urlMap[norm(u)] = '/assets/directory/' + file; fs.mkdirSync(path.join(PUB, 'directory'), { recursive: true }); const src = path.join(PIX, 'assets', f), dst = path.join(PUB, 'directory', file); if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst); } }
const sha = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
const missing = new Set();
const browser = await chromium.launch(); const ctx = await browser.newContext(); const page = await ctx.newPage();
const ids = process.argv[2] ? process.argv[2].split(',') : Object.keys(PAGES);
for (const locale of ['he-IL', 'en-US']) {
  fs.mkdirSync(path.join(OUT, locale), { recursive: true });
  for (const id of ids) {
    const snap = path.join(PIX, 'extract', locale, id + '.html'); const meta = path.join(PIX, 'extract', locale, id + '@1440.json');
    if (!fs.existsSync(snap) || !fs.existsSync(meta)) continue;
    const doc = JSON.parse(fs.readFileSync(meta, 'utf8')).doc;
    if (doc.title === undefined) continue;
    const status = JSON.parse(fs.readFileSync(meta, 'utf8')).meta?.status;
    if (status === 404 && id !== 'not-found') continue; // page does not exist in this locale
    await page.setContent(fs.readFileSync(snap, 'utf8').replace(/^<!--[^>]*-->\n?/, ''), { waitUntil: 'domcontentloaded' });
    const res = await page.evaluate(({ urlMap, locale }) => {
      const missing = [];
      const norm = u => { try { const x = new URL(u, 'https://iplan.co.il'); return x.origin + x.pathname; } catch { return u; } };
      const mapUrl = u => { if (!u || u.startsWith('data:') || u.startsWith('/assets/')) return u; const m = urlMap[norm(u)]; if (m) return m; if (/^https?:|^\/\//.test(u) && /\.(png|jpe?g|gif|svg|webp)(\?|$)/i.test(u)) missing.push(u); return u; };
      const B = document.body;
      B.querySelectorAll('script,noscript,style,link,.pswp,a.typeahead-mask,#bs-remote-modal,.grecaptcha-badge,iframe[src*="recaptcha"],iframe[src*="doubleclick"]').forEach(n => n.remove());
      // flickity -> plain carousel markup
      B.querySelectorAll('.flickity-enabled').forEach(c => { const cells = [...c.querySelectorAll('.carousel-cell')]; c.querySelectorAll('.flickity-viewport,.flickity-prev-next-button,.flickity-page-dots').forEach(n => n.remove()); cells.forEach(cell => { cell.style.removeProperty('position'); cell.style.removeProperty('right'); cell.style.removeProperty('left'); cell.classList.remove('is-selected', 'flickity-bg-lazyloaded'); c.appendChild(cell); }); c.classList.remove('flickity-enabled', 'flickity-rtl', 'is-draggable'); c.removeAttribute('tabindex'); });
      // lazy bg -> data-bg
      B.querySelectorAll('[data-flickity-bg-lazyload]').forEach(n => { n.setAttribute('data-bg', mapUrl(n.getAttribute('data-flickity-bg-lazyload'))); n.removeAttribute('data-flickity-bg-lazyload'); });
      // typeahead -> plain input
      B.querySelectorAll('.twitter-typeahead').forEach(t => { const inp = t.querySelector('input.tt-input'); if (inp) { inp.removeAttribute('style'); inp.removeAttribute('dir'); inp.removeAttribute('spellcheck'); inp.removeAttribute('aria-activedescendant'); inp.removeAttribute('aria-owns'); inp.removeAttribute('role'); inp.removeAttribute('aria-expanded'); inp.removeAttribute('aria-autocomplete'); t.replaceWith(inp); } else t.remove(); });
      B.querySelectorAll('input.tt-hint').forEach(n => n.remove());
      const gm = B.querySelector('#google_map'); if (gm) gm.innerHTML = '';
      // JS-added state
      B.querySelectorAll('.dropdown.open').forEach(n => { if (!n.closest('#main_navigation_modal')) n.classList.remove('open'); });
      B.querySelectorAll('.privacy_cookies_banner').forEach(n => n.removeAttribute('style'));
      B.querySelectorAll('[aria-describedby^="tooltip"]').forEach(n => n.removeAttribute('aria-describedby'));
      B.querySelectorAll('.tooltip, .popover').forEach(n => n.remove());
      B.querySelectorAll('[style*="visibility: hidden"][style*="white-space: pre"]').forEach(n => n.remove());
      // urls
      B.querySelectorAll('img').forEach(i => { i.setAttribute('src', mapUrl(i.getAttribute('src'))); i.removeAttribute('srcset'); });
      B.querySelectorAll('[style*="url("]').forEach(n => n.setAttribute('style', n.getAttribute('style').replace(/url\((["']?)([^"')]+)\1\)/g, (_, q, u) => `url('${mapUrl(u)}')`)));
      B.querySelectorAll('source').forEach(s => s.remove());
      const LOCAL = /^\/(he-IL|en-US)(\/(front|client\/sign_in|corp\/sign_in|directory\/search)|\/?$|\?)/;
      B.querySelectorAll('a[href]').forEach(a => { const h = a.getAttribute('href'); let u; try { u = new URL(h, 'https://iplan.co.il'); } catch { return; } if (u.origin === 'https://iplan.co.il') { const local = u.pathname + u.search; if (LOCAL.test(u.pathname) && !u.pathname.includes('/legal_info/')) a.setAttribute('href', decodeURI(u.pathname) + u.search + u.hash); else if (!h.startsWith('#') && !h.startsWith('javascript')) { a.setAttribute('href', 'https://iplan.co.il' + local); a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); } } });
      B.querySelectorAll('form').forEach(f => { f.removeAttribute('action'); f.setAttribute('data-replica-form', ''); });
      B.querySelectorAll('input[name=authenticity_token]').forEach(n => n.remove());
      // trailing empty nodes
      [...B.children].forEach(c => { if (c.tagName === 'DIV' && !c.className && !c.id && !c.textContent.trim() && !c.querySelector('img,iframe')) c.remove(); });
      let html = B.innerHTML.replace(/\n{2,}/g, '\n').replace(/[ \t]+\n/g, '\n');
      return { html, missing, bodyClass: B.className };
    }, { urlMap, locale });
    res.missing.forEach(u => missing.add(u));
    fs.writeFileSync(path.join(OUT, locale, id + '.json'), JSON.stringify({ id, title: doc.title, lang: doc.lang || (locale === 'he-IL' ? 'he' : 'en'), dir: doc.dir === 'rtl' ? 'rtl' : 'ltr', bodyClass: res.bodyClass.trim(), html: res.html }));
    console.log(locale, id, Math.round(res.html.length / 1024) + 'KB', res.missing.length ? 'missing ' + res.missing.length : '');
  }
}
// download any images that were referenced but never captured, then rerun is needed to remap
if (missing.size) {
  for (const u of missing) { const file = sha(norm(u)) + '-' + path.basename(new URL(u, 'https://iplan.co.il').pathname).replace(/-[0-9a-f]{64}/, '').replace(/[^\w.\-]/g, '_'); try { const r = await ctx.request.get(u.startsWith('//') ? 'https:' + u : u); if (r.ok()) { fs.writeFileSync(path.join(PIX, 'assets', file), await r.body()); index[u] = { file, kind: 'late', bytes: (await r.body()).length }; } } catch {} }
  fs.writeFileSync(path.join(PIX, 'assets/index.json'), JSON.stringify(index, null, 1));
  console.log('downloaded', missing.size, 'late assets — rerun to remap');
}
await browser.close();
