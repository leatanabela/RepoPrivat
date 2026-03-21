'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createTicket, getDepartments } from '@/lib/actions/ticket.actions';
import { Send } from 'lucide-react';
import type { TicketPriority, Department } from '@/lib/types';
import toast from 'react-hot-toast';

const priorityOptions: Array<{ value: TicketPriority; label: string; color: string }> = [
  { value: 'scazuta', label: 'Mică', color: 'peer-checked:border-green-600 peer-checked:bg-green-50 dark:peer-checked:bg-green-900/20 peer-checked:text-green-700' },
  { value: 'medie', label: 'Medie', color: 'peer-checked:border-orange-500 peer-checked:bg-orange-50 dark:peer-checked:bg-orange-900/20 peer-checked:text-orange-700' },
  { value: 'ridicata', label: 'Mare', color: 'peer-checked:border-red-600 peer-checked:bg-red-50 dark:peer-checked:bg-red-900/20 peer-checked:text-red-700' },
];

export default function NewTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    getDepartments().then(setDepartments);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set('useAi', 'true');
    const result = await createTicket(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.aiSuggestions) {
      toast.success('Tichet creat! AI a sugerat clasificarea automată.');
    } else {
      toast.success('Tichet creat cu succes!');
    }
    router.push('/tickets');
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[800px] mx-auto px-6 py-10">
        <div className="mb-10">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
            Sesizare Nouă
          </h2>
          <p className="text-xl text-slate-500 dark:text-dm-on-surface-variant">
            Te rugăm să completezi formularul de mai jos pentru asistență tehnică.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="text-xl font-bold text-slate-800 dark:text-dm-on-surface block" htmlFor="title">
              Subiect
            </label>
            <input
              className="w-full h-16 px-6 text-xl rounded-xl border-2 border-slate-200 dark:border-dm-surface-bright/15 bg-white dark:bg-dm-surface focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400"
              id="title"
              name="title"
              placeholder="Ex: Eroare conectare imprimantă"
              type="text"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-xl font-bold text-slate-800 dark:text-dm-on-surface block" htmlFor="departmentId">
              Departament
            </label>
            <select
              className="w-full h-16 px-6 text-xl rounded-xl border-2 border-slate-200 dark:border-dm-surface-bright/15 bg-white dark:bg-dm-surface appearance-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
              id="departmentId"
              name="departmentId"
            >
              <option value="">Alegeți un departament...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <p className="text-xl font-bold text-slate-800 dark:text-dm-on-surface">Urgență</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {priorityOptions.map((opt) => (
                <label key={opt.value} className="relative flex items-center cursor-pointer">
                  <input
                    className="peer sr-only"
                    name="priority"
                    type="radio"
                    value={opt.value}
                    defaultChecked={opt.value === 'scazuta'}
                  />
                  <div className={`w-full py-5 px-6 text-center rounded-xl border-2 border-slate-200 dark:border-dm-surface-bright/15 bg-white dark:bg-dm-surface ${opt.color} transition-all hover:bg-slate-50 dark:hover:bg-dm-surface-high/50`}>
                    <span className="text-lg font-bold">{opt.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xl font-bold text-slate-800 dark:text-dm-on-surface block" htmlFor="description">
              Descriere
            </label>
            <textarea
              className="w-full p-6 text-xl rounded-xl border-2 border-slate-200 dark:border-dm-surface-bright/15 bg-white dark:bg-dm-surface focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 resize-none"
              id="description"
              name="description"
              placeholder="Descrieți problema cât mai detaliat..."
              rows={5}
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6 pb-20">
            <button
              className="flex-1 h-16 bg-primary hover:bg-primary/90 text-white rounded-xl text-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <Send size={20} />
              )}
              <span>{loading ? 'Se trimite...' : 'Trimite Tichet'}</span>
            </button>
            <button
              className="sm:w-1/3 h-16 bg-slate-200 hover:bg-slate-300 dark:bg-dm-surface-high dark:hover:bg-dm-surface-bright text-slate-700 dark:text-dm-on-surface rounded-xl text-xl font-bold transition-all"
              type="button"
              onClick={() => router.back()}
            >
              Anulează
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
