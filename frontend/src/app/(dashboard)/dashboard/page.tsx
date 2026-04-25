'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, Ticket, FileText, ExternalLink, BarChart3, Clock, MessageSquare, ThumbsUp, ThumbsDown, Users, CheckCircle } from 'lucide-react';
import { getTicketNotifications } from '@/lib/actions/ticket.actions';
import { getTickets } from '@/lib/actions/ticket.actions';
import { getEmployees } from '@/lib/actions/employee.actions';
import { getDocuments } from '@/lib/actions/document.actions';
import { getAnalytics } from '@/lib/actions/admin.actions';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { Analytics } from '@/lib/types';

const QUESTION_PREFIXES = /^(buna ziua[,!]?\s*|salut[,!]?\s*|hei[,!]?\s*|hello[,!]?\s*|hi[,!]?\s*|hey[,!]?\s*)?(as vrea sa (stiu|știu|aflu|intreb|întreb)\s*|vreau sa (stiu|știu|aflu)\s*|imi (poti|poți) spune\s*|spune-mi\s*|ma intereseaza\s*|mă interesează\s*)?(cum (pot|as putea|aș putea|sa|să|se|este|e)\s*|care (este|sunt|e)\s*|ce (este|sunt|e|fel de|tip de|inseamna|însemnă)\s*|unde (pot|este|sunt|e|se|gasesc|găsesc)\s*|(cand|când) (pot|este|sunt|e|se)\s*|de ce (este|sunt|e|se|nu)\s*|cine (este|sunt|e|se)\s*|cat (costa|costă|este|e)\s*|câte?\s*)/i;

function summarizeQuestion(raw: string): string {
  let text = raw
    .replace(/[?!"""''„"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  text = text.replace(QUESTION_PREFIXES, '').trim();

  if (text.length === 0) return raw.slice(0, 60);

  return text.charAt(0).toUpperCase() + text.slice(1);
}

interface DashboardStats {
  pendingTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  totalDocuments: number;
  totalEmployees: number;
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuthStore();
  const router = useRouter();
  const { setNotifications, markAsRead, unreadCount, isRead, visibleNotifications } = useNotificationStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const promises: Promise<any>[] = [
          getTicketNotifications(),
          getDocuments({ page: 1, limit: 1 }),
        ];

        if (isAdmin) {
          promises.push(
            getTickets({ status: 'in_asteptare' as any, page: 1, limit: 1 }),
            getTickets({ status: 'in_lucru' as any, page: 1, limit: 1 }),
            getTickets({ status: 'rezolvat' as any, page: 1, limit: 1 }),
            getEmployees({ page: 1, limit: 1 }),
          );
        } else {
          promises.push(
            getTickets({ status: 'rezolvat' as any, page: 1, limit: 1 }),
          );
        }

        const results = await Promise.all(promises);
        setNotifications(results[0].notifications);

        if (isAdmin) {
          setStats({
            pendingTickets: results[2].total,
            inProgressTickets: results[3].total,
            resolvedTickets: results[4].total,
            totalDocuments: results[1].total,
            totalEmployees: results[5].total,
          });
        } else {
          setStats({
            pendingTickets: results[2].total,
            inProgressTickets: 0,
            resolvedTickets: 0,
            totalDocuments: results[1].total,
            totalEmployees: 0,
          });
        }
      } catch {
        setStats({ pendingTickets: 0, inProgressTickets: 0, resolvedTickets: 0, totalDocuments: 0, totalEmployees: 0 });
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [setNotifications, isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setAnalyticsLoading(false);
      return;
    }
    async function loadAnalytics() {
      try {
        const data = await getAnalytics();
        setAnalytics(data);
      } catch { /* ignore */ }
      setAnalyticsLoading(false);
    }
    loadAnalytics();
  }, [isAdmin]);

  function handleNotifClick(notif: { id: string; ticket_id?: string }) {
    markAsRead(notif.id);
    const ticketId = notif.ticket_id || notif.id;
    router.push(`/tickets/${ticketId}`);
  }

  const unread = unreadCount();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 lg:p-10 max-w-6xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-primary">
              Bun venit, {user?.full_name?.split(' ')[0] || 'Utilizator'}
            </h1>
            <p className="text-slate-500 mt-1">
              Iată un sumar al activității tale
            </p>
          </div>
          <a
            href="https://www.ilegis.ro/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary dark:text-dm-primary bg-primary/5 dark:bg-dm-primary/10 hover:bg-primary/10 dark:hover:bg-dm-primary/15 transition-all duration-180"
          >
            iLegis
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Stat cards — rândul 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Notificări */}
          <Link href="/notifications" className="block h-full">
            <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6 h-full cursor-pointer transition-all duration-180 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-600 dark:text-dm-on-surface-variant">Notificări necitite</p>
                <div className="size-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <Bell size={20} className="text-red-600 dark:text-red-400" />
                </div>
              </div>
              <p className="text-4xl font-black text-primary dark:text-dm-primary">
                {loading ? '—' : unread}
              </p>
            </div>
          </Link>

          {/* Total angajați */}
          {isAdmin ? (
            <Link href="/mentenanta?tab=angajati" className="block h-full">
              <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6 h-full cursor-pointer transition-all duration-180 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-600 dark:text-dm-on-surface-variant">Total angajați</p>
                  <div className="size-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                    <Users size={20} className="text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-4xl font-black text-primary dark:text-dm-primary">
                  {loading ? '—' : (stats?.totalEmployees ?? 0)}
                </p>
              </div>
            </Link>
          ) : (
            <Link href="/tickets?status=rezolvat" className="block h-full">
              <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6 h-full cursor-pointer transition-all duration-180 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-600 dark:text-dm-on-surface-variant">Tichete rezolvate</p>
                  <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <p className="text-4xl font-black text-primary dark:text-dm-primary">
                  {loading ? '—' : (stats?.pendingTickets ?? 0)}
                </p>
              </div>
            </Link>
          )}

          {/* Total documente */}
          <Link href={isAdmin ? '/mentenanta' : '/documents'} className="block h-full">
            <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6 h-full cursor-pointer transition-all duration-180 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-600 dark:text-dm-on-surface-variant">Total documente</p>
                <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <FileText size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-4xl font-black text-primary dark:text-dm-primary">
                {loading ? '—' : (stats?.totalDocuments ?? 0)}
              </p>
            </div>
          </Link>
        </div>

        {/* Stat cards — rândul 2 (doar admin) */}
        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
            {/* Tichete în așteptare */}
            <Link href="/tickets?status=in_asteptare" className="block h-full">
              <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6 h-full cursor-pointer transition-all duration-180 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-600 dark:text-dm-on-surface-variant">Tichete în așteptare</p>
                  <div className="size-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                    <Ticket size={20} className="text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <p className="text-4xl font-black text-primary dark:text-dm-primary">
                  {loading ? '—' : (stats?.pendingTickets ?? 0)}
                </p>
              </div>
            </Link>

            {/* Tichete în lucru */}
            <Link href="/tickets?status=in_lucru" className="block h-full">
              <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6 h-full cursor-pointer transition-all duration-180 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-600 dark:text-dm-on-surface-variant">Tichete în lucru</p>
                  <div className="size-10 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
                    <Clock size={20} className="text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
                <p className="text-4xl font-black text-primary dark:text-dm-primary">
                  {loading ? '—' : (stats?.inProgressTickets ?? 0)}
                </p>
              </div>
            </Link>

            {/* Tichete rezolvate */}
            <Link href="/tickets?status=rezolvat" className="block h-full">
              <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6 h-full cursor-pointer transition-all duration-180 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-600 dark:text-dm-on-surface-variant">Tichete rezolvate</p>
                  <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <p className="text-4xl font-black text-primary dark:text-dm-primary">
                  {loading ? '—' : (stats?.resolvedTickets ?? 0)}
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* Recent notifications section */}
        <div className="mt-8 bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-dm-on-surface">
              Notificări Recente
            </h2>
            <Link
              href="/notifications"
              className="text-xs font-medium text-primary dark:text-dm-primary hover:underline"
            >
              Vezi tot
            </Link>
          </div>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-dm-surface-high/20">
                  <div className="size-8 rounded-lg bg-slate-200 dark:bg-dm-surface-bright/30 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-200 dark:bg-dm-surface-bright/30 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-100 dark:bg-dm-surface-bright/20 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleNotifications().length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-dm-on-surface-variant">
              <Bell size={32} className="mb-2 opacity-40" />
              <p className="text-sm font-medium">Nicio notificare nouă</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {visibleNotifications().slice(0, 5).map((n) => {
                const read = isRead(n.id);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors duration-180 border',
                      read
                        ? 'border-slate-100 dark:border-dm-surface-bright/10 hover:bg-slate-50 dark:hover:bg-dm-surface-high'
                        : 'border-primary/10 dark:border-dm-primary/10 bg-primary/[0.03] dark:bg-dm-primary/[0.03] hover:bg-primary/[0.06] dark:hover:bg-dm-primary/[0.06]'
                    )}
                  >
                    {!read && (
                      <span className="size-2.5 rounded-full bg-primary dark:bg-dm-primary shrink-0" />
                    )}
                    <div className="size-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                      <Bell size={14} className="text-red-600 dark:text-red-400" />
                    </div>
                    <div className={cn('flex flex-col min-w-0 flex-1', read && 'ml-[2px]')}>
                      <span className={cn(
                        'text-sm truncate',
                        read
                          ? 'text-slate-500 dark:text-dm-on-surface-variant'
                          : 'font-semibold text-slate-700 dark:text-dm-on-surface'
                      )}>
                        {n.message}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-dm-on-surface-variant">
                        {new Date(n.created_at).toLocaleDateString('ro-RO', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Statistici — doar admin */}
        {isAdmin && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Distribuție pe Departamente */}
            <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-dm-on-surface mb-5">
                Distribuția Tichetelor pe Departamente
              </h3>
              {analyticsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse space-y-1.5">
                      <div className="h-3 bg-slate-200 dark:bg-dm-surface-bright/30 rounded w-1/3" />
                      <div className="h-6 bg-slate-100 dark:bg-dm-surface-bright/20 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : !analytics?.departmentDistribution?.length ? (
                <div className="h-48 flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-dm-surface-high border border-dashed border-slate-200 dark:border-dm-surface-bright/20 gap-2">
                  <BarChart3 size={32} className="text-slate-300 dark:text-dm-surface-bright" />
                  <p className="text-sm font-medium text-slate-500 dark:text-dm-on-surface-variant">Niciun tichet înregistrat</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.departmentDistribution.map((dept) => {
                    const max = analytics.departmentDistribution[0].count;
                    const pct = max > 0 ? (dept.count / max) * 100 : 0;
                    return (
                      <div key={dept.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700 dark:text-dm-on-surface">{dept.name}</span>
                          <span className="text-sm font-bold text-slate-500 dark:text-dm-on-surface-variant">{dept.count}</span>
                        </div>
                        <div className="h-6 bg-slate-100 dark:bg-dm-surface-high rounded-lg overflow-hidden">
                          <div
                            className="h-full bg-primary/80 dark:bg-dm-primary/60 rounded-lg transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Timp mediu de rezolvare */}
            <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-dm-on-surface mb-5">
                Timp mediu de rezolvare
              </h3>
              {analyticsLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="animate-pulse size-32 rounded-full bg-slate-100 dark:bg-dm-surface-bright/20" />
                </div>
              ) : analytics?.avgResolutionHours == null ? (
                <div className="h-48 flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-dm-surface-high border border-dashed border-slate-200 dark:border-dm-surface-bright/20 gap-2">
                  <Clock size={32} className="text-slate-300 dark:text-dm-surface-bright" />
                  <p className="text-sm font-medium text-slate-500 dark:text-dm-on-surface-variant">Niciun tichet rezolvat încă</p>
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center">
                  <div className="relative size-36 flex items-center justify-center">
                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-dm-surface-high" />
                      <circle
                        cx="50" cy="50" r="42" fill="none" strokeWidth="8"
                        strokeLinecap="round"
                        className="text-emerald-500 dark:text-emerald-400"
                        stroke="currentColor"
                        strokeDasharray={`${Math.min((analytics.avgResolutionHours / 72) * 264, 264)} 264`}
                      />
                    </svg>
                    <div className="text-center z-10">
                      <p className="text-3xl font-black text-slate-800 dark:text-dm-on-surface">
                        {analytics.avgResolutionHours < 1
                          ? `${Math.round(analytics.avgResolutionHours * 60)}m`
                          : analytics.avgResolutionHours < 24
                            ? `${analytics.avgResolutionHours}h`
                            : `${Math.round(analytics.avgResolutionHours / 24 * 10) / 10}z`}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-dm-on-surface-variant font-medium">
                        {analytics.avgResolutionHours < 1 ? 'minute' : analytics.avgResolutionHours < 24 ? 'ore' : 'zile'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-dm-on-surface-variant mt-3">
                    Bazat pe {analytics.resolvedTickets} tichet{analytics.resolvedTickets !== 1 ? 'e' : ''} rezolvat{analytics.resolvedTickets !== 1 ? 'e' : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Evaluarea răspunsurilor Asistentului AI */}
            <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6 lg:col-span-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-dm-on-surface mb-5">
                Evaluarea răspunsurilor Asistentului AI
              </h3>
              {analyticsLoading ? (
                <div className="animate-pulse h-24 bg-slate-100 dark:bg-dm-surface-bright/20 rounded-xl" />
              ) : !analytics || ((analytics.positiveFeedback ?? 0) + (analytics.negativeFeedback ?? 0)) === 0 ? (
                <div className="h-24 flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-dm-surface-high border border-dashed border-slate-200 dark:border-dm-surface-bright/20 gap-2">
                  <ThumbsUp size={24} className="text-slate-300 dark:text-dm-surface-bright" />
                  <p className="text-sm font-medium text-slate-500 dark:text-dm-on-surface-variant">Niciun feedback încă</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                    <div className="size-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                      <ThumbsUp size={24} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{analytics.positiveFeedback ?? 0}</p>
                      <p className="text-xs font-semibold text-emerald-700/80 dark:text-emerald-400/80">Răspunsuri utile</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                    <div className="size-12 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                      <ThumbsDown size={24} className="text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-3xl font-black text-red-700 dark:text-red-300">{analytics.negativeFeedback ?? 0}</p>
                      <p className="text-xs font-semibold text-red-700/80 dark:text-red-400/80">Răspunsuri greșite</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                    <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <BarChart3 size={24} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-3xl font-black text-blue-700 dark:text-blue-300">{analytics.satisfactionRate ?? 0}%</p>
                      <p className="text-xs font-semibold text-blue-700/80 dark:text-blue-400/80">Rata de satisfacție</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Întrebări Frecvente */}
            <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6 lg:col-span-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-dm-on-surface mb-5">
                Întrebări Frecvente
              </h3>
              {analyticsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-dm-surface-high/20">
                      <div className="size-8 rounded-lg bg-slate-200 dark:bg-dm-surface-bright/30 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-slate-200 dark:bg-dm-surface-bright/30 rounded w-3/4" />
                        <div className="h-2.5 bg-slate-100 dark:bg-dm-surface-bright/20 rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !analytics?.frequentQuestions?.length ? (
                <div className="h-36 flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-dm-surface-high border border-dashed border-slate-200 dark:border-dm-surface-bright/20 gap-2">
                  <MessageSquare size={32} className="text-slate-300 dark:text-dm-surface-bright" />
                  <p className="text-sm font-medium text-slate-500 dark:text-dm-on-surface-variant">Nicio conversație încă</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {analytics.frequentQuestions.map((q, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-dm-surface-high/30 border border-slate-100 dark:border-dm-surface-bright/10"
                    >
                      <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                        <MessageSquare size={14} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-dm-on-surface flex-1 min-w-0 truncate">{summarizeQuestion(q.content)}</p>
                      <span className="shrink-0 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs font-bold text-blue-600 dark:text-blue-400">
                        {q.count}x
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
