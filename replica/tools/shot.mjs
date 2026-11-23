// quick look: node shot.mjs <url> <out.png> [width] [full]
import { chromium } from '@playwright/test';
const [url, out, w = '1440', full] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: 900 } });
const errs = []; p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('requestfailed', r => errs.push('FAIL ' + r.url())); p.on('response', r => r.status() >= 400 && errs.push(r.status() + ' ' + r.url()));
await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
await p.screenshot({ path: out, fullPage: !!full }); console.log(errs.join('\n')); await b.close();
