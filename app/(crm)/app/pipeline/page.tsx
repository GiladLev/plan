'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/crm/AppShell';
import { useCrm } from '@/components/crm/CrmProvider';
import { Kanban } from '@/components/crm/Kanban';
import { NewClientDialog } from '@/components/crm/NewClientDialog';
import { toast } from '@/components/crm/Toast';
import { ErrorState } from '@/components/crm/ui';
import { useQuery, setQueryData, invalidate } from '@/lib/crm/store';
import { listClients, moveClient } from '@/lib/crm/api';
import type { Client, Stage } from '@/lib/crm/types';

export default function PipelinePage() {
  const { business } = useCrm();
  const key = `clients:${business.id}`;
  const { data, error, refetch } = useQuery(key, () => listClients(business.id));
  const [adding, setAdding] = useState(false);
  const onMove = async (c: Client, stage: Stage, position: number) => {
    setQueryData<Client[]>(key, (prev) => (prev ?? []).map((x) => (x.id === c.id ? { ...x, stage, stage_position: position } : x)));
    try { await moveClient(c, stage, position); if (stage === 'won') toast(`🎉 ${c.name} — נסגר!`); invalidate(`feed:${business.id}`); }
    catch (e) { toast((e as Error).message, 'bad'); invalidate(key); }
  };
  return (
    <AppShell title="צינור מכירות" actions={<button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Plus />לקוח חדש</button>}>
      {error ? <ErrorState error={error} retry={refetch} /> : !data ? <div className="kanban">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="kanban-col"><div className="skeleton" style={{ height: 86, marginBottom: 8 }} /><div className="skeleton" style={{ height: 86 }} /></div>)}</div> : <Kanban clients={data} onMove={onMove} />}
      {adding && <NewClientDialog bid={business.id} onClose={() => setAdding(false)} />}
    </AppShell>
  );
}
