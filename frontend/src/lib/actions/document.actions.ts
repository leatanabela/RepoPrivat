'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AI_SERVICE_URL, BUCKETS } from '@/lib/constants';

export async function getDocuments(filters: {
  page?: number;
  limit?: number;
  isProcessed?: boolean;
} = {}) {
  const { page = 1, limit = 20, ...rest } = filters;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('documents')
    .select('*, departments(name), profiles!documents_uploaded_by_fkey(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (rest.isProcessed !== undefined) query = query.eq('is_processed', rest.isProcessed);

  const { data, error, count } = await query;
  if (error) return { documents: [], total: 0, page, limit };
  return { documents: data || [], total: count || 0, page, limit };
}

export async function uploadDocument(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Neautentificat' };

  const file = formData.get('file') as File;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const departmentId = formData.get('departmentId') as string;

  if (!file || !title) return { error: 'Fișierul și titlul sunt obligatorii' };

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const filePath = `${Date.now()}_${file.name}`;

  // Upload to Supabase storage
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKETS.DOCUMENTS)
    .upload(filePath, fileBuffer, { contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabaseAdmin.storage
    .from(BUCKETS.DOCUMENTS)
    .getPublicUrl(filePath);

  const { data: doc, error: dbError } = await supabaseAdmin
    .from('documents')
    .insert({
      title,
      description: description || null,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      department_id: departmentId || null,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (dbError) return { error: dbError.message };
  return { document: doc };
}

export async function deleteDocument(id: string) {
  const { data: doc } = await supabaseAdmin
    .from('documents')
    .select('file_url')
    .eq('id', id)
    .single();

  if (doc?.file_url) {
    try {
      const url = new URL(doc.file_url);
      const storagePath = url.pathname.split('/storage/v1/object/public/documents/')[1];
      if (storagePath) {
        await supabaseAdmin.storage.from(BUCKETS.DOCUMENTS).remove([storagePath]);
      }
    } catch { /* ignore storage cleanup errors */ }
  }

  await supabaseAdmin.from('document_chunks').delete().eq('document_id', id);
  const { error } = await supabaseAdmin.from('documents').delete().eq('id', id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function triggerProcessing(documentId: string) {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/documents/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: documentId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { error: err.detail || 'Eroare la procesarea documentului' };
    }
    return await res.json();
  } catch {
    return { error: 'Serviciul AI nu este disponibil' };
  }
}

export async function triggerProcessAll() {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/documents/process-all`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { error: err.detail || 'Eroare la procesarea documentelor' };
    }
    return await res.json();
  } catch {
    return { error: 'Serviciul AI nu este disponibil' };
  }
}
