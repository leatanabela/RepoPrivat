import { supabaseAdmin } from '../config/supabase';
import { AI_SERVICE_URL, TicketStatus, TicketPriority } from '../config/constants';

interface CreateTicketData {
  title: string;
  description: string;
  priority?: TicketPriority;
  departmentId?: string;
  categoryId?: string;
  userId: string;
  useAiSuggestions?: boolean;
}

interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  departmentId?: string;
  userId?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

// Ask AI service for ticket suggestions
async function getAiSuggestions(description: string) {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/tickets/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function createTicket(data: CreateTicketData) {
  let aiSuggestions = null;

  if (data.useAiSuggestions) {
    aiSuggestions = await getAiSuggestions(data.description);
  }

  const insertData: Record<string, unknown> = {
    title: data.title,
    description: data.description,
    priority: data.priority || 'medium',
    department_id: data.departmentId || null,
    category_id: data.categoryId || null,
    user_id: data.userId,
    status: 'new',
  };

  if (aiSuggestions) {
    insertData.ai_suggested_department = aiSuggestions.department_id || null;
    insertData.ai_suggested_category = aiSuggestions.category_id || null;
    insertData.ai_suggested_priority = aiSuggestions.priority || null;
  }

  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .insert(insertData)
    .select('*, departments(name), ticket_categories(name), profiles!tickets_user_id_fkey(full_name)')
    .single();

  if (error) throw new Error(error.message);

  return { ticket, aiSuggestions };
}

export async function getTickets(filters: TicketFilters = {}) {
  const { page = 1, limit = 20, ...rest } = filters;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('tickets')
    .select(
      '*, departments(name), ticket_categories(name), profiles!tickets_user_id_fkey(full_name, email), assigned:profiles!tickets_assigned_to_fkey(full_name, email)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (rest.status) query = query.eq('status', rest.status);
  if (rest.priority) query = query.eq('priority', rest.priority);
  if (rest.departmentId) query = query.eq('department_id', rest.departmentId);
  if (rest.userId) query = query.eq('user_id', rest.userId);
  if (rest.assignedTo) query = query.eq('assigned_to', rest.assignedTo);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { tickets: data, total: count, page, limit };
}

export async function getTicketById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('tickets')
    .select(
      '*, departments(name), ticket_categories(name), profiles!tickets_user_id_fkey(full_name, email), assigned:profiles!tickets_assigned_to_fkey(full_name, email)'
    )
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateTicket(
  id: string,
  updates: {
    status?: TicketStatus;
    priority?: TicketPriority;
    department_id?: string;
    category_id?: string;
    assigned_to?: string;
  }
) {
  const { data, error } = await supabaseAdmin
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function assignTicket(id: string, adminId: string) {
  return updateTicket(id, { assigned_to: adminId, status: 'assigned' });
}

export async function addMessage(
  ticketId: string,
  senderId: string,
  message: string,
  isInternal: boolean = false
) {
  const { data, error } = await supabaseAdmin
    .from('ticket_messages')
    .insert({
      ticket_id: ticketId,
      sender_id: senderId,
      message,
      is_internal: isInternal,
    })
    .select('*, profiles(full_name, email)')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getTicketMessages(ticketId: string) {
  const { data, error } = await supabaseAdmin
    .from('ticket_messages')
    .select('*, profiles(full_name, email)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function getTicketStats() {
  const { data: byStatus } = await supabaseAdmin
    .from('tickets')
    .select('status')
    .then(({ data }) => {
      const counts: Record<string, number> = {};
      data?.forEach((t) => {
        counts[t.status] = (counts[t.status] || 0) + 1;
      });
      return { data: counts };
    });

  const { data: byPriority } = await supabaseAdmin
    .from('tickets')
    .select('priority')
    .then(({ data }) => {
      const counts: Record<string, number> = {};
      data?.forEach((t) => {
        counts[t.priority] = (counts[t.priority] || 0) + 1;
      });
      return { data: counts };
    });

  const { count: total } = await supabaseAdmin
    .from('tickets')
    .select('*', { count: 'exact', head: true });

  const { count: openCount } = await supabaseAdmin
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .in('status', ['new', 'assigned', 'in_progress', 'waiting_user']);

  return {
    total: total || 0,
    open: openCount || 0,
    byStatus,
    byPriority,
  };
}
