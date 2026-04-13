'use client';

import { useEffect, useState } from 'react';
import { Bell, Ticket, FileText } from 'lucide-react';
import { getTicketNotifications } from '@/lib/actions/ticket.actions';
import { getTickets } from '@/lib/actions/ticket.actions';
import { getDocuments } from '@/lib/actions/document.actions';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface DashboardStats {
  pendingTickets: number;
  totalDocuments: number;
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuthStore();
  const router = useRouter();
  const { notifications, setNotifications, markAsRead, unreadCount, isRead } = useNotificationStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [notifResult, ticketResult, docResult] = await Promise.all([
          getTicketNotifications(),
          getTickets({ status: (isAdmin ? 'in_asteptare' : 'rezolvat') as any, page: 1, limit: 1 }),
          getDocuments({ page: 1, limit: 1 }),
        ]);
        setNotifications(notifResult.notifications);
        setStats({
          pendingTickets: ticketResult.total,
          totalDocuments: docResult.total,
        });
      } catch {
        setStats({ pendingTickets: 0, totalDocuments: 0 });
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [setNotifications]);

  function handleNotifClick(id: string) {
    markAsRead(id);
    router.push(`/tickets/${id}`);
  }

  const unread = unreadCount();

  const cards = [
    {
      label: 'Notificări necitite',
      value: unread,
      icon: Bell,
      iconColor: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      href: '/notifications',
    },
    {
      label: isAdmin ? 'Tichete în așteptare' : 'Tichete rezolvate',
      value: stats?.pendingTickets,
      icon: Ticket,
      iconColor: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      href: isAdmin ? '/tickets?status=in_asteptare' : '/tickets?status=rezolvat',
    },
    {
      label: 'Total documente',
      value: stats?.totalDocuments,
      icon: FileText,
      iconColor: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      href: isAdmin ? '/mentenanta' : '/documents',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 lg:p-10 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-primary">
            Bun venit, {user?.full_name?.split(' ')[0] || 'Utilizator'}
          </h1>
          <p className="text-slate-500 mt-1">
            Iată un sumar al activității tale
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card) => {
            const cardBody = (
              <div
                key={card.label}
                className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6 cursor-pointer transition-all duration-180 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-600 dark:text-dm-on-surface-variant">
                    {card.label}
                  </p>
                  <div className={`size-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <card.icon size={20} className={card.iconColor} />
                  </div>
                </div>
                <p className="text-4xl font-black text-primary dark:text-dm-primary">
                  {loading ? '—' : (card.value ?? 0)}
                </p>
              </div>
            );

            if (card.href) {
              return (
                <Link key={card.label} href={card.href} className="block">
                  {cardBody}
                </Link>
              );
            }
            return <div key={card.label}>{cardBody}</div>;
          })}
        </div>

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
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-dm-on-surface-variant">
              <Bell size={32} className="mb-2 opacity-40" />
              <p className="text-sm font-medium">Nicio notificare nouă</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.slice(0, 5).map((n) => {
                const read = isRead(n.id);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n.id)}
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
      </div>
    </div>
  );
}
