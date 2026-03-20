'use client';

import { useEffect, useState, useCallback } from 'react';
import { getDocuments, uploadDocument, deleteDocument, triggerProcessing, triggerProcessAll } from '@/lib/actions/document.actions';
import { getDepartments } from '@/lib/actions/ticket.actions';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton } from '@/components/ui/loading-skeleton';
import { formatDate, formatFileSize } from '@/lib/utils';
import { Plus, Download, Trash2, FileText, Search, Zap, X } from 'lucide-react';
import type { Document, Department } from '@/lib/types';
import toast from 'react-hot-toast';

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const limit = 10;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDocuments({ page, limit });
      setDocuments(result.documents);
      setTotal(result.total);
    } catch {
      toast.error('Eroare la încărcarea documentelor');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadData();
    getDepartments().then(setDepartments);
  }, [loadData]);

  async function handleUpload(formData: FormData) {
    setUploading(true);
    try {
      const result = await uploadDocument(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Document încărcat! Se inițiază procesarea RAG...');
      setShowUpload(false);

      // Auto-trigger RAG processing for the newly uploaded document
      if (result.document?.id) {
        triggerProcessing(result.document.id).then((procResult) => {
          if (procResult.error) {
            toast.error(`Procesare RAG eșuată: ${procResult.error}`);
          } else {
            toast.success('Document procesat cu succes pentru RAG!');
          }
          loadData();
        }).catch(() => {
          toast.error('Serviciul AI nu este disponibil pentru procesare.');
          loadData();
        });
      }

      loadData();
    } catch (err) {
      toast.error('Eroare neașteptată la upload.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Sigur doriți să ștergeți acest document?')) return;
    const result = await deleteDocument(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Document șters!');
    loadData();
  }

  async function handleProcess(id: string) {
    toast.loading('Se procesează documentul...', { id: 'process' });
    const result = await triggerProcessing(id);
    toast.dismiss('process');
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Document procesat cu succes!');
    loadData();
  }

  async function handleProcessAll() {
    toast.loading('Se procesează toate documentele...', { id: 'processAll' });
    const result = await triggerProcessAll();
    toast.dismiss('processAll');
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Procesarea a fost inițiată!');
    loadData();
  }

  const totalPages = Math.ceil(total / limit);

  const filteredDocs = search
    ? documents.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()) || d.file_name.toLowerCase().includes(search.toLowerCase()))
    : documents;

  return (
    <div className="max-w-[1200px] mx-auto w-full p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Administrare Documente</h1>
          <p className="text-slate-500 dark:text-dm-on-surface-variant text-lg">Centralizator pentru toate fișierele și resursele digitale.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleProcessAll}
            className="flex items-center gap-2 px-4 py-3 border border-primary/20 text-primary rounded-lg font-bold hover:bg-primary/5 transition-all"
          >
            <Zap size={18} />
            <span>Procesează Tot</span>
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus size={20} />
            <span>Adaugă Document</span>
          </button>
        </div>
      </div>

      {/* Upload dialog */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dm-surface rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Încarcă Document</h3>
              <button onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const formData = new FormData(form);
              await handleUpload(formData);
              form.reset();
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Titlu</label>
                <input name="title" required placeholder="Ex: Procedura de onboarding angajați" className="w-full h-12 px-4 border border-slate-200 dark:border-dm-surface-bright/15 rounded-lg bg-transparent focus:ring-2 focus:ring-primary/20 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Descriere</label>
                <textarea name="description" rows={2} placeholder="Descriere opțională a documentului" className="w-full px-4 py-3 border border-slate-200 dark:border-dm-surface-bright/15 rounded-lg bg-transparent focus:ring-2 focus:ring-primary/20 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Departament</label>
                <select name="departmentId" className="w-full h-12 px-4 border border-slate-200 dark:border-dm-surface-bright/15 rounded-lg bg-white dark:bg-dm-surface">
                  <option value="">General (toate departamentele)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Fișier</label>
                <input name="file" type="file" required accept=".pdf,.docx,.txt" className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-semibold" />
                <p className="text-xs text-slate-400 mt-1">Formate acceptate: PDF, DOCX, TXT. Documentul va fi procesat automat pentru RAG.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={uploading} className="flex-1 h-12 bg-primary text-white rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Se încarcă...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Încarcă și Procesează
                    </>
                  )}
                </button>
                <button type="button" onClick={() => setShowUpload(false)} className="px-6 h-12 border border-slate-200 dark:border-dm-surface-bright/15 rounded-lg font-bold text-slate-600 dark:text-dm-on-surface-variant">
                  Anulează
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white dark:bg-dm-surface p-2 rounded-xl shadow-sm border border-slate-200 dark:border-dm-surface-high mb-8">
        <div className="relative flex items-center w-full">
          <div className="absolute left-4 text-slate-400"><Search size={20} /></div>
          <input
            className="w-full pl-12 pr-4 py-3 bg-transparent border-none focus:ring-0 text-slate-800 dark:text-dm-on-surface placeholder:text-slate-400"
            placeholder="Caută documente după nume..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-dm-surface-high bg-white dark:bg-dm-surface shadow-sm">
        {loading ? (
          <TableSkeleton />
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">Nu există documente.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-dm-surface-high/50">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-dm-on-surface uppercase tracking-wider">Nume Fișier</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-dm-on-surface uppercase tracking-wider">Departament</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-dm-on-surface uppercase tracking-wider">Încărcat de</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-dm-on-surface uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-dm-on-surface uppercase tracking-wider text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <FileText size={20} className="text-primary/60" />
                        <div>
                          <span className="font-medium text-slate-900 dark:text-dm-on-surface">{doc.file_name}</span>
                          <p className="text-xs text-slate-400">{doc.title} &bull; {formatFileSize(doc.file_size)} &bull; {formatDate(doc.created_at)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500 dark:text-dm-on-surface-variant">
                      {doc.departments?.name || <span className="text-slate-400 italic">General</span>}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500 dark:text-dm-on-surface-variant">
                      {doc.profiles?.full_name || '—'}
                    </td>
                    <td className="px-6 py-5">
                      {doc.is_processed ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Procesat ({doc.chunk_count} chunks)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          În așteptare
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        {!doc.is_processed && (
                          <button onClick={() => handleProcess(doc.id)} className="p-2 text-slate-400 hover:text-primary transition-colors" title="Procesează">
                            <Zap size={18} />
                          </button>
                        )}
                        <a href={doc.file_url} target="_blank" rel="noopener" className="p-2 text-slate-400 hover:text-primary transition-colors" title="Descarcă">
                          <Download size={18} />
                        </a>
                        <button onClick={() => handleDelete(doc.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Șterge">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} limit={limit} />
        )}
      </div>
    </div>
  );
}
