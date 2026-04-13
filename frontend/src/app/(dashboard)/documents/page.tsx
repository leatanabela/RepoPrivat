'use client';

import { useEffect, useState, useCallback } from 'react';
import { getDocuments } from '@/lib/actions/document.actions';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton } from '@/components/ui/loading-skeleton';
import { formatDate, formatFileSize } from '@/lib/utils';
import { Download, FileText, Search } from 'lucide-react';
import type { Document } from '@/lib/types';
import toast from 'react-hot-toast';

export default function UserDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
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
  }, [loadData]);

  const totalPages = Math.ceil(total / limit);

  const filteredDocs = search
    ? documents.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()) || d.file_name.toLowerCase().includes(search.toLowerCase()))
    : documents;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 lg:p-10 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-primary">
            Documente
          </h1>
          <p className="text-slate-500 mt-1">
            Vizualizează și descarcă documentele disponibile
          </p>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-dm-surface-high/30 p-2 rounded-xl border border-slate-200/80 dark:border-dm-surface-bright/15 mb-6">
          <div className="relative flex items-center w-full">
            <div className="absolute left-4 text-slate-400"><Search size={20} /></div>
            <input
              className="w-full pl-12 pr-4 py-3 bg-transparent border-none focus:ring-0 text-slate-800 dark:text-dm-on-surface placeholder:text-slate-400 outline-none"
              placeholder="Caută documente după nume..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} />
          ) : filteredDocs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">Nu există documente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-primary/5 border-b border-primary/10">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Nume Fișier</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Departament</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Data</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Descarcă</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <FileText size={20} className="text-primary/60 shrink-0" />
                          <div>
                            <span className="text-sm font-semibold text-slate-900 dark:text-dm-on-surface">{doc.file_name}</span>
                            <p className="text-xs text-slate-400">{doc.title} &bull; {formatFileSize(doc.file_size)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500 dark:text-dm-on-surface-variant">
                        {doc.departments?.name || <span className="text-slate-400 italic">General</span>}
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500">
                        {formatDate(doc.created_at)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        >
                          Deschide
                        </a>
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
    </div>
  );
}
