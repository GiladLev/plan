import { chromium } from '@playwright/test';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA });
const page = await ctx.newPage();
const reqs = new Set();
page.on('request', r => { const u = r.url(); if (!u.includes('iplan.co.il') && !u.includes('cloudfront')) reqs.add(new URL(u).host); });
await page.goto('https://iplan.co.il/he-IL/directory/search/categories/1-%D7%9E%D7%AA%D7%97%D7%9D-%D7%90%D7%99%D7%A8%D7%95%D7%A2%D7%99%D7%9D', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);
const d = await page.evaluate(() => {
  const out = {};
  out.mapLibs = { google: !!window.google?.maps, leaflet: !!window.L, mapbox: !!window.mapboxgl };
  out.jq = window.jQuery?.fn?.jquery; out.bs = !!window.jQuery?.fn?.modal; out.plugins = Object.keys(window.jQuery?.fn || {}).filter(k => !['init','jquery','constructor'].includes(k)).slice(0, 80);
  out.mainChildren = [...document.querySelector('main')?.children || []].map(e => ({ tag: e.tagName, cls: e.className.slice(0, 80), h: Math.round(e.getBoundingClientRect().height) }));
  out.cards = document.querySelectorAll('[class*=card], [class*=result], [class*=item]').length;
  out.icons = [...new Set([...document.querySelectorAll('i[class*=fa], [class*="fa-"], [class*="icon-"], [class*="ip-"]')].map(e => e.className))].slice(0, 60);
  out.forms = [...document.querySelectorAll('form')].map(f => ({ action: f.action, method: f.method, fields: [...f.elements].map(e => e.name || e.id).filter(Boolean).slice(0, 20) }));
  out.text = document.body.innerText.replace(/\s+/g, ' ').slice(0, 1500);
  return out;
});
console.log(JSON.stringify(d, null, 1));
console.log('third-party hosts:', [...reqs]);
await page.screenshot({ path: '/tmp/iplan-recon/dir-1440.png', fullPage: false });
await page.screenshot({ path: '/tmp/iplan-recon/dir-1440-full.png', fullPage: true });
// en-US font check
await page.goto('https://iplan.co.il/en-US', { waitUntil: 'networkidle', timeout: 60000 });
const en = await page.evaluate(() => ({ dir: document.body.className, font: getComputedStyle(document.body).fontFamily, h1: getComputedStyle(document.querySelector('h1')).fontFamily, loaded: [...document.fonts].map(f => f.family + ' ' + f.weight + ' ' + f.status) }));
console.log('EN:', JSON.stringify(en));
await browser.close();
