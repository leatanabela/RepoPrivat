'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { Analytics } from '@/lib/types';

export async function getAnalytics(): Promise<Analytics> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [
    { count: totalTickets },
    { count: pendingTickets },
    { count: inProgressTickets },
    { count: resolvedTickets },
    { count: totalDocuments },
    { count: processedDocuments },
    { count: totalUsers },
    { count: totalChats },
    { data: recentTickets },
  ] = await Promise.all([
    supabaseAdmin.from('tickets').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('tickets').select('id', { count: 'exact', head: true })
      .eq('status', 'in_asteptare'),
    supabaseAdmin.from('tickets').select('id', { count: 'exact', head: true })
      .in('status', ['in_lucru', 'atribuit']),
    supabaseAdmin.from('tickets').select('id', { count: 'exact', head: true })
      .in('status', ['rezolvat', 'inchis']),
    supabaseAdmin.from('documents').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('documents').select('id', { count: 'exact', head: true })
      .eq('is_processed', true),
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('chat_sessions').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('tickets')
      .select('id, title, status, priority, created_at, profiles!tickets_user_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  // Department distribution
  const { data: ticketsWithDept } = await supabaseAdmin
    .from('tickets')
    .select('department_id, departments!tickets_department_id_fkey(name)');

  const deptMap = new Map<string, { name: string; count: number }>();
  for (const t of ticketsWithDept || []) {
    const deptName = (t.departments as any)?.name || 'Neatribuit';
    const existing = deptMap.get(deptName);
    if (existing) existing.count++;
    else deptMap.set(deptName, { name: deptName, count: 1 });
  }
  const departmentDistribution = Array.from(deptMap.values())
    .sort((a, b) => b.count - a.count);

  // Average resolution time (resolved/closed tickets)
  const { data: resolvedTicketRows } = await supabaseAdmin
    .from('tickets')
    .select('created_at, updated_at')
    .in('status', ['rezolvat', 'inchis']);

  let avgResolutionHours: number | null = null;
  if (resolvedTicketRows && resolvedTicketRows.length > 0) {
    const totalMs = resolvedTicketRows.reduce((sum, t) => {
      return sum + (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime());
    }, 0);
    avgResolutionHours = Math.round((totalMs / resolvedTicketRows.length / 3600000) * 10) / 10;
  }

  // AI feedback stats
  const { data: feedbackRows } = await supabaseAdmin
    .from('chat_feedback')
    .select('rating');

  let positiveFeedback = 0;
  let negativeFeedback = 0;
  for (const f of feedbackRows || []) {
    if (f.rating === 'positive') positiveFeedback++;
    else if (f.rating === 'negative') negativeFeedback++;
  }
  const totalFeedback = positiveFeedback + negativeFeedback;
  const satisfactionRate = totalFeedback > 0 ? Math.round((positiveFeedback / totalFeedback) * 100) : null;

  // Frequent AI questions
  const { data: allUserQuestions } = await supabaseAdmin
    .from('chat_messages')
    .select('content')
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(500);

  const questionMap = new Map<string, number>();
  for (const q of allUserQuestions || []) {
    const normalized = q.content.trim().toLowerCase();
    if (normalized.length < 5) continue;
    questionMap.set(normalized, (questionMap.get(normalized) || 0) + 1);
  }
  const frequentQuestions = Array.from(questionMap.entries())
    .map(([content, count]) => ({ content, count }))
    .filter(({ count }) => count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalTickets: totalTickets || 0,
    pendingTickets: pendingTickets || 0,
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
    departmentDistribution,
    avgResolutionHours,
    frequentQuestions,
    positiveFeedback,
    negativeFeedback,
    satisfactionRate,
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
      '*, departments!tickets_department_id_fkey(name), profiles!tickets_user_id_fkey(full_name, email), assigned:profiles!tickets_assigned_to_fkey(full_name, email)',
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
  revalidatePath('/admin');
  revalidatePath('/tickets');
  revalidatePath('/mentenanta');
  return { success: true };
}

export async function assignTicketToAdmin(ticketId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat' };

  const { error } = await supabaseAdmin
    .from('tickets')
    .update({ assigned_to: user.id, status: 'atribuit' })
    .eq('id', ticketId);

  if (error) return { error: error.message };
  revalidatePath('/admin');
  revalidatePath('/tickets');
  revalidatePath('/mentenanta');
  return { success: true };
}
