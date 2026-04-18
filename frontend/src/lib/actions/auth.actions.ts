'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message.toLowerCase();
    let translated = 'Eroare la autentificare. Încercați din nou.';
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials'))
      translated = 'Email sau parolă incorectă.';
    else if (msg.includes('email not confirmed'))
      translated = 'Adresa de email nu a fost confirmată.';
    else if (msg.includes('too many requests') || msg.includes('rate limit'))
      translated = 'Prea multe încercări. Așteptați câteva minute.';
    return { error: translated };
  }

  redirect('/dashboard');
}

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const departmentId = formData.get('departmentId') as string | null;

  // Use admin client to create user (needs service key)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) return { error: authError.message };

  // Get employee role id
  const { data: role } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('name', 'employee')
    .single();

  // Create profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role_id: role!.id,
      department_id: departmentId || null,
    });

  if (profileError) return { error: profileError.message };

  // Sign in the newly created user
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signInWithPassword({ email, password });

  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function getSession() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getProfile() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*, roles(id, name), departments(id, name)')
    .eq('id', user.id)
    .single();

  return data;
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  const supabase = await createServerSupabaseClient();

  // Verify current password by re-authenticating
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: 'Utilizator neautentificat' };

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) return { error: 'Parola curentă este incorectă' };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return { success: true };
}

export async function updateProfileAction(updates: { full_name?: string }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat' };

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}
