'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getInstitutionInfo,
  createInstitutionInfo,
  updateInstitutionInfo,
  deleteInstitutionInfo,
} from '@/lib/actions/institution.actions';
import { Plus, Pencil, Trash2, X, Loader2, Check, Building2, Clock, Wallet, CalendarDays, Palmtree, Info } from 'lucide-react';
import type { InstitutionInfo, InstitutionInfoType } from '@/lib/types';
import { INSTITUTION_INFO_TYPE_LABELS } from '@/lib/types';
import toast from 'react-hot-toast';

const TYPE_ICONS: Record<InstitutionInfoType, typeof Clock> = {
  program_lucru: Clock,
  salariu: Wallet,
  sarbatoare: CalendarDays,
  concediu: Palmtree,
  altele: Info,
};

const TYPE_COLORS: Record<InstitutionInfoType, { bg: string; text: string; iconBg: string }> = {
  program_lucru: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', iconBg: 'bg-blue-100 dark:bg-blue-900/40' },
  salariu: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  sarbatoare: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-900/40' },
  concediu: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-400', iconBg: 'bg-violet-100 dark:bg-violet-900/40' },
  altele: { bg: 'bg-slate-50 dark:bg-slate-900/20', text: 'text-slate-700 dark:text-slate-400', iconBg: 'bg-slate-100 dark:bg-slate-900/40' },
};

export function InstitutionAdmin() {
  const [items, setItems] = useState<InstitutionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InstitutionInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<InstitutionInfoType | 'all'>('all');

  const [form, setForm] = useState<{
    type: InstitutionInfoType;
    title: string;
    content: string;
    date_from: string;
    date_to: string;
  }>({
    type: 'program_lucru',
    title: '',
    content: '',
    date_from: '',
    date_to: '',
  });

  const load = useCallback(async () => {
    if (items.length === 0) setLoading(true);
    try {
      const data = await getInstitutionInfo();
      setItems(data);
    } catch {
      toast.error('Eroare la încărcarea informațiilor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ type: 'program_lucru', title: '', content: '', date_from: '', date_to: '' });
    setShowForm(true);
  }

  function openEdit(item: InstitutionInfo) {
    setEditing(item);
    setForm({
      type: item.type,
      title: item.title,
      content: item.content,
      date_from: item.date_from || '',
      date_to: item.date_to || '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Titlul și conținutul sunt obligatorii');
      return;
    }
    setSubmitting(true);
    const payload = {
      type: form.type,
      title: form.title,
      content: form.content,
      date_from: form.date_from || null,
      date_to: form.date_to || null,
    };
    const result = editing
      ? await updateInstitutionInfo(editing.id, payload)
      : await createInstitutionInfo(payload);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(editing ? 'Informație actualizată' : 'Informație adăugată');
      setShowForm(false);
      setEditing(null);
      load();
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Sigur doriți să ștergeți această informație?')) return;
    setDeletingId(id);
    const result = await deleteInstitutionInfo(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Informație ștearsă');
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
    setDeletingId(null);
  }

  const filteredItems = filterType === 'all' ? items : items.filter((i) => i.type === filterType);

  return (
    <div className="space-y-6">
      {/* Header + Add */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 dark:bg-dm-primary/10 flex items-center justify-center">
            <Building2 size={20} className="text-primary dark:text-dm-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-dm-on-surface">Informații Generale Instituție</h3>
            <p className="text-sm text-slate-500 dark:text-dm-on-surface-variant">Sursă unică de adevăr — vizibilă pentru toți angajații și folosită de AI</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="h-11 px-5 bg-primary dark:bg-dm-primary-container text-white rounded-xl font-semibold hover:bg-primary-hover dark:hover:bg-dm-primary-container/80 transition-all duration-180 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Plus size={16} />
          Adaugă Informație
        </button>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-180 ${
            filterType === 'all'
              ? 'bg-primary dark:bg-dm-primary-container text-white'
              : 'bg-white dark:bg-dm-surface-high border border-slate-200 dark:border-dm-surface-bright/15 text-slate-600 dark:text-dm-on-surface-variant hover:border-primary'
          }`}
        >
          Toate ({items.length})
        </button>
        {(Object.keys(INSTITUTION_INFO_TYPE_LABELS) as InstitutionInfoType[]).map((t) => {
          const Icon = TYPE_ICONS[t];
          const count = items.filter((i) => i.type === t).length;
          return (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-180 flex items-center gap-2 ${
                filterType === t
                  ? 'bg-primary dark:bg-dm-primary-container text-white'
                  : 'bg-white dark:bg-dm-surface-high border border-slate-200 dark:border-dm-surface-bright/15 text-slate-600 dark:text-dm-on-surface-variant hover:border-primary'
              }`}
            >
              <Icon size={14} />
              {INSTITUTION_INFO_TYPE_LABELS[t]} ({count})
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="rounded-2xl bg-white dark:bg-dm-surface-high/30 border border-slate-200/80 dark:border-dm-surface-bright/15 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-dm-on-surface-variant">
            <Loader2 size={20} className="inline animate-spin mr-2" /> Se încarcă...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-slate-100 dark:bg-dm-surface-high mb-3">
              <Building2 size={28} className="text-slate-300" />
            </div>
            <p className="text-base font-bold text-slate-600 dark:text-dm-on-surface-variant">Nu există informații.</p>
            <p className="text-sm text-slate-500 mt-1">Adaugă programul de lucru, sărbători, etc.</p>
          </div>
        ) : (
          <div>
            {filteredItems.map((item) => {
              const Icon = TYPE_ICONS[item.type];
              const colors = TYPE_COLORS[item.type];
              return (
                <div key={item.id} className="flex items-start gap-4 px-6 py-5 border-b border-slate-100/80 dark:border-dm-surface-bright/5 last:border-0 hover:bg-slate-50 dark:hover:bg-dm-surface-high/50 transition-colors duration-180">
                  <div className={`size-11 rounded-xl ${colors.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon size={20} className={colors.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="font-bold text-slate-800 dark:text-dm-on-surface">{item.title}</p>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text}`}>
                        {INSTITUTION_INFO_TYPE_LABELS[item.type]}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-dm-on-surface-variant whitespace-pre-wrap leading-relaxed">{item.content}</p>
                    {(item.date_from || item.date_to) && (
                      <p className="text-xs text-slate-400 mt-2">
                        {item.date_from && `de la ${new Date(item.date_from).toLocaleDateString('ro-RO')}`}
                        {item.date_from && item.date_to && ' — '}
                        {item.date_to && `până la ${new Date(item.date_to).toLocaleDateString('ro-RO')}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(item)}
                      title="Editează"
                      className="size-9 rounded-lg hover:bg-slate-100 dark:hover:bg-dm-surface-high text-slate-400 hover:text-primary flex items-center justify-center transition-all duration-180"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      title="Șterge"
                      className="size-9 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 flex items-center justify-center transition-all duration-180 disabled:opacity-50"
                    >
                      {deletingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !submitting && setShowForm(false)}>
          <div className="bg-white dark:bg-dm-surface-bright rounded-2xl shadow-2xl w-full max-w-lg p-7 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-dm-on-surface">
                {editing ? 'Editează Informație' : 'Adaugă Informație Nouă'}
              </h3>
              <button onClick={() => setShowForm(false)} className="size-8 rounded-lg hover:bg-slate-100 dark:hover:bg-dm-surface-high flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all duration-180">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-dm-on-surface mb-1.5">Tip</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as InstitutionInfoType }))}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dm-surface-bright/20 bg-white dark:bg-dm-surface-high text-sm dark:text-dm-on-surface focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all duration-180 outline-none"
                >
                  {(Object.keys(INSTITUTION_INFO_TYPE_LABELS) as InstitutionInfoType[]).map((t) => (
                    <option key={t} value={t}>{INSTITUTION_INFO_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-dm-on-surface mb-1.5">Titlu</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  placeholder="Ex: Program de lucru luni-vineri"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dm-surface-bright/20 bg-white dark:bg-dm-surface-high text-sm dark:text-dm-on-surface focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all duration-180 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-dm-on-surface mb-1.5">Conținut / Descriere</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  required
                  rows={5}
                  placeholder="Detalii complete: ore, reguli, excepții..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dm-surface-bright/20 bg-white dark:bg-dm-surface-high text-sm dark:text-dm-on-surface focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all duration-180 outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-dm-on-surface mb-1.5">Data început (opțional)</label>
                  <input
                    type="date"
                    value={form.date_from}
                    onChange={(e) => setForm((f) => ({ ...f, date_from: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dm-surface-bright/20 bg-white dark:bg-dm-surface-high text-sm dark:text-dm-on-surface focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all duration-180 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-dm-on-surface mb-1.5">Data sfârșit (opțional)</label>
                  <input
                    type="date"
                    value={form.date_to}
                    onChange={(e) => setForm((f) => ({ ...f, date_to: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dm-surface-bright/20 bg-white dark:bg-dm-surface-high text-sm dark:text-dm-on-surface focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all duration-180 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-11 bg-primary dark:bg-dm-primary-container text-white rounded-xl font-semibold hover:bg-primary-hover dark:hover:bg-dm-primary-container/80 transition-all duration-180 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {editing ? 'Salvează Modificările' : 'Adaugă'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 h-11 border border-slate-200 dark:border-dm-surface-bright/20 text-slate-600 dark:text-dm-on-surface-variant rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-dm-surface-high transition-all duration-180"
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
