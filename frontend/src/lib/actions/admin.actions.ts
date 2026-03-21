'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Analytics } from '@/lib/types';

export async function getAnalytics(): Promise<Analytics> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { count: totalTickets } = await supabaseAdmin
    .from('tickets')
    .select('*', { count: 'exact', head: true });

  const { count: inProgressTickets } = await supabaseAdmin
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'in_lucru');

  const { count: resolvedTickets } = await supabaseAdmin
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'rezolvat');

  const { count: totalDocuments } = await supabaseAdmin
    .from('documents')
    .select('*', { count: 'exact', head: true });

  const { count: processedDocuments } = await supabaseAdmin
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('is_processed', true);

  const { count: totalUsers } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: totalChats } = await supabaseAdmin
    .from('chat_sessions')
    .select('*', { count: 'exact', head: true });

  const { data: recentTickets } = await supabaseAdmin
    .from('tickets')
    .select('id, title, status, priority, created_at, profiles!tickets_user_id_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    totalTickets: totalTickets || 0,
    inProgressTickets: inProgressTickets || 0,
    resolvedTickets: resolvedTickets || 0,
    totalDocuments: totalDocuments || 0,
    processedDocuments: processedDocuments || 0,
    totalUsers: totalUsers || 0,
    totalChats: totalChats || 0,
    recentTickets: (recentTickets || []).map((t: any) => ({
      ...t,
      profiles: Array.isArray(t.profiles) ? t.profiles[0] : t.profiles,
    })),
  };
}

export async function getAllTickets(filters: {
  status?: string;
  departmentId?: string;
  page?: number;
  limit?: number;
} = {}) {
  const { page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('tickets')
    .select(
      '*, departments(name), profiles!tickets_user_id_fkey(full_name, email), assigned:profiles!tickets_assigned_to_fkey(full_name, email)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.departmentId) query = query.eq('department_id', filters.departmentId);

  const { data, error, count } = await query;
  if (error) return { tickets: [], total: 0, page, limit };
  return { tickets: data || [], total: count || 0, page, limit };
}

export async function adminUpdateTicketStatus(ticketId: string, status: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('roles(name)')
    .eq('id', user.id)
    .single();

  if ((profile?.roles as any)?.name !== 'admin') return { error: 'Acces neautorizat' };

  const { error } = await supabaseAdmin
    .from('tickets')
    .update({ status })
    .eq('id', ticketId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function assignTicketToAdmin(ticketId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat' };

  const { error } = await supabaseAdmin
    .from('tickets')
    .update({ assigned_to: user.id, status: 'assigned' })
    .eq('id', ticketId);

  if (error) return { error: error.message };
  return { success: true };
}
