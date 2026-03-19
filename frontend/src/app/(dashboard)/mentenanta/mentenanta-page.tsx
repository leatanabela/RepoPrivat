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
import { createEmployee, getEmployees, getDepartments as getEmployeeDepartments } from '@/lib/actions/employee.actions';
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
  Upload,
  UserPlus,
  Copy,
  Check,
} from 'lucide-react';
import type { Document, Department, Analytics, Profile } from '@/lib/types';
import toast from 'react-hot-toast';

interface CreatedAccount {
  fullName: string;
  email: string;
  tempPassword: string;
}

type Tab = 'documente' | 'angajati' | 'statistici';

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
  const [dragOver, setDragOver] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);

  // Analytics state
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Employees state
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [empTotal, setEmpTotal] = useState(0);
  const [empLoading, setEmpLoading] = useState(true);
  const [empSubmitting, setEmpSubmitting] = useState(false);
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(null);
  const [copied, setCopied] = useState(false);
  const [empDepartments, setEmpDepartments] = useState<Department[]>([]);

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

  const loadEmployees = useCallback(async () => {
    setEmpLoading(true);
    try {
      const [empData, deptData] = await Promise.all([
        getEmployees({ limit: 100 }),
        empDepartments.length === 0 ? getEmployeeDepartments() : Promise.resolve(empDepartments),
      ]);
      setEmployees(empData.employees);
      setEmpTotal(empData.total);
      if (deptData !== empDepartments) setEmpDepartments(deptData as Department[]);
    } catch {
      toast.error('Eroare la încărcarea angajaților');
    } finally {
      setEmpLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'angajati') loadEmployees();
  }, [activeTab, loadEmployees]);

  async function handleCreateEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmpSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const result = await createEmployee(formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || 'Angajat creat cu succes!');
      setCreatedAccount({
        fullName: formData.get('fullName') as string,
        email: formData.get('email') as string,
        tempPassword: result.tempPassword || '',
      });
      setShowEmpForm(false);
      (e.target as HTMLFormElement).reset();
      loadEmployees();
    }
    setEmpSubmitting(false);
  }

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

  const ACCEPTED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  const ACCEPTED_EXT = ['.pdf', '.docx', '.txt'];

  function filterValidFiles(files: FileList | File[]): File[] {
    return Array.from(files).filter((f) => {
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
      return ACCEPTED_TYPES.includes(f.type) || ACCEPTED_EXT.includes(ext);
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const valid = filterValidFiles(e.dataTransfer.files);
    if (valid.length === 0) {
      toast.error('Niciun fișier valid. Acceptă doar PDF, DOCX, TXT.');
      return;
    }
    setBulkFiles(valid);
    setShowUpload(true);
  }

  function handleBulkFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const valid = filterValidFiles(e.target.files);
    if (valid.length === 0) {
      toast.error('Niciun fișier valid. Acceptă doar PDF, DOCX, TXT.');
      return;
    }
    setBulkFiles((prev) => [...prev, ...valid]);
  }

  function removeBulkFile(index: number) {
    setBulkFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleBulkUpload(departmentId: string) {
    if (bulkFiles.length === 0) return;
    setUploading(true);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < bulkFiles.length; i++) {
      const file = bulkFiles[i];
      const title = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setBulkProgress({ current: i + 1, total: bulkFiles.length, fileName: file.name });

      const formData = new FormData();
      formData.set('file', file);
      formData.set('title', title);
      formData.set('departmentId', departmentId);

      try {
        const result = await uploadDocument(formData);
        if (result.error) {
          toast.error(`${file.name}: ${result.error}`);
          failed++;
        } else {
          success++;
        }
      } catch {
        toast.error(`${file.name}: Eroare neașteptată`);
        failed++;
      }
    }

    setBulkProgress(null);
    setUploading(false);
    setBulkFiles([]);
    setShowUpload(false);

    if (success > 0) {
      toast.success(`${success} document${success > 1 ? 'e' : ''} încărcat${success > 1 ? 'e' : ''}!`);
      // Trigger RAG processing for all
      triggerProcessAll().catch(() => {});
    }
    if (failed > 0) {
      toast.error(`${failed} document${failed > 1 ? 'e' : ''} nu s-a${failed > 1 ? 'u' : ''} putut încărca.`);
    }
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
            { id: 'angajati', label: 'Angajați', icon: Users },
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
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => setShowUpload(true)}
              className={`mb-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                dragOver
                  ? 'border-primary bg-primary/10 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-primary/50 hover:bg-primary/5'
              } p-8 flex flex-col items-center justify-center gap-3`}
            >
              <Upload size={40} className={dragOver ? 'text-primary' : 'text-slate-400'} />
              <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                Trage fișierele aici sau click pentru a selecta
              </p>
              <p className="text-sm text-slate-400">
                PDF, DOCX, TXT — poți adăuga mai multe fișiere odată
              </p>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => setShowUpload(true)}
                className="h-16 bg-primary text-white rounded-2xl text-lg font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3"
              >
                <Plus size={22} />
                Adaugă Document
              </button>
              <button
                onClick={handleProcessAll}
                className="h-16 border-2 border-primary/30 text-primary rounded-2xl text-lg font-bold hover:bg-primary/5 transition-all flex items-center justify-center gap-3"
              >
                <Zap size={22} />
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

        {/* ── ANGAJAȚI TAB ── */}
        {activeTab === 'angajati' && (
          <div>
            {/* Create button */}
            <button
              onClick={() => { setShowEmpForm(!showEmpForm); setCreatedAccount(null); }}
              className="mb-8 h-16 w-full sm:w-auto px-8 bg-primary text-white rounded-2xl text-lg font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3"
            >
              {showEmpForm ? <X size={22} /> : <UserPlus size={22} />}
              {showEmpForm ? 'Anulează' : 'Creează Cont Angajat'}
            </button>

            {/* Created account credentials */}
            {createdAccount && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 mb-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-200 mb-3">
                      Cont creat — {createdAccount.fullName}
                    </h3>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">
                      Transmite aceste credențiale angajatului. Parola poate fi schimbată din Setări.
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-700 dark:text-emerald-300 font-bold w-16">Email:</span>
                        <code className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 text-sm">
                          {createdAccount.email}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-700 dark:text-emerald-300 font-bold w-16">Parolă:</span>
                        <code className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 text-sm font-mono">
                          {createdAccount.tempPassword}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(createdAccount.tempPassword);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="size-8 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800 flex items-center justify-center transition-colors"
                          title="Copiază parola"
                        >
                          {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-emerald-600" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setCreatedAccount(null); setCopied(false); }}
                    className="size-8 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800 flex items-center justify-center transition-colors"
                  >
                    <X size={16} className="text-emerald-600" />
                  </button>
                </div>
              </div>
            )}

            {/* Create form */}
            {showEmpForm && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-6 mb-8">
                <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nume complet</label>
                    <input
                      name="fullName"
                      type="text"
                      required
                      placeholder="Ion Popescu"
                      className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="ion.popescu@companie.ro"
                      className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Departament</label>
                    <select
                      name="departmentId"
                      required
                      className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                    >
                      <option value="">Selectează departament</option>
                      {empDepartments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={empSubmitting}
                      className="h-12 px-6 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {empSubmitting ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Se creează...
                        </>
                      ) : (
                        <>
                          <UserPlus size={18} />
                          Creează Cont
                        </>
                      )}
                    </button>
                  </div>
                </form>
                <p className="mt-3 text-xs text-slate-400">
                  Parola temporară va fi afișată după creare. Angajatul o poate schimba din Setări.
                </p>
              </div>
            )}

            {/* Employees list */}
            <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Users size={20} />
                  {empTotal} angajați în sistem
                </h3>
              </div>
              {empLoading ? (
                <div className="p-16 text-center text-slate-400 text-xl">Se încarcă...</div>
              ) : employees.length === 0 ? (
                <div className="p-16 text-center">
                  <Users size={56} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                  <p className="text-xl font-bold text-slate-400">Nu există angajați.</p>
                  <p className="text-slate-400 mt-1">Apasă <strong>"Creează Cont Angajat"</strong> pentru a începe.</p>
                </div>
              ) : (
                <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
                  {employees.map((emp) => (
                    <div key={emp.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {emp.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{emp.full_name}</p>
                        <p className="text-sm text-slate-400">{emp.email}</p>
                      </div>
                      <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex-shrink-0">
                        {emp.departments?.name || '—'}
                      </span>
                    </div>
                  ))}
                </div>
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

      {/* Upload Modal — Bulk / Drag & Drop */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                Încarcă Documente
              </h3>
              <button
                onClick={() => { setShowUpload(false); setBulkFiles([]); }}
                disabled={uploading}
                className="size-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors disabled:opacity-50"
              >
                <X size={22} />
              </button>
            </div>

            {/* Drop zone inside modal */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const valid = filterValidFiles(e.dataTransfer.files);
                if (valid.length > 0) setBulkFiles((prev) => [...prev, ...valid]);
                else toast.error('Fișiere invalide. Acceptă doar PDF, DOCX, TXT.');
              }}
              className={`rounded-xl border-2 border-dashed p-6 text-center transition-all mb-6 ${
                dragOver
                  ? 'border-primary bg-primary/10'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              <Upload size={32} className={`mx-auto mb-3 ${dragOver ? 'text-primary' : 'text-slate-400'}`} />
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">
                Trage fișierele aici
              </p>
              <p className="text-sm text-slate-400 mb-3">sau</p>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/10 text-primary rounded-xl font-bold cursor-pointer hover:bg-primary/20 transition-colors">
                <Plus size={18} />
                Selectează Fișiere
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={handleBulkFileSelect}
                />
              </label>
              <p className="text-xs text-slate-400 mt-3">PDF, DOCX, TXT — max 20MB per fișier</p>
            </div>

            {/* File list */}
            {bulkFiles.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-3">
                  {bulkFiles.length} fișier{bulkFiles.length > 1 ? 'e' : ''} selectat{bulkFiles.length > 1 ? 'e' : ''}
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {bulkFiles.map((file, i) => (
                    <div key={`${file.name}-${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                      <FileText size={18} className="text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                        <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      {!uploading && (
                        <button
                          onClick={() => removeBulkFile(i)}
                          className="size-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress bar */}
            {bulkProgress && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Se încarcă: {bulkProgress.fileName}
                  </span>
                  <span className="text-slate-500">
                    {bulkProgress.current} / {bulkProgress.total}
                  </span>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Department selector + upload button */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">
                  Departament (pentru toate fișierele)
                </label>
                <select
                  id="bulk-department"
                  className="w-full h-12 px-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                >
                  <option value="">General (toate departamentele)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const select = document.getElementById('bulk-department') as HTMLSelectElement;
                    handleBulkUpload(select?.value || '');
                  }}
                  disabled={uploading || bulkFiles.length === 0}
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
                      <Upload size={20} />
                      Încarcă {bulkFiles.length > 0 ? `${bulkFiles.length} fișier${bulkFiles.length > 1 ? 'e' : ''}` : ''}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowUpload(false); setBulkFiles([]); }}
                  disabled={uploading}
                  className="px-6 h-14 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-lg font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  Anulează
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
