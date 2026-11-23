import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createClient } from '@supabase/supabase-js';

export const E2E = { email: 'e2e@halo-crm.dev', password: 'Halo-e2e-2026' };
export const OTHER = { email: 'e2e-other@halo-crm.dev', password: 'Halo-e2e-2026' };
export const SB_URL = 'https://jqvaikartlqiruhjwgat.supabase.co';
export const SB_KEY = 'sb_publishable_73nxg_JZsO2K3DQVr3f-fg_d4clDoQ-';

export function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Download the React DevTools/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });
  return errors;
}

export async function login(page: Page, who = E2E) {
  await page.goto('/app/login');
  await page.getByLabel('אימייל').fill(who.email);
  await page.getByLabel('סיסמה').fill(who.password);
  await page.getByRole('button', { name: 'כניסה', exact: true }).click();
  await page.waitForURL('**/app');
  await expect(page.getByRole('heading', { level: 1, name: 'היום' })).toBeVisible();
}

export async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).disableRules(['color-contrast']).analyze();
  const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`)).toEqual([]);
}

export async function apiAs(who = E2E) {
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { error } = await sb.auth.signInWithPassword(who);
  if (error) throw error;
  return sb;
}
