import type { Stage } from './types';
export const STAGE_LABEL: Record<Stage, string> = { inquiry: 'פנייה חדשה', meeting: 'פגישה', proposal: 'הצעת מחיר', won: 'נסגר', lost: 'לא רלוונטי' };
export const STAGE_TONE: Record<Stage, string> = { inquiry: 'accent', meeting: 'warn', proposal: 'warn', won: 'ok', lost: '' };
export const EVENT_TYPE_LABEL: Record<string, string> = { wedding: 'חתונה', bar_mitzvah: 'בר מצווה', bat_mitzvah: 'בת מצווה', brit: 'ברית', birthday: 'יום הולדת', corporate: 'אירוע חברה', other: 'אחר' };
export const ACTIVITY_LABEL: Record<string, string> = { note: 'הערה', call: 'שיחה', sms: 'SMS', email: 'אימייל', whatsapp: 'וואטסאפ', meeting: 'פגישה', document: 'מסמך', stage: 'שינוי שלב', task: 'משימה', created: 'פנייה' };
export const DOC_KIND_LABEL: Record<string, string> = { quote: 'הצעת מחיר', order: 'הזמנה', receipt: 'קבלה', invoice: 'חשבונית מס' };
export const DOC_STATUS_LABEL: Record<string, string> = { draft: 'טיוטה', issued: 'הופק', sent: 'נשלח', void: 'מבוטל' };
export const MEETING_KIND_LABEL: Record<string, string> = { meeting: 'פגישה', tasting: 'טעימות', site_visit: 'סיור במתחם', call: 'שיחה' };
export const COURSE_LABEL: Record<string, string> = { reception: 'קבלת פנים', first: 'מנה ראשונה', main: 'מנה עיקרית', dessert: 'קינוח', bar: 'בר' };
