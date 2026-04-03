'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { AI_SERVICE_URL } from '@/lib/constants';
import type { TicketStatus, TicketPriority } from '@/lib/types';

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

export async function createTicket(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat' };

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const priority = (formData.get('priority') as TicketPriority) || 'medie';
  const categoryId = formData.get('categoryId') as string | null;
  const departmentId = formData.get('departmentId') as string | null;
  const useAi = formData.get('useAi') === 'true';

  // Map English AI priority values to Romanian enum values
  const priorityMap: Record<string, TicketPriority> = {
    low: 'scazuta', medium: 'medie', high: 'ridicata', urgent: 'urgenta',
    scazuta: 'scazuta', medie: 'medie', ridicata: 'ridicata', urgenta: 'urgenta',
  };

  let aiSuggestions = null;
  if (useAi && description) {
    aiSuggestions = await getAiSuggestions(description);
  }

  const insertData: Record<string, unknown> = {
    title,
    description,
    priority,
    department_id: departmentId || null,
    category_id: categoryId || null,
    user_id: user.id,
    status: 'in_asteptare',
  };

  if (aiSuggestions) {
    insertData.ai_suggested_department = aiSuggestions.department_id || null;
    insertData.ai_suggested_category = aiSuggestions.category_id || null;
    insertData.ai_suggested_priority = priorityMap[aiSuggestions.priority] || null;
  }

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert(insertData)
    .select('*, departments!tickets_department_id_fkey(name), ticket_categories!tickets_category_id_fkey(name)')
    .single();

  if (error) return { error: error.message };
  return { ticket, aiSuggestions };
}

export async function getTickets(filters: {
  status?: TicketStatus;
  priority?: TicketPriority;
  departmentId?: string;
  page?: number;
  limit?: number;
  userId?: string;
} = {}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { tickets: [], total: 0, page: 1, limit: 20 };

  const { page = 1, limit = 20, ...rest } = filters;
  const offset = (page - 1) * limit;

  // Check if admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles(name)')
    .eq('id', user.id)
    .single();

  const isAdmin = (profile?.roles as any)?.name === 'admin';

  let query = supabase
    .from('tickets')
    .select(
      '*, departments!tickets_department_id_fkey(name), ticket_categories!tickets_category_id_fkey(name), profiles!tickets_user_id_fkey(full_name, email), assigned:profiles!tickets_assigned_to_fkey(full_name, email)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Employees only see their own tickets (RLS handles this but be explicit)
  if (!isAdmin) {
    query = query.eq('user_id', user.id);
  }

  if (rest.status) query = query.eq('status', rest.status);
  if (rest.priority) query = query.eq('priority', rest.priority);
  if (rest.userId) query = query.eq('user_id', rest.userId);
  if (rest.departmentId) query = query.eq('department_id', rest.departmentId);

  const { data, error, count } = await query;
  if (error) return { tickets: [], total: 0, page, limit };

  return { tickets: data || [], total: count || 0, page, limit };
}

export async function getTicketById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('tickets')
    .select(
      '*, departments!tickets_department_id_fkey(name), ticket_categories!tickets_category_id_fkey(name), profiles!tickets_user_id_fkey(full_name, email), assigned:profiles!tickets_assigned_to_fkey(full_name, email)'
    )
    .eq('id', id)
    .single();

  if (error) return null;
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
    description?: string;
  }
) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath('/admin');
  revalidatePath('/tickets');
  revalidatePath('/mentenanta');
  return { ticket: data };
}

export async function addTicketMessage(ticketId: string, message: string, isInternal = false) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat' };

  const { data, error } = await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: ticketId,
      sender_id: user.id,
      message,
      is_internal: isInternal,
    })
    .select('*, profiles(full_name, email)')
    .single();

  if (error) return { error: error.message };
  return { message: data };
}

export async function getTicketMessages(ticketId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('ticket_messages')
    .select('*, profiles(full_name, email)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data || [];
}

export async function getAiTicketSuggestions(description: string) {
  return getAiSuggestions(description);
}

export async function createTicketFromChat(
  question: string,
  aiResponse: string,
  userDescription: string,
  priority: TicketPriority,
  departmentId: string | null,
  aiSuggestedPriority?: string | null,
  aiSuggestedDepartment?: string | null,
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat' };

  const priorityMap: Record<string, TicketPriority> = {
    low: 'scazuta', medium: 'medie', high: 'ridicata', urgent: 'urgenta',
    scazuta: 'scazuta', medie: 'medie', ridicata: 'ridicata', urgenta: 'urgenta',
  };

  const title = question.length > 300 ? question.slice(0, 297) + '...' : question;

  const insertData: Record<string, unknown> = {
    title,
    description: userDescription || `Întrebare din chat AI:\n${question}\n\nRăspuns AI:\n${aiResponse}`,
    status: 'in_asteptare',
    priority: priorityMap[priority] || 'medie',
    department_id: departmentId || null,
    user_id: user.id,
  };

  if (aiSuggestedPriority) {
    insertData.ai_suggested_priority = priorityMap[aiSuggestedPriority] || null;
  }
  if (aiSuggestedDepartment) {
    insertData.ai_suggested_department = aiSuggestedDepartment;
  }

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert(insertData)
    .select('*')
    .single();

  if (error) return { error: error.message };
  return { ticket };
}

export async function deleteTicket(ticketId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat' };

  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles(name)')
    .eq('id', user.id)
    .single();

  if ((profile?.roles as any)?.name !== 'admin') return { error: 'Acces neautorizat' };

  // Delete messages first
  await supabase.from('ticket_messages').delete().eq('ticket_id', ticketId);

  // Delete ticket
  const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
  if (error) return { error: error.message };

  revalidatePath('/admin');
  revalidatePath('/tickets');
  revalidatePath('/mentenanta');
  return { success: true };
}

export async function getCategories(departmentId?: string) {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from('ticket_categories')
    .select('*, departments(name)')
    .order('name');

  if (departmentId) query = query.eq('department_id', departmentId);

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function getDepartments() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name');

  if (error) return [];
  return data || [];
}
