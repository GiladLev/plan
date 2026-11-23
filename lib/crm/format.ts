// Hebrew-first formatting helpers (Intl, tabular-friendly)
const nis = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });
const nis2 = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat('he-IL');
export const money = (v: number | null | undefined, cents = false) => (v == null ? '—' : (cents ? nis2 : nis).format(Number(v)));
export const number = (v: number | null | undefined) => (v == null ? '—' : num.format(Number(v)));
export const dateShort = (d: string | Date | null | undefined) => (d ? new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }) : '—');
export const dateLong = (d: string | Date | null | undefined) => (d ? new Date(d).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—');
export const dateNum = (d: string | Date | null | undefined) => (d ? new Date(d).toLocaleDateString('he-IL') : '—');
export const time = (d: string | Date) => new Date(d).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
export function relative(d: string | Date): string {
  const diff = (new Date(d).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('he', { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return 'עכשיו';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  return dateShort(d);
}
export const daysUntil = (d: string) => Math.round((new Date(d + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
export function initials(name: string) { const p = name.replace(/[—–-].*$/, '').trim().split(/\s+/); return (p[0]?.[0] ?? '') + (p[1]?.[0] ?? ''); }
const HUES = [212, 262, 330, 24, 150, 190, 290, 4];
export function avatarColor(seed: string) { let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0; const hue = HUES[h % HUES.length]; return `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${(hue + 24) % 360} 68% 46%))`; }
export const wazeLink = (q: string) => `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes`;
export const telLink = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`;
export const waLink = (p: string, text = '') => `https://wa.me/972${p.replace(/\D/g, '').replace(/^0/, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
