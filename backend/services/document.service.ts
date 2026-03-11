import { supabaseAdmin } from '../config/supabase';
import { AI_SERVICE_URL, BUCKETS } from '../config/constants';

interface DocumentFilters {
  departmentId?: string;
  isProcessed?: boolean;
  page?: number;
  limit?: number;
}

export async function uploadDocument(
  file: { buffer: Buffer; originalName: string; mimeType: string },
  metadata: {
    title: string;
    description?: string;
    departmentId?: string;
    uploadedBy: string;
  }
) {
  const filePath = `${Date.now()}_${file.originalName}`;

  // Upload to Supabase storage
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKETS.DOCUMENTS)
    .upload(filePath, file.buffer, {
      contentType: file.mimeType,
    });

  if (uploadError) throw new Error(uploadError.message);

  // Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from(BUCKETS.DOCUMENTS)
    .getPublicUrl(filePath);

  // Create document record
  const { data: doc, error: dbError } = await supabaseAdmin
    .from('documents')
    .insert({
      title: metadata.title,
      description: metadata.description || null,
      file_url: urlData.publicUrl,
      file_name: file.originalName,
      file_type: file.mimeType,
      file_size: file.buffer.length,
      department_id: metadata.departmentId || null,
      uploaded_by: metadata.uploadedBy,
    })
    .select()
    .single();

  if (dbError) throw new Error(dbError.message);

  return doc;
}

export async function getDocuments(filters: DocumentFilters = {}) {
  const { page = 1, limit = 20, ...rest } = filters;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('documents')
    .select('*, departments(name), profiles!documents_uploaded_by_fkey(full_name)', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (rest.departmentId) query = query.eq('department_id', rest.departmentId);
  if (rest.isProcessed !== undefined) query = query.eq('is_processed', rest.isProcessed);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { documents: data, total: count, page, limit };
}

export async function getDocumentById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('*, departments(name), profiles!documents_uploaded_by_fkey(full_name)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDocument(id: string) {
  // Get the document to find the file path
  const { data: doc } = await supabaseAdmin
    .from('documents')
    .select('file_url, file_name')
    .eq('id', id)
    .single();

  if (doc?.file_url) {
    // Extract storage path from URL
    const url = new URL(doc.file_url);
    const storagePath = url.pathname.split('/storage/v1/object/public/documents/')[1];
    if (storagePath) {
      await supabaseAdmin.storage.from(BUCKETS.DOCUMENTS).remove([storagePath]);
    }
  }

  // Delete chunks first (cascade should handle this, but be explicit)
  await supabaseAdmin.from('document_chunks').delete().eq('document_id', id);

  // Delete document record
  const { error } = await supabaseAdmin.from('documents').delete().eq('id', id);
  if (error) throw new Error(error.message);

  return { success: true };
}

export async function triggerProcessing(documentId: string) {
  const res = await fetch(`${AI_SERVICE_URL}/api/documents/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: documentId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to trigger document processing');
  }

  return await res.json();
}

export async function triggerProcessAll() {
  const res = await fetch(`${AI_SERVICE_URL}/api/documents/process-all`, {
    method: 'POST',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to trigger batch processing');
  }

  return await res.json();
}
