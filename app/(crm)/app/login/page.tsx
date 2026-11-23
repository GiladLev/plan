'use client';
import { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '@/lib/crm/supabase';
import { Field } from '@/components/crm/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'bad' } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const sb = supabase();
    const { error } = mode === 'password'
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/app` } });
    setBusy(false);
    if (error) setMsg({ text: error.message === 'Invalid login credentials' ? 'האימייל או הסיסמה שגויים' : error.message, tone: 'bad' });
    else if (mode === 'magic') setMsg({ text: 'שלחנו לך קישור כניסה למייל', tone: 'ok' });
  };
  const demo = () => { setEmail('demo@halo-crm.dev'); setPassword('Halo-demo-2026'); setMode('password'); };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="brand" style={{ padding: 0, marginBottom: 22 }}><span className="brand-mark">H</span><div><div className="brand-name" style={{ fontSize: 20 }}>Halo</div><div className="brand-biz">ניהול עסק אירועים, בלי רעש</div></div></div>
        <h1 className="t-title" style={{ marginBottom: 4 }}>כניסה לסביבת העבודה</h1>
        <p className="t-callout" style={{ marginTop: 0, marginBottom: 20 }}>לידים, יומן, מסמכים ותפעול אירוע — במקום אחד.</p>
        <form onSubmit={submit} className="stack" noValidate>
          <Field label="אימייל"><input className="input" type="email" dir="ltr" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.co.il" /></Field>
          {mode === 'password' && <Field label="סיסמה"><input className="input" type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>}
          {msg && <div className={`pill ${msg.tone}`} role="status" style={{ height: 'auto', padding: '8px 12px', whiteSpace: 'normal' }}>{msg.text}</div>}
          <button className="btn btn-primary btn-lg" disabled={busy || !email}>{busy ? 'רגע…' : mode === 'password' ? 'כניסה' : 'שלחו לי קישור'} <ArrowLeft className="flip-rtl" style={{ transform: 'none' }} /></button>
          <button type="button" className="btn btn-ghost" onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}><Mail />{mode === 'password' ? 'כניסה עם קישור למייל' : 'כניסה עם סיסמה'}</button>
        </form>
        <div className="divider" />
        <button type="button" className="btn" style={{ width: '100%' }} onClick={demo}>מילוי פרטי חשבון הדגמה</button>
      </div>
    </div>
  );
}
