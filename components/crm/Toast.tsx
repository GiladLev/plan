'use client';
import { useEffect, useState } from 'react';

type T = { id: number; text: string; tone?: 'bad' };
let push: (t: Omit<T, 'id'>) => void = () => {};
export const toast = (text: string, tone?: 'bad') => push({ text, tone });

export function ToastRegion() {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => { push = (t) => { const id = Date.now() + Math.random(); setItems((s) => [...s, { ...t, id }]); setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 3200); }; }, []);
  return <div className="toast-region" role="status" aria-live="polite">{items.map((t) => <div key={t.id} className={`toast ${t.tone ?? ''}`}>{t.text}</div>)}</div>;
}
