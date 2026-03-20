import http from 'node:http';
import 'dotenv/config';
import { verifyToken, requireAdmin, AuthUser } from '../middleware/auth.middleware';
import * as authService from '../services/auth.service';
import * as ticketService from '../services/ticket.service';
import * as chatService from '../services/chat.service';
import * as documentService from '../services/document.service';
import * as adminService from '../services/admin.service';

const PORT = process.env.PORT || 3001;

// ---- Helpers ----

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

function error(res: http.ServerResponse, message: string, status = 400) {
  json(res, { error: message }, status);
}

function getToken(req: http.IncomingMessage): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

// Extract route params like :id from a pattern
function matchRoute(pattern: string, pathname: string): Record<string, string> | null {
  const patternParts = pattern.split('/');
  const pathParts = pathname.split('/');
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

function getQuery(url: string): Record<string, string> {
  const idx = url.indexOf('?');
  if (idx === -1) return {};
  const params = new URLSearchParams(url.slice(idx));
  const result: Record<string, string> = {};
  params.forEach((v, k) => (result[k] = v));
  return result;
}

// ---- Auth middleware wrapper ----

async function authenticate(req: http.IncomingMessage): Promise<AuthUser | null> {
  const token = getToken(req);
  if (!token) return null;
  return verifyToken(token);
}

// ---- Request handler ----

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const method = req.method || 'GET';
  const url = req.url || '/';
  const pathname = url.split('?')[0];
  const query = getQuery(url);

  // CORS preflight
  if (method === 'OPTIONS') {
    json(res, null, 204);
    return;
  }

  try {
    // ---- Auth routes ----

    if (method === 'POST' && pathname === '/api/auth/signup') {
      const body = await parseBody(req);
      const result = await authService.signUp(body);
      return json(res, result, 201);
    }

    if (method === 'POST' && pathname === '/api/auth/signin') {
      const body = await parseBody(req);
      const result = await authService.signIn(body);
      return json(res, result);
    }

    if (method === 'GET' && pathname === '/api/auth/profile') {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      const profile = await authService.getProfile(user.id);
      return json(res, profile);
    }

    if (method === 'PUT' && pathname === '/api/auth/profile') {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      const body = await parseBody(req);
      const result = await authService.updateProfile(user.id, body);
      return json(res, result);
    }

    // ---- Tickets ----

    if (method === 'GET' && pathname === '/api/tickets/stats') {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      if (!(await requireAdmin(user.id))) return error(res, 'Forbidden', 403);
      const stats = await ticketService.getTicketStats();
      return json(res, stats);
    }

    if (method === 'GET' && pathname === '/api/tickets') {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      const result = await ticketService.getTickets({
        status: query.status as any,
        priority: query.priority as any,
        departmentId: query.departmentId,
        userId: query.userId,
        assignedTo: query.assignedTo,
        page: query.page ? parseInt(query.page) : undefined,
        limit: query.limit ? parseInt(query.limit) : undefined,
      });
      return json(res, result);
    }

    if (method === 'POST' && pathname === '/api/tickets') {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      const body = await parseBody(req);
      const result = await ticketService.createTicket({ ...body, userId: user.id });
      return json(res, result, 201);
    }

    let params = matchRoute('/api/tickets/:id/assign', pathname);
    if (method === 'POST' && params) {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      if (!(await requireAdmin(user.id))) return error(res, 'Forbidden', 403);
      const result = await ticketService.assignTicket(params.id, user.id);
      return json(res, result);
    }

    params = matchRoute('/api/tickets/:id/messages', pathname);
    if (method === 'GET' && params) {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      const messages = await ticketService.getTicketMessages(params.id);
      return json(res, messages);
    }
    if (method === 'POST' && params) {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      const body = await parseBody(req);
      const result = await ticketService.addMessage(params.id, user.id, body.message, body.isInternal);
      return json(res, result, 201);
    }

    params = matchRoute('/api/tickets/:id', pathname);
    if (method === 'GET' && params) {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      const ticket = await ticketService.getTicketById(params.id);
      return json(res, ticket);
    }
    if (method === 'PATCH' && params) {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      const body = await parseBody(req);
      const result = await ticketService.updateTicket(params.id, body);
      return json(res, result);
    }

    // ---- Documents ----

    if (method === 'GET' && pathname === '/api/documents') {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      const result = await documentService.getDocuments({
        departmentId: query.departmentId,
        isProcessed: query.isProcessed !== undefined ? query.isProcessed === 'true' : undefined,
        page: query.page ? parseInt(query.page) : undefined,
        limit: query.limit ? parseInt(query.limit) : undefined,
      });
      return json(res, result);
    }

    if (method === 'POST' && pathname === '/api/documents/process-all') {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      if (!(await requireAdmin(user.id))) return error(res, 'Forbidden', 403);
      const result = await documentService.triggerProcessAll();
      return json(res, result);
    }

    params = matchRoute('/api/documents/:id/process', pathname);
    if (method === 'POST' && params) {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      if (!(await requireAdmin(user.id))) return error(res, 'Forbidden', 403);
      const result = await documentService.triggerProcessing(params.id);
      return json(res, result);
    }

    params = matchRoute('/api/documents/:id', pathname);
    if (method === 'GET' && params) {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      const doc = await documentService.getDocumentById(params.id);
      return json(res, doc);
    }
    if (method === 'DELETE' && params) {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      if (!(await requireAdmin(user.id))) return error(res, 'Forbidden', 403);
      const result = await documentService.deleteDocument(params.id);
      return json(res, result);
    }

    // ---- Chat ----

    if (method === 'GET' && pathname === '/api/chat/sessions') {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      const sessions = await chatService.getSessions(user.id);
      return json(res, sessions);
    }

    if (method === 'POST' && pathname === '/api/chat/sessions') {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      const body = await parseBody(req);
      const session = await chatService.createSession(user.id, body.title);
      return json(res, session, 201);
    }

    params = matchRoute('/api/chat/sessions/:id/messages', pathname);
    if (method === 'GET' && params) {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      const messages = await chatService.getSessionMessages(params.id);
      return json(res, messages);
    }
    if (method === 'POST' && params) {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      const body = await parseBody(req);
      const result = await chatService.sendMessage(params.id, user.id, body.message);
      return json(res, result);
    }

    params = matchRoute('/api/chat/sessions/:id', pathname);
    if (method === 'DELETE' && params) {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      const result = await chatService.deleteSession(params.id);
      return json(res, result);
    }

    // ---- Admin ----

    if (method === 'GET' && pathname === '/api/admin/users') {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      if (!(await requireAdmin(user.id))) return error(res, 'Forbidden', 403);
      const result = await adminService.getUsers({
        roleId: query.roleId,
        departmentId: query.departmentId,
        search: query.search,
        page: query.page ? parseInt(query.page) : undefined,
        limit: query.limit ? parseInt(query.limit) : undefined,
      });
      return json(res, result);
    }

    params = matchRoute('/api/admin/users/:id/role', pathname);
    if (method === 'PATCH' && params) {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      if (!(await requireAdmin(user.id))) return error(res, 'Forbidden', 403);
      const body = await parseBody(req);
      const result = await adminService.updateUserRole(params.id, body.roleId);
      return json(res, result);
    }

    if (method === 'GET' && pathname === '/api/admin/departments') {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      const departments = await adminService.getDepartments();
      return json(res, departments);
    }

    if (method === 'POST' && pathname === '/api/admin/departments') {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      if (!(await requireAdmin(user.id))) return error(res, 'Forbidden', 403);
      const body = await parseBody(req);
      const result = await adminService.createDepartment(body.name, body.description);
      return json(res, result, 201);
    }

    params = matchRoute('/api/admin/departments/:id', pathname);
    if (method === 'PUT' && params) {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      if (!(await requireAdmin(user.id))) return error(res, 'Forbidden', 403);
      const body = await parseBody(req);
      const result = await adminService.updateDepartment(params.id, body);
      return json(res, result);
    }
    if (method === 'DELETE' && params) {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      if (!(await requireAdmin(user.id))) return error(res, 'Forbidden', 403);
      const result = await adminService.deleteDepartment(params.id);
      return json(res, result);
    }

    if (method === 'GET' && pathname === '/api/admin/categories') {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      const categories = await adminService.getCategories(query.departmentId);
      return json(res, categories);
    }

    if (method === 'POST' && pathname === '/api/admin/categories') {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      if (!(await requireAdmin(user.id))) return error(res, 'Forbidden', 403);
      const body = await parseBody(req);
      const result = await adminService.createCategory(body.name, body.departmentId);
      return json(res, result, 201);
    }

    if (method === 'GET' && pathname === '/api/admin/analytics') {
      const user = await authenticate(req);
      if (!user) return error(res, 'Unauthorized', 401);
      if (!(await requireAdmin(user.id))) return error(res, 'Forbidden', 403);
      const analytics = await adminService.getAnalytics();
      return json(res, analytics);
    }

    // ---- Health check ----

    if (pathname === '/health') {
      return json(res, { status: 'ok' });
    }

    // ---- 404 ----
    error(res, 'Not found', 404);
  } catch (err: any) {
    console.error(`[${method}] ${pathname} - Error:`, err.message);
    error(res, err.message || 'Internal server error', 500);
  }
}

// ---- Start server ----

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
