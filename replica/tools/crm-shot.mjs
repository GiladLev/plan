// Logs into the CRM with the demo account and screenshots the given paths. node crm-shot.mjs <width> <path>...
import { chromium } from '@playwright/test';
const [w, ...paths] = process.argv.slice(2);
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: +w, height: +w < 500 ? 844 : 900 }, locale: 'he-IL', timezoneId: 'Asia/Jerusalem', isMobile: +w < 500, hasTouch: +w < 500 });
const p = await ctx.newPage(); const errs = [];
p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200))); p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
await p.goto('http://localhost:4317/app/login'); await p.getByLabel('אימייל').fill('demo@halo-crm.dev'); await p.getByLabel('סיסמה').fill('Halo-demo-2026');
await p.getByRole('button', { name: 'כניסה', exact: true }).click(); await p.waitForURL('**/app', { timeout: 20000 });
for (const path of paths) { await p.goto('http://localhost:4317' + path); await p.waitForLoadState('networkidle'); await p.waitForTimeout(700); const f = `/tmp/iplan-recon/crm${path.replace(/\W+/g, '_')}@${w}.png`; await p.screenshot({ path: f, fullPage: false }); console.log(f); }
console.log(errs.join('\n') || 'no console errors'); await b.close();
