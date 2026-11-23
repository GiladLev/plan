'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { CalendarDays, CheckSquare, FileText, KanbanSquare, LogOut, PartyPopper, Sun, Users } from 'lucide-react';
import { useCrm } from './CrmProvider';
import { Avatar } from './ui';
import { supabase } from '@/lib/crm/supabase';
import { useQuery } from '@/lib/crm/store';
import { listClients, listTasks } from '@/lib/crm/api';

const NAV = [
  { href: '/app', label: 'היום', icon: Sun, tab: true },
  { href: '/app/pipeline', label: 'צינור מכירות', icon: KanbanSquare, tab: true, section: 'לקוחות' },
  { href: '/app/clients', label: 'לקוחות', icon: Users, tab: false },
  { href: '/app/tasks', label: 'משימות', icon: CheckSquare, tab: false },
  { href: '/app/calendar', label: 'יומן', icon: CalendarDays, tab: true, section: 'תפעול' },
  { href: '/app/events', label: 'אירועים', icon: PartyPopper, tab: true },
  { href: '/app/documents', label: 'מסמכים וכספים', icon: FileText, tab: false },
];

export function AppShell({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const path = usePathname();
  const { business, displayName } = useCrm();
  const { data: clients } = useQuery(`clients:${business.id}`, () => listClients(business.id));
  const { data: tasks } = useQuery(`tasks:${business.id}`, () => listTasks(business.id));
  const badges: Record<string, { n: number; hot?: boolean }> = {
    '/app/pipeline': { n: clients?.filter((c) => c.stage === 'inquiry').length ?? 0, hot: true },
    '/app/clients': { n: clients?.length ?? 0 },
    '/app/tasks': { n: tasks?.filter((t) => !t.done).length ?? 0 },
  };
  const current = (href: string) => (href === '/app' ? path === '/app' : path.startsWith(href));
  return (
    <div className="shell">
      <aside className="sidebar" aria-label="ניווט ראשי">
        <div className="brand"><span className="brand-mark" aria-hidden="true">H</span><div><div className="brand-name">Halo</div><div className="brand-biz">{business.name}</div></div></div>
        <nav>
          {NAV.map((n) => (
            <div key={n.href}>
              {n.section && <div className="nav-section">{n.section}</div>}
              <Link className="nav-item" href={n.href} aria-current={current(n.href) ? 'page' : undefined}>
                <n.icon aria-hidden="true" />{n.label}
                {badges[n.href]?.n ? <span className={`nav-badge ${badges[n.href].hot ? 'hot' : ''}`}>{badges[n.href].n}</span> : null}
              </Link>
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <Avatar name={displayName || 'U'} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{displayName}</div><div className="t-caption">בעלים</div></div>
          <button className="btn btn-ghost btn-icon btn-sm" aria-label="התנתקות" onClick={() => supabase().auth.signOut()}><LogOut /></button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar"><h1>{title}</h1><div className="spacer" />{actions}</header>
        <main className="content" id="main">{children}</main>
      </div>
      <nav className="tabbar" aria-label="ניווט">
        {NAV.filter((n) => n.tab).map((n) => <Link key={n.href} href={n.href} aria-current={current(n.href) ? 'page' : undefined}><n.icon aria-hidden="true" />{n.label}</Link>)}
      </nav>
    </div>
  );
}
