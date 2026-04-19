'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MessageSquare, History, Ticket, Settings, LogOut, Menu, X, Wrench, ChevronDown, Trash2, Bell, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { useNotificationStore } from '@/stores/notification-store';
import { signOut } from '@/lib/actions/auth.actions';
import { getChatSessions, deleteChatSession } from '@/lib/actions/chat.actions';
import { getTicketNotifications } from '@/lib/actions/ticket.actions';
import type { ChatSession } from '@/lib/types';
import toast from 'react-hot-toast';

const adminItems = [
  { href: '/mentenanta', label: 'Mentenanță', icon: Wrench },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user, isAdmin } = useAuthStore();
  const { currentSessionId, setCurrentSession, setMessages, reset } = useChatStore();
  const { setNotifications, markAsRead, unreadCount, isRead, visibleNotifications } = useNotificationStore();

  const [historicOpen, setHistoricOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notif popover on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [notifOpen]);

  // Load notifications on mount and every 60s
  useEffect(() => {
    async function loadNotifs() {
      try {
        const result = await getTicketNotifications();
        setNotifications(result.notifications);
      } catch { /* ignore */ }
    }
    loadNotifs();
    const interval = setInterval(loadNotifs, 60000);
    return () => clearInterval(interval);
  }, [setNotifications]);

  // Reload sessions every time the user opens the historic panel
  useEffect(() => {
    if (historicOpen) {
      loadSessions();
    }
  }, [historicOpen]);

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const data = await getChatSessions();
      setSessions(data);
    } catch {
      toast.error('Eroare la încărcarea conversațiilor');
    } finally {
      setLoadingSessions(false);
    }
  }

  function handleSelectSession(session: ChatSession) {
    setCurrentSession(session.id);
    setMessages([]);
    router.push('/chat');
  }

  async function handleDeleteSession(id: string) {
    try {
      await deleteChatSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (currentSessionId === id) {
        reset();
        router.push('/chat');
      }
      toast.success('Conversație ștearsă');
    } catch {
      toast.error('Eroare la ștergerea conversației');
    }
  }

  function handleNotifClick(notif: { id: string; ticket_id?: string }) {
    markAsRead(notif.id);
    setNotifOpen(false);
    if (sidebarOpen) toggleSidebar();
    const ticketId = notif.ticket_id || notif.id;
    router.push(`/tickets/${ticketId}`);
  }

  const badgeCount = unreadCount();

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white dark:bg-dm-surface-low rounded-xl shadow-md border border-slate-200 dark:border-dm-surface-bright/15 transition-colors duration-180 hover:bg-slate-50 dark:hover:bg-dm-surface-high"
        onClick={toggleSidebar}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-30 transition-opacity duration-200"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          'w-72 flex flex-col bg-white dark:bg-dm-surface-low border-r border-slate-200/80 dark:border-transparent fixed lg:static h-full z-40 transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-6 flex flex-col h-full justify-between">
          <div className="flex flex-col gap-8">
            {/* User profile — click to go to Dashboard */}
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-xl px-2 py-2 -mx-2 transition-colors duration-180 hover:bg-slate-50 dark:hover:bg-dm-surface-high"
            >
              <div className="size-10 rounded-full bg-primary/10 dark:bg-dm-primary/10 flex items-center justify-center text-primary dark:text-dm-primary font-bold text-sm">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="text-slate-900 dark:text-dm-on-surface text-sm font-semibold leading-none truncate">
                  {user?.full_name || 'Utilizator'}
                </h1>
                <p className="text-slate-500 dark:text-dm-on-surface-variant text-xs mt-1 truncate">
                  {user?.departments?.name || 'Management cont'}
                </p>
              </div>
            </Link>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-180 w-full',
                  notifOpen
                    ? 'bg-primary/10 text-primary dark:bg-dm-primary/10 dark:text-dm-primary'
                    : 'text-slate-600 dark:text-dm-on-surface-variant hover:bg-slate-50 dark:hover:bg-dm-surface-high'
                )}
              >
                <div className="relative shrink-0 size-5 flex items-center justify-center">
                  <Bell size={20} />
                  {badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 size-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium">Notificări</span>
              </button>
              {notifOpen && (
                <div className="absolute left-full top-0 ml-2 w-72 bg-white dark:bg-dm-surface-low rounded-xl border border-slate-200/80 dark:border-dm-surface-bright/15 shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-dm-surface-high flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-800 dark:text-dm-on-surface">Notificări</p>
                    <Link
                      href="/notifications"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-medium text-primary dark:text-dm-primary hover:underline"
                    >
                      Vezi tot
                    </Link>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {visibleNotifications().length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-dm-on-surface-variant py-6 text-center">Nicio notificare</p>
                    ) : (
                      visibleNotifications().map((n) => {
                        const read = isRead(n.id);
                        return (
                          <div
                            key={n.id}
                            className={cn(
                              'px-4 py-3 text-xs hover:bg-slate-50 dark:hover:bg-dm-surface-high cursor-pointer transition-colors duration-180 border-b border-slate-50 dark:border-dm-surface-high/50 last:border-b-0 flex items-start gap-2.5',
                              read
                                ? 'text-slate-400 dark:text-dm-on-surface-variant/60'
                                : 'text-slate-600 dark:text-dm-on-surface-variant bg-primary/[0.03] dark:bg-dm-primary/[0.03]'
                            )}
                            onClick={() => handleNotifClick(n)}
                          >
                            {!read && (
                              <span className="size-2 rounded-full bg-primary dark:bg-dm-primary shrink-0 mt-1.5" />
                            )}
                            <div className={cn('flex flex-col min-w-0', read && 'ml-[18px]')}>
                              <p className={cn('truncate', !read && 'font-semibold text-slate-700 dark:text-dm-on-surface')}>
                                {n.message}
                              </p>
                              <p className="text-slate-400 dark:text-dm-on-surface-variant mt-0.5">
                                {new Date(n.created_at).toLocaleDateString('ro-RO', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <nav className="flex flex-col gap-0.5">
              {/* Asistent AI */}
              <button
                onClick={() => {
                  reset();
                  router.push('/chat');
                }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-180 w-full',
                  pathname.startsWith('/chat')
                    ? 'bg-primary/10 text-primary dark:bg-dm-primary/10 dark:text-dm-primary font-semibold'
                    : 'text-slate-600 dark:text-dm-on-surface-variant hover:bg-slate-50 dark:hover:bg-dm-surface-high'
                )}
              >
                <MessageSquare size={20} />
                <span className="text-sm font-medium">Asistent AI</span>
              </button>

              {/* Istoric Conversații - expandable */}
              <button
                onClick={() => {
                  setHistoricOpen(!historicOpen);
                }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-180 w-full',
                  historicOpen
                    ? 'bg-primary/10 text-primary dark:bg-dm-primary/10 dark:text-dm-primary'
                    : 'text-slate-600 dark:text-dm-on-surface-variant hover:bg-slate-50 dark:hover:bg-dm-surface-high'
                )}
              >
                <History size={20} />
                <span className="text-sm font-medium flex-1 text-left">Istoric Conversații</span>
              </button>

              {/* Session list */}
              {historicOpen && (
                <div className="ml-3 pl-4 border-l-2 border-slate-100 dark:border-dm-surface-high flex flex-col gap-0.5 max-h-48 overflow-y-auto py-1">
                  {loadingSessions ? (
                    <div className="py-3 flex justify-center">
                      <div className="size-4 border-2 border-primary/30 dark:border-dm-primary/30 border-t-primary dark:border-t-dm-primary rounded-full animate-spin" />
                    </div>
                  ) : sessions.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-dm-on-surface-variant py-2 px-2">
                      Nicio conversație
                    </p>
                  ) : (
                    sessions.filter((s) => s.title && s.title !== 'Conversație nouă' && !/^\d{2}\.\d{2}\.\d{4}/.test(s.title)).map((session) => (
                      <div
                        key={session.id}
                        className="group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-xs text-slate-600 dark:text-dm-on-surface-variant hover:bg-slate-50 dark:hover:bg-dm-surface-high transition-colors duration-180"
                        onClick={() => handleSelectSession(session)}
                        title={session.title && session.title !== 'Conversație nouă' ? session.title : 'Conversație fără titlu'}
                      >
                        <span className="truncate flex-1">
                          {session.title && session.title !== 'Conversație nouă'
                            ? session.title
                            : 'Conversație fără titlu'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(session.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all duration-180 shrink-0 p-0.5 rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Rest of nav */}
              <Link
                href="/tickets"
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-180',
                  pathname.startsWith('/tickets')
                    ? 'bg-primary/10 text-primary dark:bg-dm-primary/10 dark:text-dm-primary font-semibold'
                    : 'text-slate-600 dark:text-dm-on-surface-variant hover:bg-slate-50 dark:hover:bg-dm-surface-high'
                )}
              >
                <Ticket size={20} />
                <span className="text-sm font-medium">Tichete</span>
              </Link>

              <Link
                href="/faq"
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-180',
                  pathname.startsWith('/faq')
                    ? 'bg-primary/10 text-primary dark:bg-dm-primary/10 dark:text-dm-primary font-semibold'
                    : 'text-slate-600 dark:text-dm-on-surface-variant hover:bg-slate-50 dark:hover:bg-dm-surface-high'
                )}
              >
                <HelpCircle size={20} />
                <span className="text-sm font-medium">Întrebări Frecvente</span>
              </Link>

              <Link
                href="/settings"
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-180',
                  pathname.startsWith('/settings')
                    ? 'bg-primary/10 text-primary dark:bg-dm-primary/10 dark:text-dm-primary font-semibold'
                    : 'text-slate-600 dark:text-dm-on-surface-variant hover:bg-slate-50 dark:hover:bg-dm-surface-high'
                )}
              >
                <Settings size={20} />
                <span className="text-sm font-medium">Setări</span>
              </Link>

              {isAdmin && (
                <>
                  <div className="my-3 border-t border-slate-100 dark:border-dm-surface-high" />
                  {adminItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-180',
                          isActive
                            ? 'bg-primary/10 text-primary dark:bg-dm-primary/10 dark:text-dm-primary font-semibold'
                            : 'text-slate-600 dark:text-dm-on-surface-variant hover:bg-slate-50 dark:hover:bg-dm-surface-high'
                        )}
                      >
                        <item.icon size={20} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </>
              )}
            </nav>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-dm-on-surface-variant hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all duration-180 w-full border-t border-slate-100 dark:border-dm-surface-high pt-6"
            >
              <LogOut size={20} />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
