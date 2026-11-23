import { chromium } from '@playwright/test';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA });
const page = await ctx.newPage();
const dirUrl = 'https://iplan.co.il/he-IL/directory/search/categories/1-%D7%9E%D7%AA%D7%97%D7%9D-%D7%90%D7%99%D7%A8%D7%95%D7%A2%D7%99%D7%9D';
for (let i = 0; i < 2; i++) {
  await page.goto(dirUrl + '?directory_brands_filter[order_seed]=4242', { waitUntil: 'networkidle', timeout: 60000 });
  const names = await page.evaluate(() => [...document.querySelectorAll('.search_wrapper h3, .search_wrapper h4, .search_wrapper [class*=title]')].slice(0, 5).map(e => e.innerText.trim()).filter(Boolean));
  const seed = await page.evaluate(() => document.querySelector('[name="directory_brands_filter[order_seed]"]')?.value);
  console.log('seeded run', i, 'seed=', seed, names.slice(0, 3));
}
// privacy statement
let r = await page.goto('https://iplan.co.il/he-IL/client/legal_info/privacy_statement', { waitUntil: 'domcontentloaded', timeout: 45000 });
console.log('privacy:', r.status(), page.url(), (await page.title()));
// compare / and /front/client/home
await page.goto('https://iplan.co.il/he-IL', { waitUntil: 'networkidle', timeout: 60000 });
const a = await page.evaluate(() => [...document.querySelectorAll('main > section, footer')].map(s => s.className + ':' + Math.round(s.getBoundingClientRect().height)));
await page.goto('https://iplan.co.il/he-IL/front/client/home', { waitUntil: 'networkidle', timeout: 60000 });
const b = await page.evaluate(() => [...document.querySelectorAll('main > section, footer')].map(s => s.className + ':' + Math.round(s.getBoundingClientRect().height)));
console.log('/ sections:', a); console.log('/front/client/home sections:', b);
// nav structure
const nav = await page.evaluate(() => {
  const walk = (el, depth = 0) => [...el.children].map(c => {
    const t = c.tagName.toLowerCase(); const txt = c.childNodes.length && c.firstChild?.nodeType === 3 ? c.firstChild.textContent.trim() : '';
    const self = `${'  '.repeat(depth)}<${t}${c.id ? '#' + c.id : ''}${c.className ? '.' + String(c.className).trim().replace(/\s+/g, '.') : ''}${c.getAttribute('href') ? ' href=' + c.getAttribute('href') : ''}${c.getAttribute('data-toggle') ? ' data-toggle=' + c.getAttribute('data-toggle') : ''}> ${txt.slice(0, 40)}`;
    return [self, ...(depth < 7 ? walk(c, depth + 1) : [])].join('\n');
  }).join('\n');
  return walk(document.getElementById('main_navigation'));
});
console.log(nav);
// cookie bar + body top-level
const misc = await page.evaluate(() => ({ bodyKids: [...document.body.children].map(e => e.tagName + (e.id ? '#' + e.id : '') + '.' + String(e.className).trim().replace(/\s+/g, '.')), cookie: (() => { const c = document.querySelector('[class*=cookie], #cookie, [id*=cookie]'); return c ? { cls: c.className, id: c.id, html: c.outerHTML.slice(0, 600) } : null })() }));
console.log(JSON.stringify(misc, null, 1));
await browser.close();
