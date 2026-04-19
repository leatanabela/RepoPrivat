export type TicketStatus = 'in_asteptare' | 'in_lucru' | 'rezolvat';
export type TicketPriority = 'scazuta' | 'medie' | 'ridicata' | 'urgenta';
export type UserRole = 'admin' | 'employee';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
  department_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  roles?: { id: string; name: UserRole };
  departments?: { id: string; name: string } | null;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  user_id: string;
  department_id: string | null;
  assigned_to: string | null;
  category_id: string | null;
  ai_suggested_department: string | null;
  ai_suggested_category: string | null;
  ai_suggested_priority: TicketPriority | null;
  created_at: string;
  updated_at: string;
  departments?: { name: string } | null;
  ticket_categories?: { name: string } | null;
  profiles?: { full_name: string; email: string };
  assigned?: { full_name: string; email: string } | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  profiles?: { full_name: string; email: string };
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface TicketCategory {
  id: string;
  name: string;
  department_id: string | null;
  created_at: string;
  departments?: { name: string } | null;
}

export interface Document {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  department_id: string | null;
  uploaded_by: string;
  is_processed: boolean;
  chunk_count: number;
  created_at: string;
  updated_at: string;
  departments?: { name: string } | null;
  profiles?: { full_name: string };
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Array<{ title: string; url: string }>;
  created_at: string;
}

export interface Analytics {
  totalTickets: number;
  pendingTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  totalDocuments: number;
  processedDocuments: number;
  totalUsers: number;
  totalChats: number;
  recentTickets: Array<{
    id: string;
    title: string;
    status: TicketStatus;
    priority: TicketPriority;
    created_at: string;
    profiles?: { full_name: string };
  }>;
  departmentDistribution: Array<{ name: string; count: number }>;
  avgResolutionHours: number | null;
  frequentQuestions: Array<{ content: string; count: number }>;
  positiveFeedback: number;
  negativeFeedback: number;
  satisfactionRate: number | null;
}
