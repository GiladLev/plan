'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/crm/supabase';
import type { Business } from '@/lib/crm/types';

type Ctx = { session: Session; business: Business; role: string; displayName: string; refreshBusiness: () => Promise<void> };
const CrmCtx = createContext<Ctx | null>(null);
export const useCrm = () => { const c = useContext(CrmCtx); if (!c) throw new Error('useCrm outside provider'); return c; };

const PUBLIC = ['/app/login'];

/** Resolves session → membership → business, and routes to login/onboarding when either is missing. */
export function CrmProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [membership, setMembership] = useState<{ business: Business; role: string; display_name: string | null } | null | undefined>(undefined);

  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadMembership = async () => {
    const { data } = await supabase().from('members').select('role, display_name, businesses(*)').order('created_at').limit(1).maybeSingle();
    setMembership(data ? { business: data.businesses as unknown as Business, role: data.role, display_name: data.display_name } : null);
  };
  useEffect(() => { if (session) void loadMembership(); else if (session === null) setMembership(null); }, [session?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPublic = PUBLIC.includes(path);
  useEffect(() => {
    if (session === null && !isPublic) router.replace('/app/login');
    else if (session && membership === null && path !== '/app/onboarding') router.replace('/app/onboarding');
    else if (session && membership && (isPublic || path === '/app/onboarding')) router.replace('/app');
  }, [session, membership, path, isPublic, router]);

  if (isPublic || path === '/app/onboarding') return <>{children}</>;
  if (!session || !membership) return <BootScreen />;
  return (
    <CrmCtx.Provider value={{ session, business: membership.business, role: membership.role, displayName: membership.display_name ?? session.user.email?.split('@')[0] ?? '', refreshBusiness: loadMembership }}>
      {children}
    </CrmCtx.Provider>
  );
}

function BootScreen() {
  return <div style={{ display: 'grid', placeItems: 'center', height: '100dvh' }} aria-busy="true"><div className="brand-mark" style={{ width: 44, height: 44, borderRadius: 13, animation: 'pulse 1.4s ease-in-out infinite' }}>H</div></div>;
}
