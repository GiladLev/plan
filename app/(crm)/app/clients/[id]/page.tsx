'use client';
import { useParams } from 'next/navigation';
import { ClientsView } from '@/components/crm/ClientsView';
export default function ClientPage() { const { id } = useParams<{ id: string }>(); return <ClientsView selectedId={id} />; }
