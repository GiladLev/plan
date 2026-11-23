import fs from 'node:fs';
import path from 'node:path';
import { ALIAS, PAGES, type Locale } from './pages';

export interface PageContent { id: string; title: string; lang: string; dir: 'rtl' | 'ltr'; bodyClass: string; html: string }

const root = path.join(process.cwd(), 'content');

export function loadPage(locale: Locale, id: string): PageContent | null {
  const file = path.join(root, locale, `${ALIAS[id] ?? id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as PageContent;
}

export function availablePages(locale: Locale): string[] {
  return Object.keys(PAGES).filter((id) => fs.existsSync(path.join(root, locale, `${ALIAS[id] ?? id}.json`)));
}
