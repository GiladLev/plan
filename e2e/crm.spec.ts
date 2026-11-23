import { expect, test } from '@playwright/test';
import { apiAs, axe, login, OTHER, watchConsole } from './helpers';

test.describe('Halo CRM', () => {
  test('F01 today dashboard renders live data, no console errors, a11y clean', async ({ page }) => {
    const errors = watchConsole(page);
    await login(page);
    await expect(page.getByText('פניות שממתינות')).toBeVisible();
    await expect(page.locator('.kpi-value').first()).not.toBeEmpty();
    await axe(page);
    expect(errors).toEqual([]);
  });

  test('F02 create client, log a note, schedule a meeting, it shows on the timeline', async ({ page }) => {
    const errors = watchConsole(page);
    await login(page);
    await page.goto('/app/clients');
    await page.getByRole('button', { name: 'לקוח חדש' }).click();
    const name = `בדיקה ${Date.now() % 100000}`;
    await page.getByLabel('שם הלקוח / הזוג').fill(name);
    await page.getByLabel('טלפון').fill('050-1234567');
    await page.getByRole('button', { name: 'הוספה' }).click();
    await page.waitForURL(/\/app\/clients\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await page.getByLabel('תוכן').fill('לקוח מעדיף ספטמבר');
    await page.getByRole('button', { name: 'תיעוד' }).click();
    await expect(page.locator('.timeline')).toContainText('לקוח מעדיף ספטמבר');
    await page.locator('.quick-actions').getByRole('button', { name: 'פגישה' }).click();
    await page.getByRole('button', { name: 'קביעה' }).click();
    await expect(page.locator('.timeline')).toContainText('פגישה');
    await axe(page);
    expect(errors).toEqual([]);
  });

  test('F03 pipeline: drag a card to another stage persists after reload', async ({ page }) => {
    await login(page);
    await page.goto('/app/pipeline');
    const card = page.locator('[data-stage="inquiry"] .kanban-card').first();
    const name = (await card.locator('.kc-name').textContent())!.trim();
    const target = page.locator('[data-stage="proposal"] .kanban-list');
    const a = (await card.boundingBox())!; const b = (await target.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(a.x + a.width / 2 + ((b.x + b.width / 2) - (a.x + a.width / 2)) * i / 12, a.y + 20 + (b.y + b.height - a.y - 10) * i / 12);
    await expect(page.locator('.kanban-ph')).toBeVisible();
    await page.mouse.up();
    await expect(page.locator('[data-stage="proposal"]')).toContainText(name);
    await page.reload();
    await expect(page.locator('[data-stage="proposal"]')).toContainText(name);
    // keyboard parity: move it back with an arrow key (RTL: right = previous stage)
    await page.locator('[data-stage="proposal"] .kanban-card', { hasText: name }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-stage="meeting"]')).toContainText(name);
  });

  test('F04 invoice: issuing twice with the same key yields exactly one number', async ({ page }) => {
    await login(page);
    await page.goto('/app/documents');
    await page.getByRole('button', { name: 'חשבונית' }).click();
    await page.waitForURL(/\/app\/documents\/[0-9a-f-]{36}$/);
    await page.getByLabel('לקוח').selectOption({ index: 1 });
    await page.getByLabel('תיאור שורה 1').fill('חבילת אירוע');
    await page.getByLabel('מחיר ליחידה').fill('1000');
    await expect(page.locator('.paper')).toContainText('1,180.00');
    const issue = page.getByRole('button', { name: 'הפקה' });
    await issue.dblclick();
    await expect(page.locator('.doc-actions')).toContainText('הופק');
    const id = page.url().split('/').pop()!;
    const sb = await apiAs();
    const key = crypto.randomUUID();
    const first = await sb.rpc('issue_document', { p_document: id, p_key: key });
    const again = await sb.rpc('issue_document', { p_document: id, p_key: key });
    expect(first.data.number).toBe(again.data.number);
    expect(Number(first.data.total)).toBe(1180);
    await expect(page.getByLabel('תיאור שורה 1')).toBeDisabled();
  });

  test('F05 seating: server refuses to overfill a table (concurrent requests)', async () => {
    const sb = await apiAs();
    const { data: ev } = await sb.from('events').select('id').limit(1).single();
    const { data: t } = await sb.from('seating_tables').insert({ business_id: (await sb.from('members').select('business_id').single()).data!.business_id, event_id: ev!.id, label: `T${Date.now() % 1000}`, capacity: 2, x: 500, y: 500 }).select().single();
    const { data: guests } = await sb.from('guests').select('id, party_size').eq('event_id', ev!.id).is('table_id', null).eq('party_size', 1).limit(6);
    const results = await Promise.all(guests!.map((g) => sb.rpc('assign_guest', { p_guest: g.id, p_table: t!.id })));
    const okCount = results.filter((r) => !r.error).length;
    expect(okCount).toBe(2);
    expect(results.filter((r) => r.error?.message === 'TABLE_FULL').length).toBe(guests!.length - 2);
    const { data: seated } = await sb.from('guests').select('party_size').eq('table_id', t!.id);
    expect(seated!.reduce((s, g) => s + g.party_size, 0)).toBeLessThanOrEqual(2);
    await sb.from('guests').update({ table_id: null }).eq('table_id', t!.id);
    await sb.from('seating_tables').delete().eq('id', t!.id);
  });

  test('F06 kiosk: check-ins made offline sync once on reconnect, no duplicates', async ({ page, context }) => {
    await login(page);
    const sb = await apiAs();
    const { data: ev } = await sb.from('events').select('id').limit(1).single();
    await page.goto(`/app/events/${ev!.id}/kiosk`);
    await expect(page.locator('.kiosk-row').first()).toBeVisible();
    await context.setOffline(true);
    await expect(page.getByText(/לא מקוון/)).toBeVisible();
    const rows = page.locator('.kiosk-row:not(.in)');
    const names: string[] = [];
    for (let i = 0; i < 2; i++) { const r = rows.first(); names.push((await r.locator('.kr-main b').textContent())!.trim()); await r.click(); await page.getByLabel('חיפוש אורח').fill(''); }
    await expect(page.getByText(/2 בתור/)).toBeVisible();
    await page.reload().catch(() => {}); // offline reload: manifest + queue must survive (served from cache when available)
    await context.setOffline(false);
    if (!page.url().includes('kiosk')) await page.goto(`/app/events/${ev!.id}/kiosk`);
    await expect(page.getByText('מחובר')).toBeVisible({ timeout: 20000 });
    for (const n of names) {
      const { data } = await sb.from('guests').select('id, checked_in_at').eq('event_id', ev!.id).eq('name', n);
      expect(data!.some((g) => g.checked_in_at)).toBe(true);
      const { count } = await sb.from('checkins').select('*', { count: 'exact', head: true }).in('guest_id', data!.map((g) => g.id));
      expect(count).toBeLessThanOrEqual(data!.length);
    }
  });

  test('S01 tenant isolation: another business cannot read or write this one', async () => {
    const mine = await apiAs();
    const other = await apiAs(OTHER);
    const { data: myClients } = await mine.from('clients').select('id, business_id').limit(1);
    const target = myClients![0];
    const read = await other.from('clients').select('*').eq('id', target.id);
    expect(read.data).toEqual([]);
    const write = await other.from('clients').update({ name: 'hacked' }).eq('id', target.id).select();
    expect(write.data).toEqual([]);
    const insert = await other.from('clients').insert({ business_id: target.business_id, name: 'x' });
    expect(insert.error).not.toBeNull();
    const anon = await (await import('@supabase/supabase-js')).createClient('https://jqvaikartlqiruhjwgat.supabase.co', 'sb_publishable_73nxg_JZsO2K3DQVr3f-fg_d4clDoQ-').from('clients').select('id').limit(1);
    expect(anon.data ?? []).toEqual([]);
  });

  test('R01 every CRM screen: no horizontal overflow at 1024 and no console errors', async ({ page }) => {
    const errors = watchConsole(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await login(page);
    for (const path of ['/app', '/app/pipeline', '/app/clients', '/app/tasks', '/app/calendar', '/app/documents', '/app/events']) {
      await page.goto(path); await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    expect(errors).toEqual([]);
  });

  test('R02 @mobile tab bar navigation and no horizontal overflow', async ({ page }) => {
    await login(page);
    await expect(page.locator('.tabbar')).toBeVisible();
    for (const label of ['צינור מכירות', 'יומן', 'אירועים', 'היום']) {
      await page.locator('.tabbar').getByText(label).click();
      await page.waitForLoadState('networkidle');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    }
  });

  test('A01 reduced motion: springs collapse, UI still works', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page);
    await page.goto('/app/tasks');
    await expect(page.getByRole('heading', { level: 1, name: 'משימות' })).toBeVisible();
    await axe(page);
  });
});
