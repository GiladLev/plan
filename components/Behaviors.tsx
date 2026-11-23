'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { mountBehaviors } from '@/lib/behaviors';

/** Wires the interactive behaviour (menus, tabs, carousels, filters, map…) onto the server-rendered page markup. */
export default function Behaviors() {
  const pathname = usePathname();
  useEffect(() => mountBehaviors(document), [pathname]);
  return null;
}
