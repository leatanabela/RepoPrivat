import { supabaseAdmin } from '../config/supabase';

interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  departmentId?: string;
}

interface SignInData {
  email: string;
  password: string;
}

export async function signUp(data: SignUpData) {
  // Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  });

  if (authError) throw new Error(authError.message);

  // Get employee role id
  const { data: role } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('name', 'employee')
    .single();

  // Create profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: authData.user.id,
      email: data.email,
      full_name: data.fullName,
      role_id: role!.id,
      department_id: data.departmentId || null,
    })
    .select()
    .single();

  if (profileError) throw new Error(profileError.message);

  return profile;
}

export async function signIn(data: SignInData) {
  const { data: authData, error } = await supabaseAdmin.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) throw new Error(error.message);

  return {
    session: authData.session,
    user: authData.user,
  };
}

export async function getProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*, roles(id, name), departments(id, name)')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateProfile(userId: string, updates: {
  full_name?: string;
  department_id?: string;
  avatar_url?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
