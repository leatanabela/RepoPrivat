export const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const TICKET_STATUSES = [
  'nou',
  'atribuit',
  'in_lucru',
  'asteptare_utilizator',
  'rezolvat',
  'inchis',
] as const;

export const TICKET_PRIORITIES = ['scazuta', 'medie', 'ridicata', 'urgenta'] as const;

export const USER_ROLES = ['admin', 'employee'] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type UserRole = (typeof USER_ROLES)[number];

// Supabase storage bucket names
export const BUCKETS = {
  DOCUMENTS: 'documents',
  TICKET_ATTACHMENTS: 'ticket-attachments',
  AVATARS: 'avatars',
} as const;
