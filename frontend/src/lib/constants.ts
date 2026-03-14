export const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const TICKET_STATUSES = [
  'nou', 'atribuit', 'in_lucru', 'asteptare_utilizator', 'rezolvat', 'inchis',
] as const;

export const TICKET_PRIORITIES = ['scazuta', 'medie', 'ridicata', 'urgenta'] as const;

export const USER_ROLES = ['admin', 'employee'] as const;

export const BUCKETS = {
  DOCUMENTS: 'documents',
  TICKET_ATTACHMENTS: 'ticket-attachments',
  AVATARS: 'avatars',
} as const;

export const STATUS_LABELS: Record<string, string> = {
  nou: 'Nou',
  atribuit: 'Atribuit',
  in_lucru: 'În lucru',
  asteptare_utilizator: 'Așteptare',
  rezolvat: 'Rezolvat',
  inchis: 'Închis',
};

export const PRIORITY_LABELS: Record<string, string> = {
  scazuta: 'Mică',
  medie: 'Medie',
  ridicata: 'Mare',
  urgenta: 'Urgentă',
};

export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  nou: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
  atribuit: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  in_lucru: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  asteptare_utilizator: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  rezolvat: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  inchis: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', dot: 'bg-gray-400' },
};

export const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  scazuta: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
  medie: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
  ridicata: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
  urgenta: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
};
