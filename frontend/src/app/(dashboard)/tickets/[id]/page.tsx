'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTicketById, getTicketMessages, addTicketMessage } from '@/lib/actions/ticket.actions';
import { adminUpdateTicketStatus } from '@/lib/actions/admin.actions';
import { StatusBadge } from '@/components/ui/status-badge';
import { PriorityBadge } from '@/components/ui/priority-badge';
import { formatDateTime, formatRelativeDate } from '@/lib/utils';
import { ArrowLeft, Send, User } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { STATUS_LABELS } from '@/lib/constants';
import type { Ticket, TicketMessage, TicketStatus } from '@/lib/types';
import toast from 'react-hot-toast';

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAdmin } = useAuthStore();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadTicket();
  }, [params.id]);

  async function loadTicket() {
    setLoading(true);
    const [ticketData, messagesData] = await Promise.all([
      getTicketById(params.id as string),
      getTicketMessages(params.id as string),
    ]);
    setTicket(ticketData);
    setMessages(messagesData);
    setLoading(false);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const result = await addTicketMessage(params.id as string, newMessage);
    setSending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setMessages([...messages, result.message]);
    setNewMessage('');
  }

  async function handleStatusChange(status: TicketStatus) {
    const result = await adminUpdateTicketStatus(params.id as string, status);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setTicket((t) => t ? { ...t, status } : t);
    toast.success(`Status actualizat: ${STATUS_LABELS[status]}`);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">Tichetul nu a fost gasit.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 lg:p-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Inapoi</span>
        </button>

        {/* Ticket header */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{ticket.title}</h1>
              <p className="text-sm text-slate-400 mt-1">
                #{ticket.id.slice(0, 8)} &bull; Creat {formatRelativeDate(ticket.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
          </div>

          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{ticket.description}</p>

          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-500">
            <span>Departament: <strong>{ticket.departments?.name || '\u2014'}</strong></span>
            <span>Creat de: <strong>{ticket.profiles?.full_name || '\u2014'}</strong></span>
            {ticket.assigned?.full_name && (
              <span>Atribuit: <strong>{ticket.assigned.full_name}</strong></span>
            )}
          </div>

          {/* Admin status change */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Schimbă status</p>
              <div className="flex gap-2 flex-wrap">
                {(['atribuit', 'in_lucru', 'asteptare_utilizator', 'rezolvat', 'inchis'] as TicketStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={ticket.status === s}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-primary/5 hover:border-primary/30 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Mesaje ({messages.length})</h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {messages.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                Nu exista mesaje inca. Trimite primul mesaj.
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User size={16} className="text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {msg.profiles?.full_name || 'Utilizator'}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">
                      {formatDateTime(msg.created_at)}
                    </span>
                  </div>
                  {msg.is_internal && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Intern</span>
                  )}
                </div>
                <p className="text-slate-700 dark:text-slate-300 pl-11 whitespace-pre-wrap">{msg.message}</p>
              </div>
            ))}
          </div>

          {/* New message form */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
            <input
              className="flex-1 h-12 px-4 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 outline-none"
              placeholder="Scrie un mesaj..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="h-12 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={16} />
              <span className="hidden sm:inline">Trimite</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
