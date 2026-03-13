'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createTicket, getCategories, getDepartments } from '@/lib/actions/ticket.actions';
import { Send } from 'lucide-react';
import type { TicketPriority, Department, TicketCategory } from '@/lib/types';
import { PRIORITY_LABELS } from '@/lib/constants';
import toast from 'react-hot-toast';

const priorityOptions: Array<{ value: TicketPriority; label: string; color: string }> = [
  { value: 'low', label: 'Mica', color: 'peer-checked:border-green-600 peer-checked:bg-green-50 dark:peer-checked:bg-green-900/20 peer-checked:text-green-700' },
  { value: 'medium', label: 'Medie', color: 'peer-checked:border-orange-500 peer-checked:bg-orange-50 dark:peer-checked:bg-orange-900/20 peer-checked:text-orange-700' },
  { value: 'high', label: 'Mare', color: 'peer-checked:border-red-600 peer-checked:bg-red-50 dark:peer-checked:bg-red-900/20 peer-checked:text-red-700' },
];

export default function NewTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [selectedDept, setSelectedDept] = useState('');

  useEffect(() => {
    getDepartments().then(setDepartments);
    getCategories().then(setCategories);
  }, []);

  const filteredCategories = selectedDept
    ? categories.filter((c) => c.department_id === selectedDept)
    : categories;

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    formData.set('useAi', 'true');
    const result = await createTicket(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.aiSuggestions) {
      toast.success('Tichet creat! AI a sugerat clasificarea automata.');
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
            Sesizare Noua
          </h2>
          <p className="text-xl text-slate-500 dark:text-slate-400">
            Te rugam sa completezi formularul de mai jos pentru asistenta tehnica.
          </p>
        </div>

        <form action={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="text-xl font-bold text-slate-800 dark:text-slate-200 block" htmlFor="title">
              Subiect
            </label>
            <input
              className="w-full h-16 px-6 text-xl rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400"
              id="title"
              name="title"
              placeholder="Ex: Eroare conectare imprimanta"
              type="text"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-xl font-bold text-slate-800 dark:text-slate-200 block" htmlFor="departmentId">
              Departament
            </label>
            <select
              className="w-full h-16 px-6 text-xl rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 appearance-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
              id="departmentId"
              name="departmentId"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="">Alegeti un departament...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {filteredCategories.length > 0 && (
            <div className="space-y-3">
              <label className="text-xl font-bold text-slate-800 dark:text-slate-200 block" htmlFor="categoryId">
                Categorie
              </label>
              <select
                className="w-full h-16 px-6 text-xl rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 appearance-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                id="categoryId"
                name="categoryId"
              >
                <option value="">Alegeti o categorie...</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">Urgenta</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {priorityOptions.map((opt) => (
                <label key={opt.value} className="relative flex items-center cursor-pointer">
                  <input
                    className="peer sr-only"
                    name="priority"
                    type="radio"
                    value={opt.value}
                    defaultChecked={opt.value === 'medium'}
                  />
                  <div className={`w-full py-5 px-6 text-center rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 ${opt.color} transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50`}>
                    <span className="text-lg font-bold">{opt.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xl font-bold text-slate-800 dark:text-slate-200 block" htmlFor="description">
              Descriere
            </label>
            <textarea
              className="w-full p-6 text-xl rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 resize-none"
              id="description"
              name="description"
              placeholder="Descrieti problema cat mai detaliat..."
              rows={5}
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6 pb-20">
            <button
              className="flex-1 h-16 bg-primary hover:bg-primary/90 text-white rounded-xl text-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              <Send size={20} />
              {loading ? 'Se trimite...' : 'Trimite Tichet'}
            </button>
            <button
              className="sm:w-1/3 h-16 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xl font-bold transition-all"
              type="button"
              onClick={() => router.back()}
            >
              Anuleaza
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
