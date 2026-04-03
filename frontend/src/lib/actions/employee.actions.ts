'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';

function generateSecurePassword(length = 16): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const symbols = '!@#$%^&*_+-=';
  const all = lowercase + uppercase + digits + symbols;

  // Ensure at least one of each category
  const password = [
    lowercase[crypto.randomInt(lowercase.length)],
    uppercase[crypto.randomInt(uppercase.length)],
    digits[crypto.randomInt(digits.length)],
    symbols[crypto.randomInt(symbols.length)],
  ];

  for (let i = password.length; i < length; i++) {
    password.push(all[crypto.randomInt(all.length)]);
  }

  // Shuffle using Fisher-Yates
  for (let i = password.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
}

async function verifyAdmin(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('roles(name)')
    .eq('id', userId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (profile?.roles as any)?.name === 'admin';
}

export async function createEmployee(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat' };

  const isAdmin = await verifyAdmin(user.id);
  if (!isAdmin) return { error: 'Acces neautorizat — doar adminii pot crea angajați' };

  const email = formData.get('email') as string;
  const fullName = formData.get('fullName') as string;
  const departmentId = formData.get('departmentId') as string;

  if (!email || !fullName || !departmentId) {
    return { error: 'Toate câmpurile sunt obligatorii' };
  }

  // Generate a secure temporary password
  const tempPassword = generateSecurePassword();

  // 1. Create the auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
      return { error: 'Există deja un cont cu acest email' };
    }
    return { error: authError.message };
  }

  // 2. Get employee role id
  const { data: role } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('name', 'employee')
    .single();

  if (!role) {
    // Cleanup: delete the auth user if role not found
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return { error: 'Rolul "employee" nu a fost găsit în baza de date' };
  }

  // 3. Insert profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role_id: role.id,
      department_id: departmentId,
    });

  if (profileError) {
    // Cleanup: delete the auth user if profile insert fails
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message };
  }

  return {
    success: true,
    tempPassword: tempPassword,
    message: `Contul pentru ${fullName} a fost creat cu succes.`,
  };
}

export async function getEmployees(filters: {
  departmentId?: string;
  page?: number;
  limit?: number;
} = {}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { employees: [], total: 0 };

  const isAdmin = await verifyAdmin(user.id);
  if (!isAdmin) return { employees: [], total: 0 };

  const { page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('profiles')
    .select('*, roles(id, name), departments(id, name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.departmentId) {
    query = query.eq('department_id', filters.departmentId);
  }

  const { data, error, count } = await query;
  if (error) return { employees: [], total: 0 };
  return { employees: data || [], total: count || 0 };
}

export async function updateEmployee(
  employeeId: string,
  updates: { full_name?: string; email?: string; department_id?: string; role_id?: string }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat' };

  const isAdmin = await verifyAdmin(user.id);
  if (!isAdmin) return { error: 'Acces neautorizat' };

  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', employeeId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteEmployee(employeeId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat' };

  const isAdmin = await verifyAdmin(user.id);
  if (!isAdmin) return { error: 'Acces neautorizat' };

  // Don't allow deleting yourself
  if (employeeId === user.id) return { error: 'Nu îți poți șterge propriul cont' };

  // Delete profile first (cascades should handle related data)
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', employeeId);

  if (profileError) return { error: profileError.message };

  // Delete auth user
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(employeeId);
  if (authError) return { error: authError.message };

  return { success: true };
}

export async function getRoles() {
  const { data, error } = await supabaseAdmin
    .from('roles')
    .select('id, name')
    .order('name');

  if (error) return [];
  return data || [];
}

export async function getDepartments() {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('id, name')
    .order('name');

  if (error) return [];
  return data || [];
}
