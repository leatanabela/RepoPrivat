export const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const TICKET_STATUSES = [
  'in_asteptare', 'in_lucru', 'rezolvat',
] as const;

export const TICKET_PRIORITIES = ['scazuta', 'medie', 'ridicata', 'urgenta'] as const;

export const USER_ROLES = ['admin', 'employee'] as const;

export const BUCKETS = {
  DOCUMENTS: 'documents',
  TICKET_ATTACHMENTS: 'ticket-attachments',
  AVATARS: 'avatars',
} as const;

export const STATUS_LABELS: Record<string, string> = {
  in_asteptare: 'În așteptare',
  in_lucru: 'În lucru',
  rezolvat: 'Rezolvat',
};

export const PRIORITY_LABELS: Record<string, string> = {
  scazuta: 'Mică',
  medie: 'Medie',
  ridicata: 'Mare',
  urgenta: 'Urgentă',
};

export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  in_asteptare: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  in_lucru: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  rezolvat: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
};

export const PRIORITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  scazuta: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  medie: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
  ridicata: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  urgenta: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-600' },
};
