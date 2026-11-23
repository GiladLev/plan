'use client';
import { useParams } from 'next/navigation';
import { DocumentsView } from '@/components/crm/DocumentsView';
export default function DocumentPage() { const { id } = useParams<{ id: string }>(); return <DocumentsView selectedId={id} />; }
