import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { availablePages, loadPage } from '@/lib/content';
import { LOCALES, PAGES, idForPath, type Locale } from '@/lib/pages';

type Params = { locale: string; slug?: string[] };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return LOCALES.flatMap((locale) => availablePages(locale).map((id) => ({ locale, slug: PAGES[id] ? PAGES[id].split('/') : [] })));
}

function resolve(p: Params) {
  if (!(LOCALES as readonly string[]).includes(p.locale)) return null;
  const id = idForPath(p.slug);
  return id ? loadPage(p.locale as Locale, id) : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const page = resolve(await params);
  return { title: page?.title ?? 'iPlan' };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const p = await params;
  const page = resolve(p);
  if (!page) notFound();
  return <div id="page" data-page={page.id} className={page.bodyClass} dangerouslySetInnerHTML={{ __html: page.html }} />;
}
