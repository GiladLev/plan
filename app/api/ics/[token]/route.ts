import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/crm/database.types';

// Token-gated calendar feed for phones (webcal). Read-only; the token is the business's secret ics_token.
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const stamp = (d: string | Date) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const fold = (line: string) => { const out: string[] = []; let s = line; while (Buffer.byteLength(s) > 74) { let i = 74; while (Buffer.byteLength(s.slice(0, i)) > 74) i--; out.push(s.slice(0, i)); s = ' ' + s.slice(i); } out.push(s); return out.join('\r\n'); };

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = token.replace(/\.ics$/, '');
  if (!/^[a-f0-9]{32,}$/.test(t)) return new Response('Not found', { status: 404 });
  const sb = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc('ics_feed', { p_token: t });
  if (error) return new Response('Feed unavailable', { status: 502 });
  if (!data?.length) return new Response('Not found', { status: 404 });
  const name = data[0].business_name;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Halo CRM//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(`${name} · Halo`)}`, 'X-WR-TIMEZONE:Asia/Jerusalem'];
  for (const m of data) {
    lines.push('BEGIN:VEVENT', `UID:${m.id}@halo-crm`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(m.starts_at)}`, `DTEND:${stamp(m.ends_at)}`, `SUMMARY:${esc(m.title)}`);
    if (m.location) lines.push(`LOCATION:${esc(m.location)}`, `URL:https://waze.com/ul?q=${encodeURIComponent(m.location)}&navigate=yes`);
    if (m.notes) lines.push(`DESCRIPTION:${esc(m.notes)}`);
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:תזכורת', 'TRIGGER:-PT60M', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return new Response(lines.map(fold).join('\r\n') + '\r\n', { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'private, max-age=300', 'Content-Disposition': 'inline; filename="halo.ics"' } });
}
