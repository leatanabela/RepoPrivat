'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import { getTicketNotifications } from '@/lib/actions/ticket.actions';
import { useNotificationStore } from '@/stores/notification-store';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, setNotifications, markAsRead, isRead, unreadCount, dismissNotification, dismissAll, visibleNotifications } = useNotificationStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await getTicketNotifications();
        setNotifications(result.notifications);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [setNotifications]);

  function handleClick(id: string) {
    markAsRead(id);
    router.push(`/tickets/${id}`);
  }

  function markAllAsRead() {
    notifications.forEach((n) => markAsRead(n.id));
  }

  const visible = visibleNotifications();
  const unread = unreadCount();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 lg:p-10 max-w-4xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-primary">
              Notificări
            </h1>
            <p className="text-slate-500 mt-1">
              {unread > 0
                ? `Ai ${unread} ${unread === 1 ? 'notificare necitită' : 'notificări necitite'}`
                : 'Toate notificările au fost citite'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary dark:text-dm-primary hover:bg-primary/5 dark:hover:bg-dm-primary/5 rounded-lg transition-colors duration-180"
              >
                <CheckCheck size={16} />
                Marchează toate ca citite
              </button>
            )}
            {visible.length > 0 && (
              <button
                onClick={dismissAll}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-180"
              >
                <Trash2 size={16} />
                Șterge toate
              </button>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 overflow-hidden">
          {loading ? (
            <div className="flex flex-col">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 px-6 py-4 border-b border-slate-50 dark:border-dm-surface-high/50 last:border-b-0">
                  <div className="size-3 rounded-full bg-slate-200 dark:bg-dm-surface-bright/30 shrink-0" />
                  <div className="size-9 rounded-lg bg-slate-200 dark:bg-dm-surface-bright/30 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-200 dark:bg-dm-surface-bright/30 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-100 dark:bg-dm-surface-bright/20 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-dm-on-surface-variant">
              <Bell size={40} className="mb-3 opacity-30" />
              <p className="text-lg font-medium">Nicio notificare</p>
              <p className="text-sm mt-1">Vei primi notificări când apar tichete noi sau sunt actualizate.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {visible.map((n) => {
                const read = isRead(n.id);
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'group flex items-center gap-3 px-6 py-4 transition-colors duration-180 border-b border-slate-50 dark:border-dm-surface-high/50 last:border-b-0',
                      read
                        ? 'hover:bg-slate-50 dark:hover:bg-dm-surface-high'
                        : 'bg-primary/[0.03] dark:bg-dm-primary/[0.03] hover:bg-primary/[0.06] dark:hover:bg-dm-primary/[0.06]'
                    )}
                  >
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleClick(n.id)}
                    >
                      <span className={cn(
                        'size-2.5 rounded-full shrink-0',
                        read ? 'bg-transparent' : 'bg-primary dark:bg-dm-primary'
                      )} />
                      <div className="size-9 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                        <Bell size={16} className="text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className={cn(
                          'text-sm',
                          read
                            ? 'text-slate-500 dark:text-dm-on-surface-variant'
                            : 'font-semibold text-slate-800 dark:text-dm-on-surface'
                        )}>
                          {n.message}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-dm-on-surface-variant mt-0.5">
                          {new Date(n.created_at).toLocaleDateString('ro-RO', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(n.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-180 shrink-0"
                      title="Șterge notificarea"
                    >
                      <X size={16} />
                    </button>
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
