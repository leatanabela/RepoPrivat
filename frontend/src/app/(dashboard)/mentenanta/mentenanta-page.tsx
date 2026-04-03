'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  triggerProcessing,
} from '@/lib/actions/document.actions';
import { getAnalytics } from '@/lib/actions/admin.actions';
import { getDepartments } from '@/lib/actions/ticket.actions';
import { createEmployee, getEmployees, getDepartments as getEmployeeDepartments, updateEmployee, deleteEmployee, getRoles } from '@/lib/actions/employee.actions';
import { Pagination } from '@/components/ui/pagination';
import { formatDate, formatFileSize } from '@/lib/utils';
import {
  Plus,
  Trash2,
  FileText,
  Search,
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
  FolderOpen,
  Pencil,
  Shield,
  Loader2,
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
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [editingEmp, setEditingEmp] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', department_id: '', role_id: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const data = await getAnalytics();
      setAnalytics(data);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Reload analytics when switching to statistici tab
  useEffect(() => {
    if (activeTab === 'statistici') loadAnalytics();
  }, [activeTab, loadAnalytics]);

  const loadEmployees = useCallback(async () => {
    setEmpLoading(true);
    try {
      const [empData, deptData, rolesData] = await Promise.all([
        getEmployees({ limit: 100 }),
        empDepartments.length === 0 ? getEmployeeDepartments() : Promise.resolve(empDepartments),
        roles.length === 0 ? getRoles() : Promise.resolve(roles),
      ]);
      setEmployees(empData.employees);
      setEmpTotal(empData.total);
      if (deptData !== empDepartments) setEmpDepartments(deptData as Department[]);
      if (rolesData !== roles) setRoles(rolesData);
    } catch {
      toast.error('Eroare la încărcarea angajaților');
    } finally {
      setEmpLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'angajati') loadEmployees();
  }, [activeTab, loadEmployees]);

  function openEditModal(emp: Profile) {
    setEditingEmp(emp);
    setEditForm({
      full_name: emp.full_name || '',
      email: emp.email || '',
      department_id: emp.department_id || '',
      role_id: emp.role_id || '',
    });
  }

  async function handleSaveEdit() {
    if (!editingEmp) return;
    setEditSaving(true);
    const result = await updateEmployee(editingEmp.id, editForm);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Contul a fost actualizat');
      setEditingEmp(null);
      loadEmployees();
    }
    setEditSaving(false);
  }

  async function handleDeleteEmployee(id: string) {
    if (!confirm('Sigur doriți să ștergeți acest cont? Toate datele asociate vor fi afectate.')) return;
    setDeletingId(id);
    const result = await deleteEmployee(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Contul a fost șters');
      loadEmployees();
    }
    setDeletingId(null);
  }

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

      toast.success('Document încărcat! Se procesează automat...');
      setShowUpload(false);
      form.reset();
      if (result.document?.id) {
        triggerProcessing(result.document.id).then((procResult) => {
          if (procResult.error) {
            toast.error(`Procesare eșuată: ${procResult.error}`);
          } else {
            toast.success('Document procesat cu succes! AI-ul poate răspunde din el.');
          }
          loadDocuments();
        }).catch(() => {
          toast.error('Serviciul AI nu este disponibil pentru procesare.');
          loadDocuments();
        });
      }
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
          if (result.document?.id) {
            triggerProcessing(result.document.id).catch(() => {});
          }
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
      toast.success(`${success} document${success > 1 ? 'e' : ''} încărcat${success > 1 ? 'e' : ''} și se procesează automat!`);
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
    { label: 'Tichete în Așteptare', value: analytics?.pendingTickets, icon: Package, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Tichete în Lucru', value: analytics?.inProgressTickets, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Tichete Rezolvate', value: analytics?.resolvedTickets, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Utilizatori', value: analytics?.totalUsers, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-6 py-10">

        {/* Tabs */}
        <div className="flex gap-1 p-1 mb-10 bg-slate-100 dark:bg-dm-surface-high rounded-2xl w-fit">
          {([
            { id: 'documente', label: 'Documente', icon: FileText },
            { id: 'angajati', label: 'Angajați', icon: Users },
            { id: 'statistici', label: 'Statistici', icon: BarChart3 },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-180 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-dm-surface-bright text-primary dark:text-dm-primary shadow-sm'
                  : 'text-slate-500 dark:text-dm-on-surface-variant hover:text-slate-700 dark:hover:text-dm-on-surface'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── DOCUMENTE TAB ── */}
        {activeTab === 'documente' && (
          <div className="space-y-6">
            {/* Stat card + Add button row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-dm-surface-high/50 rounded-2xl p-6 border border-slate-200/80 dark:border-dm-surface-bright/15">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-dm-on-surface-variant mb-3">
                  Total Documente
                </p>
                <p className="text-4xl font-black text-slate-900 dark:text-dm-on-surface">
                  {docTotal}
                  <span className="text-sm font-medium text-slate-500 dark:text-dm-on-surface-variant ml-2">{docTotal === 1 ? 'fișier' : 'fișiere'}</span>
                </p>
              </div>
              <button
                onClick={() => setShowUpload(true)}
                className="group bg-primary dark:bg-dm-primary-container text-white rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 hover:bg-primary-hover dark:hover:bg-dm-primary-container/80 transition-all duration-180 shadow-md shadow-primary/15 dark:shadow-dm-primary/10 active:scale-[0.98]"
              >
                <FolderOpen size={24} className="transition-transform duration-180 group-hover:scale-110" />
                <span className="text-sm font-bold">Adaugă Document</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dm-on-surface-variant pointer-events-none" />
              <input
                className="w-full h-12 pl-11 pr-4 text-sm rounded-xl bg-white dark:bg-dm-surface-high border border-slate-200 dark:border-dm-surface-bright/20 focus:border-primary dark:focus:border-dm-primary focus:ring-2 focus:ring-primary/15 dark:focus:ring-dm-primary/15 transition-all duration-180 placeholder:text-slate-400 dark:placeholder:text-dm-on-surface-variant/70 dark:text-dm-on-surface outline-none"
                placeholder="Caută după nume document, tip sau status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Document table */}
            <div className="rounded-2xl bg-white dark:bg-dm-surface-high/30 border border-slate-200/80 dark:border-dm-surface-bright/15 overflow-hidden">
              {docLoading ? (
                <div className="p-16 text-center">
                  <div className="inline-flex items-center gap-3 text-slate-500 dark:text-dm-on-surface-variant">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Se încarcă...
                  </div>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-slate-100 dark:bg-dm-surface-high mb-4">
                    <FileText size={32} className="text-slate-300 dark:text-dm-surface-bright" />
                  </div>
                  <p className="text-lg font-bold text-slate-600 dark:text-dm-on-surface-variant">Nu există documente încărcate.</p>
                  <p className="text-sm text-slate-500 dark:text-dm-on-surface-variant mt-1.5">
                    Apasă <strong>&quot;Adaugă Document&quot;</strong> pentru a începe.
                  </p>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div className="hidden sm:grid grid-cols-[1fr_180px_100px] gap-6 px-6 py-3.5 border-b border-slate-100 dark:border-dm-surface-bright/10 bg-slate-50/50 dark:bg-dm-surface-high/20">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-dm-on-surface-variant">
                      Nume Fișier
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-dm-on-surface-variant">
                      Data Încărcării
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-dm-on-surface-variant text-right">
                      Acțiuni
                    </p>
                  </div>

                  {/* Table rows */}
                  {filteredDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 sm:grid sm:grid-cols-[1fr_180px_100px] sm:gap-6 px-6 py-5 border-b border-slate-100/80 dark:border-dm-surface-bright/5 last:border-0 hover:bg-slate-50 dark:hover:bg-dm-surface-high/50 transition-colors duration-180"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="size-11 rounded-xl bg-primary/10 dark:bg-dm-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText size={20} className="text-primary dark:text-dm-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-800 dark:text-dm-on-surface truncate text-[15px]">
                            {doc.title || doc.file_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-dm-on-surface-variant mt-1">
                            {formatFileSize(doc.file_size)} &bull; {doc.file_type || 'Document'}
                          </p>
                        </div>
                      </div>
                      <p className="hidden sm:block text-sm text-slate-600 dark:text-dm-on-surface-variant">
                        {formatDate(doc.created_at)}
                      </p>
                      <div className="flex justify-end flex-shrink-0">
                        <button
                          onClick={() => handleDelete(doc.id)}
                          title="Șterge document"
                          className="size-10 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center transition-all duration-180 active:scale-95"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
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
          <div className="space-y-6">
            <button
              onClick={() => { setShowEmpForm(!showEmpForm); setCreatedAccount(null); }}
              className="h-12 w-full sm:w-auto px-6 bg-primary dark:bg-dm-primary-container text-white rounded-xl font-semibold hover:bg-primary-hover dark:hover:bg-dm-primary-container/80 transition-all duration-180 shadow-md shadow-primary/15 dark:shadow-dm-primary/10 flex items-center justify-center gap-2.5 active:scale-[0.98]"
            >
              {showEmpForm ? <X size={18} /> : <UserPlus size={18} />}
              {showEmpForm ? 'Anulează' : 'Creează Cont Angajat'}
            </button>

            {createdAccount && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-200 mb-2">
                      Cont creat — {createdAccount.fullName}
                    </h3>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-4">
                      Transmite aceste credențiale angajatului. Parola poate fi schimbată din Setări.
                    </p>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-800 dark:text-emerald-300 font-semibold w-16">Email:</span>
                        <code className="bg-white dark:bg-dm-surface-high px-3 py-1.5 rounded-lg text-slate-700 dark:text-dm-on-surface text-sm border border-emerald-100 dark:border-transparent">
                          {createdAccount.email}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-800 dark:text-emerald-300 font-semibold w-16">Parolă:</span>
                        <code className="bg-white dark:bg-dm-surface-high px-3 py-1.5 rounded-lg text-slate-700 dark:text-dm-on-surface text-sm font-mono border border-emerald-100 dark:border-transparent">
                          {createdAccount.tempPassword}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(createdAccount.tempPassword);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="size-9 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800 flex items-center justify-center transition-colors duration-180"
                          title="Copiază parola"
                        >
                          {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-emerald-600" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setCreatedAccount(null); setCopied(false); }}
                    className="size-9 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800 flex items-center justify-center transition-colors duration-180"
                  >
                    <X size={16} className="text-emerald-600" />
                  </button>
                </div>
              </div>
            )}

            {showEmpForm && (
              <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6">
                <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-dm-on-surface mb-1.5">Nume complet</label>
                    <input
                      name="fullName"
                      type="text"
                      required
                      placeholder="Ion Popescu"
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dm-surface-bright/20 bg-white dark:bg-dm-surface-high text-sm dark:text-dm-on-surface focus:border-primary dark:focus:border-dm-primary focus:ring-2 focus:ring-primary/15 transition-all duration-180 placeholder:text-slate-400 dark:placeholder:text-dm-on-surface-variant/70 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-dm-on-surface mb-1.5">Email</label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="ion.popescu@companie.ro"
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dm-surface-bright/20 bg-white dark:bg-dm-surface-high text-sm dark:text-dm-on-surface focus:border-primary dark:focus:border-dm-primary focus:ring-2 focus:ring-primary/15 transition-all duration-180 placeholder:text-slate-400 dark:placeholder:text-dm-on-surface-variant/70 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-dm-on-surface mb-1.5">Departament</label>
                    <select
                      name="departmentId"
                      required
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dm-surface-bright/20 bg-white dark:bg-dm-surface-high text-sm dark:text-dm-on-surface focus:border-primary dark:focus:border-dm-primary focus:ring-2 focus:ring-primary/15 transition-all duration-180 outline-none"
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
                      className="h-11 px-5 bg-primary dark:bg-dm-primary-container text-white rounded-xl font-semibold hover:bg-primary-hover dark:hover:bg-dm-primary-container/80 transition-all duration-180 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-[0.98]"
                    >
                      {empSubmitting ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Se creează...
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} />
                          Creează Cont
                        </>
                      )}
                    </button>
                  </div>
                </form>
                <p className="mt-3 text-xs text-slate-500 dark:text-dm-on-surface-variant">
                  Parola temporară va fi afișată după creare. Angajatul o poate schimba din Setări.
                </p>
              </div>
            )}

            <div className="rounded-2xl bg-white dark:bg-dm-surface-high/30 border border-slate-200/80 dark:border-dm-surface-bright/15 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-dm-surface-bright/10 bg-slate-50/50 dark:bg-dm-surface-high/20">
                <h3 className="text-base font-bold text-slate-700 dark:text-dm-on-surface flex items-center gap-2.5">
                  <Users size={18} className="text-slate-500 dark:text-dm-on-surface-variant" />
                  <span>{empTotal} angajați în sistem</span>
                </h3>
              </div>
              {empLoading ? (
                <div className="p-16 text-center">
                  <div className="inline-flex items-center gap-3 text-slate-500 dark:text-dm-on-surface-variant">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Se încarcă...
                  </div>
                </div>
              ) : employees.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-slate-100 dark:bg-dm-surface-high mb-4">
                    <Users size={32} className="text-slate-300 dark:text-dm-surface-bright" />
                  </div>
                  <p className="text-lg font-bold text-slate-600 dark:text-dm-on-surface-variant">Nu există angajați.</p>
                  <p className="text-sm text-slate-500 dark:text-dm-on-surface-variant mt-1.5">Apasă <strong>&quot;Creează Cont Angajat&quot;</strong> pentru a începe.</p>
                </div>
              ) : (
                <div>
                  {employees.map((emp) => {
                    const isEmpAdmin = (emp.roles as any)?.name === 'admin';
                    return (
                      <div key={emp.id} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100/80 dark:border-dm-surface-bright/5 last:border-0 hover:bg-slate-50 dark:hover:bg-dm-surface-high/50 transition-colors duration-180">
                        <div className={`size-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          isEmpAdmin
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : 'bg-primary/10 dark:bg-dm-primary/10 text-primary dark:text-dm-primary'
                        }`}>
                          {emp.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-800 dark:text-dm-on-surface truncate">{emp.full_name}</p>
                            {isEmpAdmin && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex-shrink-0">
                                <Shield size={10} />
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 dark:text-dm-on-surface-variant">{emp.email}</p>
                        </div>
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 flex-shrink-0">
                          {emp.departments?.name || '—'}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEditModal(emp)}
                            title="Editează"
                            className="size-9 rounded-lg hover:bg-slate-100 dark:hover:bg-dm-surface-high text-slate-400 hover:text-primary dark:hover:text-dm-primary flex items-center justify-center transition-all duration-180"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(emp.id)}
                            title="Șterge cont"
                            disabled={deletingId === emp.id}
                            className="size-9 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center transition-all duration-180 disabled:opacity-50"
                          >
                            {deletingId === emp.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STATISTICI TAB ── */}
        {activeTab === 'statistici' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6 hover:shadow-sm transition-shadow duration-180"
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-slate-600 dark:text-dm-on-surface-variant">{card.label}</p>
                    <div className={`size-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                      <card.icon size={20} className={card.color} />
                    </div>
                  </div>
                  <p className={`text-4xl font-black ${card.color}`}>
                    {analyticsLoading ? '—' : (card.value ?? 0)}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-dm-on-surface mb-5">
                  Distribuție pe Departamente
                </h3>
                <div className="h-48 flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-dm-surface-high border border-dashed border-slate-200 dark:border-dm-surface-bright/20 gap-2">
                  <BarChart3 size={32} className="text-slate-300 dark:text-dm-surface-bright" />
                  <p className="text-sm font-medium text-slate-500 dark:text-dm-on-surface-variant">Date insuficiente momentan</p>
                  <p className="text-xs text-slate-400 dark:text-dm-on-surface-variant">Disponibil după acumularea de tichete</p>
                </div>
              </div>

              <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-dm-on-surface mb-5">
                  Timp Mediu Rezolvare
                </h3>
                <div className="h-48 flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-dm-surface-high border border-dashed border-slate-200 dark:border-dm-surface-bright/20 gap-2">
                  <Clock size={32} className="text-slate-300 dark:text-dm-surface-bright" />
                  <p className="text-sm font-medium text-slate-500 dark:text-dm-on-surface-variant">Date insuficiente momentan</p>
                  <p className="text-xs text-slate-400 dark:text-dm-on-surface-variant">Disponibil după rezolvarea primelor tichete</p>
                </div>
              </div>

              <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6 lg:col-span-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-dm-on-surface mb-5">
                  Cele mai Frecvente Întrebări AI
                </h3>
                <div className="h-36 flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-dm-surface-high border border-dashed border-slate-200 dark:border-dm-surface-bright/20 gap-2">
                  <MessageSquare size={32} className="text-slate-300 dark:text-dm-surface-bright" />
                  <p className="text-sm font-medium text-slate-500 dark:text-dm-on-surface-variant">Date insuficiente momentan</p>
                  <p className="text-xs text-slate-400 dark:text-dm-on-surface-variant">Disponibil după acumularea de conversații</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { if (!uploading) { setShowUpload(false); setBulkFiles([]); } }}>
          <div className="bg-white dark:bg-dm-surface-bright rounded-2xl shadow-2xl w-full max-w-xl p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-dm-on-surface">
                Încarcă Documente
              </h3>
              <button
                onClick={() => { setShowUpload(false); setBulkFiles([]); }}
                disabled={uploading}
                className="size-9 rounded-xl hover:bg-slate-100 dark:hover:bg-dm-surface-high flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all duration-180 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

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
              className={`rounded-xl border-2 border-dashed p-8 text-center transition-all duration-180 mb-6 ${
                dragOver
                  ? 'border-primary dark:border-dm-primary bg-primary/5 dark:bg-dm-primary/10'
                  : 'border-slate-200 dark:border-dm-surface-bright/30 hover:border-slate-300 dark:hover:border-dm-surface-bright/50'
              }`}
            >
              <div className={`inline-flex items-center justify-center size-12 rounded-xl mb-3 ${dragOver ? 'bg-primary/10 dark:bg-dm-primary/15' : 'bg-slate-100 dark:bg-dm-surface-high'}`}>
                <Upload size={24} className={`${dragOver ? 'text-primary dark:text-dm-primary' : 'text-slate-400 dark:text-dm-on-surface-variant'}`} />
              </div>
              <p className="font-semibold text-slate-700 dark:text-dm-on-surface mb-1">
                Trage fișierele aici
              </p>
              <p className="text-sm text-slate-500 dark:text-dm-on-surface-variant mb-4">sau</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 dark:bg-dm-primary/10 text-primary dark:text-dm-primary rounded-lg font-semibold text-sm cursor-pointer hover:bg-primary/15 dark:hover:bg-dm-primary/20 transition-colors duration-180">
                <Plus size={16} />
                Selectează Fișiere
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={handleBulkFileSelect}
                />
              </label>
              <p className="text-xs text-slate-500 dark:text-dm-on-surface-variant mt-4">PDF, DOCX, TXT — max 20MB per fișier</p>
            </div>

            {bulkFiles.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-slate-600 dark:text-dm-on-surface-variant mb-3">
                  {bulkFiles.length} fișier{bulkFiles.length > 1 ? 'e' : ''} selectat{bulkFiles.length > 1 ? 'e' : ''}
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {bulkFiles.map((file, i) => (
                    <div key={`${file.name}-${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-dm-surface-high border border-slate-100 dark:border-transparent">
                      <FileText size={16} className="text-primary dark:text-dm-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-dm-on-surface truncate">{file.name}</p>
                        <p className="text-xs text-slate-500 dark:text-dm-on-surface-variant">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      {!uploading && (
                        <button
                          onClick={() => removeBulkFile(i)}
                          className="size-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors duration-180"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bulkProgress && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-700 dark:text-dm-on-surface truncate mr-3">
                    Se încarcă: {bulkProgress.fileName}
                  </span>
                  <span className="text-slate-500 dark:text-dm-on-surface-variant flex-shrink-0">
                    {bulkProgress.current} / {bulkProgress.total}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-dm-surface-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary dark:bg-dm-primary rounded-full transition-all duration-300"
                    style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-dm-on-surface">
                  Departament (pentru toate fișierele)
                </label>
                <select
                  id="bulk-department"
                  className="w-full h-11 px-4 border border-slate-200 dark:border-dm-surface-bright/20 rounded-xl bg-white dark:bg-dm-surface-high dark:text-dm-on-surface focus:border-primary dark:focus:border-dm-primary focus:ring-2 focus:ring-primary/15 transition-all duration-180 outline-none text-sm"
                >
                  <option value="">General (toate departamentele)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    const select = document.getElementById('bulk-department') as HTMLSelectElement;
                    handleBulkUpload(select?.value || '');
                  }}
                  disabled={uploading || bulkFiles.length === 0}
                  className="flex-1 h-12 bg-primary dark:bg-dm-primary-container text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-180 hover:bg-primary-hover dark:hover:bg-dm-primary-container/80 active:scale-[0.98]"
                >
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
                      <Upload size={18} />
                      Încarcă {bulkFiles.length > 0 ? `${bulkFiles.length} fișier${bulkFiles.length > 1 ? 'e' : ''}` : ''}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowUpload(false); setBulkFiles([]); }}
                  disabled={uploading}
                  className="px-5 h-12 border border-slate-200 dark:border-dm-surface-bright/20 rounded-xl font-semibold text-slate-600 dark:text-dm-on-surface-variant hover:bg-slate-50 dark:hover:bg-dm-surface-high transition-all duration-180 disabled:opacity-50"
                >
                  Anulează
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Employee Modal */}
      {editingEmp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !editSaving && setEditingEmp(null)}>
          <div className="bg-white dark:bg-dm-surface-bright rounded-2xl shadow-2xl w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-dm-on-surface">Editează Cont</h3>
              <button onClick={() => setEditingEmp(null)} className="size-8 rounded-lg hover:bg-slate-100 dark:hover:bg-dm-surface-high flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all duration-180">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-dm-on-surface mb-1.5">Nume complet</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dm-surface-bright/20 bg-white dark:bg-dm-surface-high text-sm dark:text-dm-on-surface focus:border-primary dark:focus:border-dm-primary focus:ring-2 focus:ring-primary/15 transition-all duration-180 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-dm-on-surface mb-1.5">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dm-surface-bright/20 bg-white dark:bg-dm-surface-high text-sm dark:text-dm-on-surface focus:border-primary dark:focus:border-dm-primary focus:ring-2 focus:ring-primary/15 transition-all duration-180 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-dm-on-surface mb-1.5">Departament</label>
                <select
                  value={editForm.department_id}
                  onChange={(e) => setEditForm((f) => ({ ...f, department_id: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dm-surface-bright/20 bg-white dark:bg-dm-surface-high text-sm dark:text-dm-on-surface focus:border-primary dark:focus:border-dm-primary focus:ring-2 focus:ring-primary/15 transition-all duration-180 outline-none"
                >
                  <option value="">Fără departament</option>
                  {empDepartments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-dm-on-surface mb-1.5">Rol</label>
                <select
                  value={editForm.role_id}
                  onChange={(e) => setEditForm((f) => ({ ...f, role_id: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dm-surface-bright/20 bg-white dark:bg-dm-surface-high text-sm dark:text-dm-on-surface focus:border-primary dark:focus:border-dm-primary focus:ring-2 focus:ring-primary/15 transition-all duration-180 outline-none"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name === 'admin' ? 'Administrator' : 'Angajat'}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="flex-1 h-11 bg-primary dark:bg-dm-primary-container text-white rounded-xl font-semibold hover:bg-primary-hover dark:hover:bg-dm-primary-container/80 transition-all duration-180 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {editSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Salvează
              </button>
              <button
                onClick={() => setEditingEmp(null)}
                className="px-5 h-11 border border-slate-200 dark:border-dm-surface-bright/20 text-slate-600 dark:text-dm-on-surface-variant rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-dm-surface-high transition-all duration-180"
              >
                Anulează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
