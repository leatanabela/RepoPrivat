export const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const TICKET_STATUSES = [
  'new', 'assigned', 'in_progress', 'waiting_user', 'resolved', 'closed',
] as const;

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export const USER_ROLES = ['admin', 'employee'] as const;

export const BUCKETS = {
  DOCUMENTS: 'documents',
  TICKET_ATTACHMENTS: 'ticket-attachments',
  AVATARS: 'avatars',
} as const;

export const STATUS_LABELS: Record<string, string> = {
  new: 'Nou',
  assigned: 'Atribuit',
  in_progress: 'În lucru',
  waiting_user: 'Așteptare',
  resolved: 'Rezolvat',
  closed: 'Închis',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Mică',
  medium: 'Medie',
  high: 'Mare',
  urgent: 'Urgentă',
};

export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  new: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
  assigned: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  in_progress: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  waiting_user: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  resolved: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  closed: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', dot: 'bg-gray-400' },
};

export const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
  medium: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
  high: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
  urgent: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
};
