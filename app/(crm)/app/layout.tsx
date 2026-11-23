import type { Metadata, Viewport } from 'next';
import { Heebo } from 'next/font/google';
import { CrmProvider } from '@/components/crm/CrmProvider';
import { ToastRegion } from '@/components/crm/Toast';
import '@/styles/crm/crm.css';

const heebo = Heebo({ subsets: ['hebrew', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-heebo', display: 'swap' });

export const metadata: Metadata = { title: { default: 'Halo — ניהול עסק אירועים', template: '%s · Halo' }, description: 'CRM לאולמות וספקי אירועים' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#f5f5f7' };

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="crm">
        <a href="#main" className="sr-only">דילוג לתוכן</a>
        <CrmProvider>{children}</CrmProvider>
        <ToastRegion />
      </body>
    </html>
  );
}
