// ============================================================
// AI HelpDesk - API Route Definitions
// These map to Next.js App Router API routes or standalone Express routes
// ============================================================

export interface ApiRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  auth: boolean;
  adminOnly: boolean;
}

export const routes: ApiRoute[] = [
  // ---- Auth ----
  { method: 'POST', path: '/api/auth/signup', description: 'Register new user', auth: false, adminOnly: false },
  { method: 'POST', path: '/api/auth/signin', description: 'Sign in user', auth: false, adminOnly: false },
  { method: 'GET', path: '/api/auth/profile', description: 'Get current user profile', auth: true, adminOnly: false },
  { method: 'PUT', path: '/api/auth/profile', description: 'Update current user profile', auth: true, adminOnly: false },

  // ---- Tickets ----
  { method: 'GET', path: '/api/tickets', description: 'List tickets (filtered)', auth: true, adminOnly: false },
  { method: 'POST', path: '/api/tickets', description: 'Create new ticket', auth: true, adminOnly: false },
  { method: 'GET', path: '/api/tickets/:id', description: 'Get ticket by ID', auth: true, adminOnly: false },
  { method: 'PATCH', path: '/api/tickets/:id', description: 'Update ticket', auth: true, adminOnly: false },
  { method: 'POST', path: '/api/tickets/:id/assign', description: 'Assign ticket to admin', auth: true, adminOnly: true },
  { method: 'GET', path: '/api/tickets/:id/messages', description: 'Get ticket messages', auth: true, adminOnly: false },
  { method: 'POST', path: '/api/tickets/:id/messages', description: 'Add message to ticket', auth: true, adminOnly: false },
  { method: 'GET', path: '/api/tickets/stats', description: 'Get ticket statistics', auth: true, adminOnly: true },

  // ---- Documents ----
  { method: 'GET', path: '/api/documents', description: 'List documents', auth: true, adminOnly: false },
  { method: 'POST', path: '/api/documents', description: 'Upload document', auth: true, adminOnly: true },
  { method: 'GET', path: '/api/documents/:id', description: 'Get document by ID', auth: true, adminOnly: false },
  { method: 'DELETE', path: '/api/documents/:id', description: 'Delete document', auth: true, adminOnly: true },
  { method: 'POST', path: '/api/documents/:id/process', description: 'Trigger document processing', auth: true, adminOnly: true },
  { method: 'POST', path: '/api/documents/process-all', description: 'Process all unprocessed docs', auth: true, adminOnly: true },

  // ---- Chat ----
  { method: 'GET', path: '/api/chat/sessions', description: 'List user chat sessions', auth: true, adminOnly: false },
  { method: 'POST', path: '/api/chat/sessions', description: 'Create new chat session', auth: true, adminOnly: false },
  { method: 'GET', path: '/api/chat/sessions/:id/messages', description: 'Get session messages', auth: true, adminOnly: false },
  { method: 'POST', path: '/api/chat/sessions/:id/messages', description: 'Send chat message', auth: true, adminOnly: false },
  { method: 'DELETE', path: '/api/chat/sessions/:id', description: 'Delete chat session', auth: true, adminOnly: false },

  // ---- Admin ----
  { method: 'GET', path: '/api/admin/users', description: 'List all users', auth: true, adminOnly: true },
  { method: 'PATCH', path: '/api/admin/users/:id/role', description: 'Change user role', auth: true, adminOnly: true },
  { method: 'GET', path: '/api/admin/departments', description: 'List departments', auth: true, adminOnly: false },
  { method: 'POST', path: '/api/admin/departments', description: 'Create department', auth: true, adminOnly: true },
  { method: 'PUT', path: '/api/admin/departments/:id', description: 'Update department', auth: true, adminOnly: true },
  { method: 'DELETE', path: '/api/admin/departments/:id', description: 'Delete department', auth: true, adminOnly: true },
  { method: 'GET', path: '/api/admin/categories', description: 'List ticket categories', auth: true, adminOnly: false },
  { method: 'POST', path: '/api/admin/categories', description: 'Create ticket category', auth: true, adminOnly: true },
  { method: 'GET', path: '/api/admin/analytics', description: 'Get analytics dashboard data', auth: true, adminOnly: true },
];
