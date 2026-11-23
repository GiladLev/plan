'use client';
// Minimal query cache: keyed fetchers, shared subscribers, prefix invalidation. Keeps screens declarative without a dependency.
import { useCallback, useEffect, useSyncExternalStore } from 'react';

type Entry = { data?: unknown; error?: Error; loading: boolean; promise?: Promise<void>; fetcher?: () => Promise<unknown> };
const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

async function run(key: string) {
  const e = cache.get(key)!;
  if (e.promise || !e.fetcher) return e.promise;
  e.loading = true; emit();
  e.promise = e.fetcher().then((d) => { e.data = d; e.error = undefined; }).catch((err: Error) => { e.error = err; }).finally(() => { e.loading = false; e.promise = undefined; cache.set(key, { ...e }); emit(); });
  return e.promise;
}

export function useQuery<T>(key: string | null, fetcher: () => Promise<T>) {
  if (key && !cache.has(key)) cache.set(key, { loading: true });
  if (key) cache.get(key)!.fetcher = fetcher as () => Promise<unknown>;
  const snap = useSyncExternalStore(subscribe, () => (key ? cache.get(key) : undefined), () => undefined);
  useEffect(() => { if (key && cache.get(key)?.data === undefined) void run(key); }, [key]);
  const refetch = useCallback(() => (key ? run(key) : Promise.resolve()), [key]);
  return { data: snap?.data as T | undefined, error: snap?.error, loading: !!snap?.loading && snap?.data === undefined, refetch };
}

/** Optimistically replace cached data for a key. */
export function setQueryData<T>(key: string, updater: (prev: T | undefined) => T) {
  const e = cache.get(key) ?? { loading: false };
  cache.set(key, { ...e, data: updater(e.data as T | undefined) });
  emit();
}

export function invalidate(prefix: string) {
  for (const key of cache.keys()) if (key.startsWith(prefix)) { const e = cache.get(key)!; if (e.fetcher) void run(key); }
}
