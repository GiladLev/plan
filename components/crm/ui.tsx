'use client';
import type { ReactNode } from 'react';
import { avatarColor, initials } from '@/lib/crm/format';

export const Avatar = ({ name, size }: { name: string; size?: 'lg' }) => <span className={`avatar ${size ?? ''}`} style={{ background: avatarColor(name) }} aria-hidden="true">{initials(name)}</span>;
export const Pill = ({ tone = '', children, dot }: { tone?: string; children: ReactNode; dot?: boolean }) => <span className={`pill ${tone}`}>{dot && <span className="dot" />}{children}</span>;
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return <div className="segmented" role="group" aria-label={label}>{options.map((o) => <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>)}</div>;
}
export const Empty = ({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) => <div className="empty">{icon}<div className="t-headline" style={{ color: 'var(--ink-1)' }}>{title}</div>{children}</div>;
export const Skeleton = ({ h = 16, w = '100%' }: { h?: number; w?: number | string }) => <div className="skeleton" style={{ height: h, width: w }} />;
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return <div aria-busy="true">{Array.from({ length: rows }, (_, i) => <div key={i} className="row" style={{ cursor: 'default' }}><span className="skeleton" style={{ width: 34, height: 34, borderRadius: '50%' }} /><div className="grow stack" style={{ gap: 6 }}><Skeleton h={13} w="60%" /><Skeleton h={11} w="40%" /></div></div>)}</div>;
}
export const Field = ({ label, children }: { label: string; children: ReactNode }) => <label className="field"><span>{label}</span>{children}</label>;
export function ErrorState({ error, retry }: { error: Error; retry?: () => void }) {
  return <div className="empty" role="alert"><div className="t-headline">משהו השתבש</div><div className="t-callout">{error.message}</div>{retry && <button className="btn" onClick={retry}>נסו שוב</button>}</div>;
}
