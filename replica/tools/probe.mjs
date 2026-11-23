import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36' });
const page = await ctx.newPage();
await page.goto('https://iplan.co.il/he-IL', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
const info = await page.evaluate(() => {
  const cs = getComputedStyle(document.body);
  const fonts = new Set(); const colors = new Set(); const bgs = new Set();
  document.querySelectorAll('*').forEach(el => { const s = getComputedStyle(el); fonts.add(s.fontFamily); colors.add(s.color); if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') bgs.add(s.backgroundColor); });
  const faces = []; const medias = new Set();
  for (const sheet of document.styleSheets) { try { for (const r of sheet.cssRules) { if (r instanceof CSSFontFaceRule) faces.push(r.cssText.slice(0,300)); if (r instanceof CSSMediaRule) medias.add(r.conditionText); } } catch(e) { faces.push('BLOCKED:' + sheet.href); } }
  const sections = [...document.querySelectorAll('nav, main > section, footer')].map(s => { const r = s.getBoundingClientRect(); return { tag: s.tagName, cls: s.className, top: Math.round(r.top + scrollY), h: Math.round(r.height), text: s.innerText.replace(/\s+/g,' ').slice(0,100) }; });
  return { scrollHeight: document.documentElement.scrollHeight, bodyFont: cs.fontFamily, bodyFontSize: cs.fontSize, bodyColor: cs.color, bodyBg: cs.backgroundColor, dir: document.documentElement.dir || document.body.dir, lang: document.documentElement.lang, fonts: [...fonts], colors: [...colors], bgs: [...bgs], faces, medias: [...medias], sections };
});
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: '/tmp/iplan-recon/home-1440.png', fullPage: true });
await browser.close();
