'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  triggerProcessing,
  triggerProcessAll,
} from '@/lib/actions/document.actions';
import { getAnalytics } from '@/lib/actions/admin.actions';
import { getDepartments } from '@/lib/actions/ticket.actions';
import { Pagination } from '@/components/ui/pagination';
import { formatDate, formatFileSize } from '@/lib/utils';
import {
  Plus,
  Trash2,
  FileText,
  Search,
  Zap,
  X,
  BarChart3,
  Package,
  Clock,
  CheckCircle,
  Users,
  MessageSquare,
  BookOpen,
} from 'lucide-react';
import type { Document, Department, Analytics } from '@/lib/types';
import toast from 'react-hot-toast';

type Tab = 'documente' | 'statistici';

export function MentenantaPage() {
  const [activeTab, setActiveTab] = useState<Tab>('documente');

  // Documents state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docTotal, setDocTotal] = useState(0);
  const [docPage, setDocPage] = useState(1);
  const [docLoading, setDocLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');

  // Analytics state
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const limit = 10;

  const loadDocuments = useCallback(async () => {
    setDocLoading(true);
    try {
      const result = await getDocuments({ page: docPage, limit });
      setDocuments(result.documents);
      setDocTotal(result.total);
    } catch {
      toast.error('Eroare la încărcarea documentelor');
    } finally {
      setDocLoading(false);
    }
  }, [docPage]);

  useEffect(() => {
    loadDocuments();
    getDepartments().then(setDepartments);
  }, [loadDocuments]);

  useEffect(() => {
    getAnalytics()
      .then(setAnalytics)
      .finally(() => setAnalyticsLoading(false));
  }, []);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const file = (form.elements.namedItem('file') as HTMLInputElement)?.files?.[0];
    if (!file) {
      toast.error('Selectează un fișier');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData(form);
      const result = await uploadDocument(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Document încărcat! Se inițiază procesarea RAG...');
      setShowUpload(false);
      form.reset();
      triggerProcessAll().catch(() => {});
      loadDocuments();
    } catch (err) {
      toast.error('Eroare neașteptată la upload. Verifică dimensiunea fișierului (max 20MB).');
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
    loadDocuments();
  }

  async function handleProcess(id: string) {
    toast.loading('Se procesează...', { id: 'process' });
    const result = await triggerProcessing(id);
    toast.dismiss('process');
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Procesat cu succes!');
    loadDocuments();
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
    loadDocuments();
  }

  const totalPages = Math.ceil(docTotal / limit);
  const filteredDocs = search
    ? documents.filter(
        (d) =>
          d.title.toLowerCase().includes(search.toLowerCase()) ||
          d.file_name.toLowerCase().includes(search.toLowerCase())
      )
    : documents;

  const statCards = [
    { label: 'Total Tichete', value: analytics?.totalTickets, icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Tichete Deschise', value: analytics?.openTickets, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Tichete Rezolvate', value: analytics?.resolvedTickets, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Utilizatori', value: analytics?.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-10">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
            Mentenanță
          </h2>
          <p className="text-xl text-slate-500 dark:text-slate-400">
            Administrare sistem, documente și monitorizare activitate.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-10 border-b-2 border-slate-200 dark:border-slate-800">
          {([
            { id: 'documente', label: 'Gestionare Documente', icon: FileText },
            { id: 'statistici', label: 'Statistici', icon: BarChart3 },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3.5 text-lg font-bold rounded-t-xl transition-all -mb-0.5 border-b-2 ${
                activeTab === tab.id
                  ? 'bg-primary text-white border-primary'
                  : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── DOCUMENTE TAB ── */}
        {activeTab === 'documente' && (
          <div>
            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => setShowUpload(true)}
                className="h-20 bg-primary text-white rounded-2xl text-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3"
              >
                <Plus size={26} />
                Adaugă Document
              </button>
              <button
                onClick={handleProcessAll}
                className="h-20 border-2 border-primary/30 text-primary rounded-2xl text-xl font-bold hover:bg-primary/5 transition-all flex items-center justify-center gap-3"
              >
                <Zap size={26} />
                Procesează Tot (RAG)
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full h-14 pl-12 pr-4 text-lg rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400"
                placeholder="Caută documente după titlu sau nume fișier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Document list */}
            <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              {docLoading ? (
                <div className="p-16 text-center text-slate-400 text-xl">Se încarcă...</div>
              ) : filteredDocs.length === 0 ? (
                <div className="p-16 text-center">
                  <FileText size={56} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                  <p className="text-xl font-bold text-slate-400">Nu există documente încărcate.</p>
                  <p className="text-slate-400 mt-1">
                    Apasă <strong>"Adaugă Document"</strong> pentru a începe.
                  </p>
                </div>
              ) : (
                <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
                  {filteredDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 px-6 py-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText size={24} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-lg truncate">
                          {doc.title || doc.file_name}
                        </p>
                        <p className="text-sm text-slate-400 mt-0.5">
                          {doc.file_name} &bull; {formatFileSize(doc.file_size)} &bull; {formatDate(doc.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {doc.is_processed ? (
                          <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            ✓ {doc.chunk_count} chunks
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500">
                            În așteptare
                          </span>
                        )}
                        {!doc.is_processed && (
                          <button
                            onClick={() => handleProcess(doc.id)}
                            title="Procesează RAG"
                            className="size-11 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors"
                          >
                            <Zap size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(doc.id)}
                          title="Șterge"
                          className="size-11 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {totalPages > 1 && (
                <Pagination
                  page={docPage}
                  totalPages={totalPages}
                  onPageChange={setDocPage}
                  total={docTotal}
                  limit={limit}
                />
              )}
            </div>
          </div>
        )}

        {/* ── STATISTICI TAB ── */}
        {activeTab === 'statistici' && (
          <div className="space-y-8">
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                    <div className={`size-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                      <card.icon size={20} className={card.color} />
                    </div>
                  </div>
                  <p className={`text-5xl font-black ${card.color}`}>
                    {analyticsLoading ? '—' : (card.value ?? 0)}
                  </p>
                </div>
              ))}
            </div>

            {/* Knowledge base summary */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen size={20} className="text-primary" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Knowledge Base</h3>
              </div>
              <div className="flex gap-10">
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">Total documente</p>
                  <p className="text-4xl font-black text-primary">
                    {analyticsLoading ? '—' : (analytics?.totalDocuments ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">Procesate RAG</p>
                  <p className="text-4xl font-black text-emerald-500">
                    {analyticsLoading ? '—' : (analytics?.processedDocuments ?? 0)}
                  </p>
                </div>
                {analytics && analytics.totalDocuments > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">Rată procesare</p>
                    <p className="text-4xl font-black text-blue-500">
                      {Math.round((analytics.processedDocuments / analytics.totalDocuments) * 100)}%
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Placeholder charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                  Distribuție pe Departamente
                </h3>
                <div className="h-48 flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 gap-2">
                  <BarChart3 size={36} className="text-slate-300 dark:text-slate-600" />
                  <p className="text-slate-400 font-medium">Date insuficiente momentan</p>
                  <p className="text-sm text-slate-400">Disponibil după acumularea de tichete</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                  Timp Mediu Rezolvare
                </h3>
                <div className="h-48 flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 gap-2">
                  <Clock size={36} className="text-slate-300 dark:text-slate-600" />
                  <p className="text-slate-400 font-medium">Date insuficiente momentan</p>
                  <p className="text-sm text-slate-400">Disponibil după rezolvarea primelor tichete</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-6 lg:col-span-2">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                  Cele mai Frecvente Întrebări AI
                </h3>
                <div className="h-36 flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 gap-2">
                  <MessageSquare size={36} className="text-slate-300 dark:text-slate-600" />
                  <p className="text-slate-400 font-medium">Date insuficiente momentan</p>
                  <p className="text-sm text-slate-400">Disponibil după acumularea de conversații</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Adaugă Document</h3>
              <button
                onClick={() => setShowUpload(false)}
                className="size-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-5">
              <div>
                <label className="block text-lg font-bold mb-2 text-slate-800 dark:text-slate-200">
                  Titlu
                </label>
                <input
                  name="title"
                  required
                  placeholder="Ex: Procedura de onboarding angajati"
                  className="w-full h-14 px-4 text-lg border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-lg font-bold mb-2 text-slate-800 dark:text-slate-200">
                  Departament
                </label>
                <select
                  name="departmentId"
                  className="w-full h-14 px-4 text-lg border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 appearance-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                >
                  <option value="">General (toate departamentele)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-lg font-bold mb-2 text-slate-800 dark:text-slate-200">
                  Fișier
                </label>
                <input
                  name="file"
                  type="file"
                  required
                  accept=".pdf,.docx,.txt"
                  className="w-full text-base file:mr-4 file:py-3 file:px-5 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary file:font-bold cursor-pointer"
                />
                <p className="text-sm text-slate-400 mt-1.5">
                  Formate acceptate: PDF, DOCX, TXT. Documentul va fi procesat automat pentru RAG.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 h-14 bg-primary text-white rounded-xl text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:bg-primary/90"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Se încarcă...
                    </>
                  ) : (
                    <>
                      <Plus size={20} />
                      Încarcă și Procesează
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="px-6 h-14 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-lg font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Anulează
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
