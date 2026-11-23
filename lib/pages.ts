export const LOCALES = ['he-IL', 'en-US'] as const;
export type Locale = (typeof LOCALES)[number];

const DIR: Record<string, string> = {
  'dir-1-venues': '1-מתחם-אירועים',
  'dir-2-dresses': '2-שמלות-כלה-וערב',
  'dir-5-makeup-hair': '5-איפור-ועיצוב-שיער',
  'dir-6-design': '6-עיצוב',
  'dir-8-catering': '8-קייטרינג',
  'dir-9-photo': '9-צילום',
  'dir-10-magnets': '10-צילום-מגנטים',
  'dir-11-music': '11-מוזיקה',
  'dir-18-attractions': '18-אטרקציות',
  'dir-19-transport': '19-הסעות-לאורחים',
  'dir-23-invitations': '23-הזמנות-ומיתוג-לאירוע',
  'dir-25-bar': '25-שירותי-בר',
  'dir-32-jewelry': '32-תכשיטים-ואקססוריז',
  'dir-37-production': '37-הפקת-אירוע',
};

/** page id -> path below the locale prefix ('' = locale root) */
export const PAGES: Record<string, string> = {
  home: '',
  'client-home': 'front/client/home',
  'client-sign-in': 'client/sign_in',
  'corp-sign-in': 'corp/sign_in',
  about: 'front/about',
  accessibility: 'front/accessibility_statement',
  contact: 'front/contact',
  jobs: 'front/jobs',
  'client-credit-gifts': 'front/client/credit_gifts',
  'client-digital-invitation': 'front/client/digital_invitation',
  'client-guest-list': 'front/client/guest_list',
  'client-help': 'front/client/help',
  'client-minisite': 'front/client/minisite',
  'client-notify': 'front/client/notify',
  'client-reception': 'front/client/reception',
  'client-rsvp': 'front/client/rsvp',
  'client-sketches': 'front/client/sketches',
  'client-tasks': 'front/client/tasks',
  'client-testimonials': 'front/client/testimonials',
  'vendor-home': 'front/vendor/home',
  'vendor-marketing': 'front/vendor/marketing',
  ...Object.fromEntries(Object.entries(DIR).map(([k, v]) => [k, `directory/search/categories/${v}`])),
};

/** pages whose markup is shared with another id */
export const ALIAS: Record<string, string> = { 'client-home': 'home' };

export function idForPath(slug: string[] | undefined): string | undefined {
  const p = (slug ?? []).map((s) => decodeURIComponent(s)).join('/');
  return Object.keys(PAGES).find((k) => PAGES[k] === p);
}
