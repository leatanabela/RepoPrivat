'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getTickets } from '@/lib/actions/ticket.actions';
import { getDepartments } from '@/lib/actions/ticket.actions';
import { StatusBadge } from '@/components/ui/status-badge';
import { PriorityBadge } from '@/components/ui/priority-badge';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton } from '@/components/ui/loading-skeleton';
import { formatDate } from '@/lib/utils';
import { Plus } from 'lucide-react';
import type { Ticket, TicketStatus, Department } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';
import toast from 'react-hot-toast';

const statusFilters: Array<{ value: TicketStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Toate' },
  { value: 'nou', label: 'Nou' },
  { value: 'in_lucru', label: 'În lucru' },
  { value: 'rezolvat', label: 'Rezolvat' },
  { value: 'inchis', label: 'Închis' },
];

export default function TicketsPage() {
  const { isAdmin } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const limit = 10;

  useEffect(() => {
    if (isAdmin) getDepartments().then(setDepartments);
  }, [isAdmin]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, unknown> = { page, limit };
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (departmentFilter) filters.departmentId = departmentFilter;
      const result = await getTickets(filters as any);
      setTickets(result.tickets);
      setTotal(result.total);
    } catch {
      toast.error('Eroare la încărcarea tichetelor');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, departmentFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 lg:p-10 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-primary">
              {isAdmin ? 'Toate Tichetele' : 'Tichetele Mele'}
            </h1>
            <p className="text-slate-500 mt-1">
              {isAdmin
                ? 'Gestionează și monitorizează toate solicitările'
                : 'Urmărește starea cererilor tale de asistență'}
            </p>
          </div>
          {!isAdmin && (
            <Link
              href="/tickets/new"
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
            >
              <Plus size={16} />
              Creare Tichet
            </Link>
          )}
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Status filter tabs */}
          <div className="flex-1 border-b border-primary/10">
            <div className="flex gap-6 overflow-x-auto">
              {statusFilters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setStatusFilter(f.value); setPage(1); }}
                  className={`border-b-2 pb-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    statusFilter === f.value
                      ? 'border-primary text-primary font-bold'
                      : 'border-transparent text-slate-500 hover:text-primary'
                  }`}
                >
                  {f.label}{statusFilter === f.value ? ` (${total})` : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Department filter — admin only */}
          {isAdmin && departments.length > 0 && (
            <select
              className="h-10 px-3 text-sm border border-slate-200 dark:border-dm-surface-bright/15 rounded-lg bg-white dark:bg-dm-surface focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              value={departmentFilter}
              onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
            >
              <option value="">Toate departamentele</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-dm-surface rounded-xl border border-primary/10 shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} />
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="text-lg font-medium">Nu există tichete</p>
              <p className="text-sm mt-1">
                {isAdmin ? 'Niciun tichet nu corespunde filtrelor selectate.' : 'Creează primul tău tichet pentru a primi asistență.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-primary/5 border-b border-primary/10">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 w-24">ID</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Subiect</th>
                    {isAdmin && (
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 w-40">Utilizator</th>
                    )}
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 w-32">Prioritate</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 w-40">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 w-40">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-6 py-5 text-sm font-medium text-slate-400">
                        #{ticket.id.slice(0, 6)}
                      </td>
                      <td className="px-6 py-5">
                        <Link href={`/tickets/${ticket.id}`} className="block">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900 dark:text-dm-on-surface hover:text-primary transition-colors">
                              {ticket.title}
                            </span>
                            <span className="text-xs text-slate-400">
                              {ticket.departments?.name || 'General'}
                            </span>
                          </div>
                        </Link>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-5 text-sm text-slate-500">
                          {ticket.profiles?.full_name || '—'}
                        </td>
                      )}
                      <td className="px-6 py-5">
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500">
                        {formatDate(ticket.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={total}
              limit={limit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
