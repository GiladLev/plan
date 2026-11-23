import type { Database } from './database.types';
type T<N extends keyof Database['public']['Tables']> = Database['public']['Tables'][N]['Row'];
export type Business = T<'businesses'>;
export type Client = T<'clients'>;
export type Activity = T<'activities'>;
export type Task = T<'tasks'>;
export type Meeting = T<'meetings'>;
export type Doc = T<'documents'>;
export type DocLine = T<'document_lines'>;
export type CrmEvent = T<'events'>;
export type Menu = T<'menus'>;
export type Dish = T<'dishes'>;
export type SeatTable = T<'seating_tables'>;
export type Guest = T<'guests'>;

export type Stage = 'inquiry' | 'meeting' | 'proposal' | 'won' | 'lost';
export const STAGES: Stage[] = ['inquiry', 'meeting', 'proposal', 'won', 'lost'];
