'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getAnalytics, getAllTickets, assignTicketToAdmin } from '@/lib/actions/admin.actions';
import { StatusBadge } from '@/components/ui/status-badge';
import { Pagination } from '@/components/ui/pagination';
import { StatCardSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton';
import { formatRelativeDate } from '@/lib/utils';
import { Package, Clock, CheckCircle, TrendingUp, Plus, MoreHorizontal } from 'lucide-react';
import type { Analytics, Ticket, TicketStatus } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/constants';
import toast from 'react-hot-toast';

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const limit = 10;

  const loadData = useCallback(async () => {
    // Only show loading skeleton on first load, not on refreshes
    if (tickets.length === 0) setLoading(true);
    try {
      const [analyticsData, ticketsData] = await Promise.all([
        getAnalytics(),
        getAllTickets({ page, limit, status: statusFilter || undefined }),
      ]);
      if (analyticsData) setAnalytics(analyticsData);
      setTickets(ticketsData.tickets);
      setTotal(ticketsData.total);
    } catch {
      toast.error('Eroare la încărcarea datelor');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAssign(ticketId: string) {
    const result = await assignTicketToAdmin(ticketId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Tichet atribuit!');
    loadData();
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-dm-on-surface">Prezentare Generală</h2>
          <p className="text-sm text-slate-400">Monitorizarea activității curente</p>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {!analytics ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white dark:bg-dm-surface p-6 rounded-xl border border-primary/5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-medium text-slate-500">Total Tichete</p>
                <Package size={20} className="text-primary/40" />
              </div>
              <p className="text-3xl font-bold text-primary">{analytics.totalTickets}</p>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                <span>{analytics.totalUsers} utilizatori</span>
              </div>
            </div>

            <div className="bg-white dark:bg-dm-surface p-6 rounded-xl border border-primary/5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-medium text-slate-500">În lucru</p>
                <Clock size={20} className="text-amber-400/60" />
              </div>
              <p className="text-3xl font-bold text-primary">{analytics.inProgressTickets}</p>
              <p className="mt-2 text-[11px] text-slate-400">tichete deschise</p>
            </div>

            <div className="bg-white dark:bg-dm-surface p-6 rounded-xl border border-primary/5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-medium text-slate-500">Rezolvate</p>
                <CheckCircle size={20} className="text-emerald-400/60" />
              </div>
              <p className="text-3xl font-bold text-primary">{analytics.resolvedTickets}</p>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                <span>{analytics.totalDocuments} documente ({analytics.processedDocuments} procesate)</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tickets Table */}
      <div className="bg-white dark:bg-dm-surface rounded-xl border border-primary/5 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/5 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-dm-on-surface">Tichete Recente</h3>
          <select
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-transparent"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">Toate</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-primary/5">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Subiect</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Dată</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/50 dark:hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-400">#{ticket.id.slice(0, 6)}</td>
                    <td className="px-6 py-4">
                      <Link href={`/tickets/${ticket.id}`}>
                        <div className="text-sm font-medium text-slate-700 dark:text-dm-on-surface hover:text-primary transition-colors">
                          {ticket.title}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Utilizator: {ticket.profiles?.full_name || '—'}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatRelativeDate(ticket.created_at)}</td>
                    <td className="px-6 py-4">
                      {ticket.status === 'nou' && (
                        <button
                          onClick={() => handleAssign(ticket.id)}
                          className="text-xs text-primary font-medium hover:underline"
                        >
                          Preia
                        </button>
                      )}
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
