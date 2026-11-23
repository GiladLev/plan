import type { Metadata, Viewport } from 'next';
import { Rubik } from 'next/font/google';
import Behaviors from '@/components/Behaviors';

const rubik = Rubik({ subsets: ['hebrew', 'latin'], weight: ['300', '400', '500', '700', '900'], display: 'swap', variable: '--font-rubik' });

const CSS_VERSION = process.env.NEXT_PUBLIC_BUILD_ID ?? '1';

export const metadata: Metadata = {
  icons: { icon: [{ url: '/assets/favicon__production-favicon-square_32.png', sizes: '32x32' }, { url: '/assets/favicon__production-favicon-square_16.png', sizes: '16x16' }], apple: '/assets/favicon__apple-touch-icon.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en-US';
  return (
    <html lang={en ? 'en' : 'he'} dir={en ? 'ltr' : 'rtl'} className={rubik.variable}>
      <head>
        <link rel="stylesheet" href={`/css/app-${en ? 'ltr' : 'rtl'}.css?v=${CSS_VERSION}`} />
      </head>
      <body className={en ? 'ltr locale-en' : 'rtl locale-he'}>
        {children}
        <Behaviors />
      </body>
    </html>
  );
}
