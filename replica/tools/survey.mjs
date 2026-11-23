import { chromium } from '@playwright/test';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const pages = [
  '/he-IL/client/sign_in', '/he-IL/corp/sign_in',
  '/he-IL/directory/search/categories/1-%D7%9E%D7%AA%D7%97%D7%9D-%D7%90%D7%99%D7%A8%D7%95%D7%A2%D7%99%D7%9D',
  '/he-IL/front/client/home', '/he-IL/front/client/guest_list', '/he-IL/front/client/sketches', '/he-IL/front/client/rsvp',
  '/he-IL/front/client/testimonials', '/he-IL/front/client/help',
  '/he-IL/front/vendor/home', '/he-IL/front/vendor/marketing',
  '/he-IL/front/about', '/he-IL/front/contact', '/he-IL/front/jobs', '/he-IL/front/accessibility_statement',
  '/en-US',
];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA });
const page = await ctx.newPage();
for (const p of pages) {
  try {
    const resp = await page.goto('https://iplan.co.il' + p, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const info = await page.evaluate(() => ({
      title: document.title, h: document.documentElement.scrollHeight, url: location.pathname,
      sections: [...document.querySelectorAll('main > section, main > div.section, body > section, form, .map, #map, iframe, [class*=slider], [class*=carousel], [class*=owl], [class*=tab]')].length,
      body: document.body.className,
      fonts: [...new Set([...document.querySelectorAll('h1,h2,p,a,button,input')].map(e => getComputedStyle(e).fontFamily))].join(' | '),
      imgs: document.images.length,
      rubik: document.fonts.check('16px Rubik'),
    }));
    console.log(resp.status(), p.slice(0, 60).padEnd(60), 'h=' + info.h, 'sections=' + info.sections, 'imgs=' + info.imgs, 'rubikLoaded=' + info.rubik, '|', info.title);
  } catch (e) { console.log('ERR', p, e.message.slice(0, 80)); }
}
// mobile + tablet home screenshots
for (const [w, h] of [[390, 844], [1024, 768]]) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, userAgent: w < 500 ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' : UA, deviceScaleFactor: 1 });
  const pg = await c.newPage();
  await pg.goto('https://iplan.co.il/he-IL', { waitUntil: 'networkidle', timeout: 60000 });
  await pg.waitForTimeout(1000);
  await pg.screenshot({ path: `/tmp/iplan-recon/home-${w}.png`, fullPage: true });
  console.log('shot', w, await pg.evaluate(() => document.documentElement.scrollHeight));
  await c.close();
}
await browser.close();
