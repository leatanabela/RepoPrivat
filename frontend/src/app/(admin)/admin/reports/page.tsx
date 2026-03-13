'use client';

import { useEffect, useState } from 'react';
import { getAnalytics, getAllTickets } from '@/lib/actions/admin.actions';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatCardSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton';
import { formatRelativeDate } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { Analytics, Ticket } from '@/lib/types';
import toast from 'react-hot-toast';

export default function AdminReportsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [analyticsData, ticketsData] = await Promise.all([
          getAnalytics(),
          getAllTickets({ limit: 10 }),
        ]);
        setAnalytics(analyticsData);
        setRecentTickets(ticketsData.tickets);
      } catch {
        toast.error('Eroare la încărcarea rapoartelor');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const resolutionRate = analytics
    ? analytics.totalTickets > 0
      ? Math.round((analytics.resolvedTickets / analytics.totalTickets) * 100)
      : 0
    : 0;

  return (
    <div className="max-w-7xl mx-auto w-full p-6 md:p-10">
      <div className="mb-10">
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-2">Rapoarte și Analitice</h2>
        <p className="text-xl text-slate-600 dark:text-slate-400">Monitorizarea performanței și a solicitărilor.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {!analytics ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-lg font-medium text-slate-500 dark:text-slate-400 mb-1">Total Solicitări</p>
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold text-slate-900 dark:text-white">{analytics.totalTickets.toLocaleString()}</p>
                <p className="text-green-600 font-bold text-lg mb-1 flex items-center">
                  <TrendingUp size={14} /> {analytics.totalUsers} utilizatori
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-lg font-medium text-slate-500 dark:text-slate-400 mb-1">Deschise / Rezolvate</p>
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold text-slate-900 dark:text-white">{analytics.openTickets} / {analytics.resolvedTickets}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-lg font-medium text-slate-500 dark:text-slate-400 mb-1">Rata de Rezolvare</p>
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold text-slate-900 dark:text-white">{resolutionRate}%</p>
                <p className="text-green-600 font-bold text-lg mb-1 flex items-center">
                  <TrendingUp size={14} />
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Documente procesate</h3>
              <p className="text-lg text-slate-500">
                {analytics?.processedDocuments || 0} din {analytics?.totalDocuments || 0}
              </p>
            </div>
          </div>
          <div className="flex-1 flex items-end justify-center h-48">
            {analytics && analytics.totalDocuments > 0 ? (
              <div className="w-full flex items-end justify-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-20 bg-primary rounded-t-lg"
                    style={{ height: `${(analytics.processedDocuments / analytics.totalDocuments) * 150}px` }}
                  />
                  <span className="text-sm font-bold text-slate-600">Procesate</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-20 bg-primary/20 rounded-t-lg"
                    style={{ height: `${((analytics.totalDocuments - analytics.processedDocuments) / analytics.totalDocuments) * 150}px` }}
                  />
                  <span className="text-sm font-bold text-slate-600">Neprocesate</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">Nu există documente.</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Sesiuni Chat AI</h3>
              <p className="text-lg text-slate-500">Total: {analytics?.totalChats || 0}</p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center h-48">
            <div className="text-center">
              <p className="text-6xl font-black text-primary">{analytics?.totalChats || 0}</p>
              <p className="text-slate-500 mt-2">conversații totale</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tickets Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Solicitări Recente</h3>
        </div>
        {loading ? (
          <TableSkeleton />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-300">ID</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-300">Utilizator</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-300">Subiect</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-300 text-right">Dată</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-6 text-sm font-medium text-slate-600">#{ticket.id.slice(0, 6)}</td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-900 dark:text-white">{ticket.profiles?.full_name || '—'}</td>
                    <td className="px-8 py-6 text-sm text-slate-600 dark:text-slate-400">{ticket.title}</td>
                    <td className="px-8 py-6">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-8 py-6 text-sm text-slate-500 text-right">{formatRelativeDate(ticket.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
