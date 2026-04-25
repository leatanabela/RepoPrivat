'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { InstitutionInfo, InstitutionInfoType } from '@/lib/types';

async function verifyAdmin(userId: string): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('roles(name)')
    .eq('id', userId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (profile?.roles as any)?.name === 'admin';
}

export async function getInstitutionInfo(filters: {
  type?: InstitutionInfoType;
  search?: string;
} = {}): Promise<InstitutionInfo[]> {
  let query = supabaseAdmin
    .from('institution_info')
    .select('*')
    .order('type', { ascending: true })
    .order('created_at', { ascending: false });

  if (filters.type) query = query.eq('type', filters.type);

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    // OR pe title și content (ilike, case-insensitive)
    query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[getInstitutionInfo] Error:', error.message);
    return [];
  }
  return (data || []) as InstitutionInfo[];
}

export async function createInstitutionInfo(data: {
  type: InstitutionInfoType;
  title: string;
  content: string;
  date_from?: string | null;
  date_to?: string | null;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat' };

  if (!(await verifyAdmin(user.id))) return { error: 'Acces neautorizat' };

  if (!data.title?.trim() || !data.content?.trim()) {
    return { error: 'Titlul și conținutul sunt obligatorii' };
  }

  const { data: info, error } = await supabaseAdmin
    .from('institution_info')
    .insert({
      type: data.type,
      title: data.title.trim(),
      content: data.content.trim(),
      date_from: data.date_from || null,
      date_to: data.date_to || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/mentenanta');
  revalidatePath('/dashboard');
  return { info };
}

export async function updateInstitutionInfo(
  id: string,
  updates: {
    type?: InstitutionInfoType;
    title?: string;
    content?: string;
    date_from?: string | null;
    date_to?: string | null;
  }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat' };

  if (!(await verifyAdmin(user.id))) return { error: 'Acces neautorizat' };

  const cleanUpdates: Record<string, unknown> = {};
  if (updates.type !== undefined) cleanUpdates.type = updates.type;
  if (updates.title !== undefined) cleanUpdates.title = updates.title.trim();
  if (updates.content !== undefined) cleanUpdates.content = updates.content.trim();
  if (updates.date_from !== undefined) cleanUpdates.date_from = updates.date_from || null;
  if (updates.date_to !== undefined) cleanUpdates.date_to = updates.date_to || null;

  const { error } = await supabaseAdmin
    .from('institution_info')
    .update(cleanUpdates)
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/mentenanta');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteInstitutionInfo(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat' };

  if (!(await verifyAdmin(user.id))) return { error: 'Acces neautorizat' };

  const { error } = await supabaseAdmin
    .from('institution_info')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/mentenanta');
  revalidatePath('/dashboard');
  return { success: true };
}
