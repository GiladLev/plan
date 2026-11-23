'use client';
import { useState } from 'react';
import { supabase } from '@/lib/crm/supabase';
import { Field } from '@/components/crm/ui';

const KINDS = [['venue', 'אולם / גן אירועים'], ['catering', 'קייטרינג'], ['photo', 'צילום'], ['music', 'מוזיקה ו-DJ'], ['design', 'עיצוב והפקה'], ['other', 'אחר']];

export default function Onboarding() {
  const [name, setName] = useState('');
  const [me, setMe] = useState('');
  const [kind, setKind] = useState('venue');
  const [demo, setDemo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await supabase().rpc('create_business', { p_name: name, p_display_name: me, p_kind: kind, p_with_demo: demo });
    if (error) { setErr(error.message); setBusy(false); return; }
    location.assign('/app');
  };
  return (
    <div className="auth-page">
      <form className="auth-card card stack" onSubmit={submit}>
        <span className="brand-mark" style={{ width: 40, height: 40 }}>H</span>
        <h1 className="t-title">נקים את סביבת העבודה שלך</h1>
        <p className="t-callout" style={{ margin: 0 }}>שלוש שאלות קצרות. אפשר לשנות הכול אחר כך.</p>
        <Field label="שם העסק"><input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: גן אירועים הגפן" /></Field>
        <Field label="איך לקרוא לך?"><input className="input" value={me} onChange={(e) => setMe(e.target.value)} /></Field>
        <Field label="סוג העסק"><select className="select" value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <label className="hstack" style={{ fontSize: 14 }}><input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} /> למלא בנתוני דוגמה כדי לראות איך זה עובד</label>
        {err && <div className="pill bad" role="alert">{err}</div>}
        <button className="btn btn-primary btn-lg" disabled={busy || !name.trim()}>{busy ? 'מקימים…' : 'יצירת סביבת עבודה'}</button>
      </form>
    </div>
  );
}
