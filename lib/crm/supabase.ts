'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let client: SupabaseClient<Database> | null = null;

/** Browser client (publishable key only). Rows are scoped server-side by RLS membership policies. */
export function supabase(): SupabaseClient<Database> {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    client = createClient<Database>(url, key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'halo-auth' } });
  }
  return client;
}
