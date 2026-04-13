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

  // Generate signed URLs so users can download even from private buckets
  const documents = await Promise.all(
    (data || []).map(async (doc) => {
      if (doc.file_url) {
        try {
          const url = new URL(doc.file_url);
          const storagePath = url.pathname.split(`/storage/v1/object/public/${BUCKETS.DOCUMENTS}/`)[1];
          if (storagePath) {
            const { data: signedData } = await supabaseAdmin.storage
              .from(BUCKETS.DOCUMENTS)
              .createSignedUrl(storagePath, 86400); // 24h expiry
            if (signedData?.signedUrl) {
              return { ...doc, file_url: signedData.signedUrl };
            }
          }
        } catch { /* fallback to original URL */ }
      }
      return doc;
    })
  );

  return { documents, total: count || 0, page, limit };
}

export async function uploadDocument(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('[uploadDocument] Auth error:', authError?.message);
    return { error: 'Neautentificat. Te rog să te reloghezi.' };
  }

  const file = formData.get('file') as File;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const departmentId = formData.get('departmentId') as string;

  if (!file || !title) return { error: 'Fișierul și titlul sunt obligatorii' };

  console.log('[uploadDocument] Uploading:', { title, fileName: file.name, fileSize: file.size, fileType: file.type, departmentId, userId: user.id });

  // Convert file to buffer
  let fileBuffer: Buffer;
  try {
    fileBuffer = Buffer.from(await file.arrayBuffer());
  } catch (e) {
    console.error('[uploadDocument] File buffer error:', e);
    return { error: 'Eroare la citirea fișierului. Verifică dimensiunea (max 20MB).' };
  }

  const filePath = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  // Upload to Supabase storage
  const { data: storageData, error: uploadError } = await supabaseAdmin.storage
    .from(BUCKETS.DOCUMENTS)
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('[uploadDocument] Storage upload error:', uploadError);
    if (uploadError.message?.includes('Bucket not found')) {
      return { error: 'Bucket-ul "documents" nu există în Supabase Storage. Creează-l din dashboard-ul Supabase → Storage → New Bucket → "documents" (public).' };
    }
    return { error: `Eroare stocare: ${uploadError.message}` };
  }

  console.log('[uploadDocument] Storage upload success:', storageData);

  const { data: urlData } = supabaseAdmin.storage
    .from(BUCKETS.DOCUMENTS)
    .getPublicUrl(filePath);

  console.log('[uploadDocument] Public URL:', urlData.publicUrl);

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

  if (dbError) {
    console.error('[uploadDocument] DB insert error:', dbError);
    return { error: `Eroare bază de date: ${dbError.message}` };
  }

  console.log('[uploadDocument] Document created:', doc.id);
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
