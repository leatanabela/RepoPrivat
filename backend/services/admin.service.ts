import { supabaseAdmin } from '../config/supabase';

// ---- Users ----

export async function getUsers(filters: {
  roleId?: string;
  departmentId?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  const { page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('profiles')
    .select('*, roles(id, name), departments(id, name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.roleId) query = query.eq('role_id', filters.roleId);
  if (filters.departmentId) query = query.eq('department_id', filters.departmentId);
  if (filters.search) query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { users: data, total: count, page, limit };
}

export async function updateUserRole(userId: string, roleId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ role_id: roleId })
    .eq('id', userId)
    .select('*, roles(name)')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ---- Departments ----

export async function getDepartments() {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('*')
    .order('name');

  if (error) throw new Error(error.message);
  return data;
}

export async function createDepartment(name: string, description?: string) {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .insert({ name, description: description || null })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateDepartment(id: string, updates: { name?: string; description?: string }) {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDepartment(id: string) {
  const { error } = await supabaseAdmin.from('departments').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ---- Categories ----

export async function getCategories(departmentId?: string) {
  let query = supabaseAdmin
    .from('ticket_categories')
    .select('*, departments(name)')
    .order('name');

  if (departmentId) query = query.eq('department_id', departmentId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function createCategory(name: string, departmentId: string) {
  const { data, error } = await supabaseAdmin
    .from('ticket_categories')
    .insert({ name, department_id: departmentId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ---- Analytics ----

export async function getAnalytics() {
  // Total tickets
  const { count: totalTickets } = await supabaseAdmin
    .from('tickets')
    .select('*', { count: 'exact', head: true });

  // Open tickets
  const { count: openTickets } = await supabaseAdmin
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .in('status', ['nou', 'atribuit', 'in_lucru', 'asteptare_utilizator']);

  // Resolved tickets
  const { count: resolvedTickets } = await supabaseAdmin
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .in('status', ['rezolvat', 'inchis']);

  // Total documents
  const { count: totalDocuments } = await supabaseAdmin
    .from('documents')
    .select('*', { count: 'exact', head: true });

  // Processed documents
  const { count: processedDocuments } = await supabaseAdmin
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('is_processed', true);

  // Total users
  const { count: totalUsers } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Total chat sessions
  const { count: totalChats } = await supabaseAdmin
    .from('chat_sessions')
    .select('*', { count: 'exact', head: true });

  // Recent tickets
  const { data: recentTickets } = await supabaseAdmin
    .from('tickets')
    .select('id, title, status, priority, created_at, profiles!tickets_user_id_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    totalTickets: totalTickets || 0,
    openTickets: openTickets || 0,
    resolvedTickets: resolvedTickets || 0,
    totalDocuments: totalDocuments || 0,
    processedDocuments: processedDocuments || 0,
    totalUsers: totalUsers || 0,
    totalChats: totalChats || 0,
    recentTickets: recentTickets || [],
  };
}
