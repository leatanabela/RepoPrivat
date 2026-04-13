'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTicketById, getTicketMessages, addTicketMessage, updateTicket, getDepartments, deleteTicket } from '@/lib/actions/ticket.actions';
import { adminUpdateTicketStatus } from '@/lib/actions/admin.actions';
import { StatusBadge } from '@/components/ui/status-badge';
import { PriorityBadge } from '@/components/ui/priority-badge';
import { formatDateTime, formatRelativeDate } from '@/lib/utils';
import { ArrowLeft, Send, User, Pencil, Check, X, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { STATUS_LABELS, PRIORITY_LABELS } from '@/lib/constants';
import type { Ticket, TicketMessage, TicketStatus, TicketPriority } from '@/lib/types';
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

  // Admin editing state
  const [editingDescription, setEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editingPriority, setEditingPriority] = useState(false);
  const [editPriority, setEditPriority] = useState<TicketPriority>('medie');
  const [editingDepartment, setEditingDepartment] = useState(false);
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

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

  async function handleDeleteTicket() {
    if (!confirm('Sigur doriți să ștergeți acest tichet? Acțiunea este ireversibilă.')) return;
    const result = await deleteTicket(params.id as string);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Tichet șters');
    router.push('/tickets');
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

  async function handleSaveField(field: 'description' | 'priority' | 'department_id') {
    if (!ticket) return;
    setSaving(true);

    const updates: Record<string, unknown> = {};
    if (field === 'description') updates.description = editDescription;
    if (field === 'priority') updates.priority = editPriority;
    if (field === 'department_id') updates.department_id = editDepartmentId || null;

    const result = await updateTicket(ticket.id, updates as Parameters<typeof updateTicket>[1]);
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    // Update local state
    if (field === 'description') {
      setTicket((t) => t ? { ...t, description: editDescription } : t);
      setEditingDescription(false);
    }
    if (field === 'priority') {
      setTicket((t) => t ? { ...t, priority: editPriority } : t);
      setEditingPriority(false);
    }
    if (field === 'department_id') {
      const dept = departments.find((d) => d.id === editDepartmentId);
      setTicket((t) => t ? {
        ...t,
        department_id: editDepartmentId || null,
        departments: dept ? { name: dept.name } : null,
      } : t);
      setEditingDepartment(false);
    }

    toast.success('Tichet actualizat');
  }

  async function startEditDepartment() {
    if (departments.length === 0) {
      const depts = await getDepartments();
      setDepartments(depts);
    }
    setEditDepartmentId(ticket?.department_id || '');
    setEditingDepartment(true);
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
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Înapoi</span>
          </button>
          {isAdmin && (
            <button
              onClick={handleDeleteTicket}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-180"
            >
              <Trash2 size={14} />
              Șterge Tichet
            </button>
          )}
        </div>

        {/* Ticket header */}
        <div className="bg-white dark:bg-dm-surface rounded-xl border border-slate-200 dark:border-dm-surface-high p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{ticket.title}</h1>
              <p className="text-sm text-slate-400 mt-1">
                #{ticket.id.slice(0, 8)} &bull; Creat {formatRelativeDate(ticket.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={ticket.status} />

              {/* Priority - editable for admin */}
              {isAdmin && editingPriority ? (
                <div className="flex items-center gap-1">
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TicketPriority)}
                    className="text-xs px-2 py-1 bg-slate-50 dark:bg-dm-surface-high border border-slate-200 dark:border-dm-surface-bright/15 rounded-lg outline-none"
                  >
                    {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleSaveField('priority')}
                    disabled={saving}
                    className="p-1 text-green-600 hover:text-green-700"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => setEditingPriority(false)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  className={isAdmin ? 'cursor-pointer' : ''}
                  onClick={() => {
                    if (!isAdmin) return;
                    setEditPriority(ticket.priority);
                    setEditingPriority(true);
                  }}
                >
                  <PriorityBadge priority={ticket.priority} />
                </div>
              )}
            </div>
          </div>

          {/* Description - editable for admin */}
          {isAdmin && editingDescription ? (
            <div className="space-y-2">
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={6}
                className="w-full bg-slate-50 dark:bg-dm-surface-high border border-slate-200 dark:border-dm-surface-bright/15 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveField('description')}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  <Check size={14} /> Salvează
                </button>
                <button
                  onClick={() => setEditingDescription(false)}
                  className="flex items-center gap-1 px-3 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-medium"
                >
                  <X size={14} /> Anulează
                </button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <p className="text-slate-700 dark:text-dm-on-surface whitespace-pre-wrap">{ticket.description}</p>
              {isAdmin && (
                <button
                  onClick={() => {
                    setEditDescription(ticket.description || '');
                    setEditingDescription(true);
                  }}
                  className="absolute top-0 right-0 p-1.5 text-slate-300 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-dm-surface-high text-sm text-slate-500">
            {/* Department - editable for admin */}
            <span>
              Departament:{' '}
              {isAdmin && editingDepartment ? (
                <span className="inline-flex items-center gap-1">
                  <select
                    value={editDepartmentId}
                    onChange={(e) => setEditDepartmentId(e.target.value)}
                    className="text-xs px-2 py-1 bg-slate-50 dark:bg-dm-surface-high border border-slate-200 dark:border-dm-surface-bright/15 rounded-lg outline-none font-semibold"
                  >
                    <option value="">-- Niciun departament --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleSaveField('department_id')}
                    disabled={saving}
                    className="p-1 text-green-600 hover:text-green-700"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => setEditingDepartment(false)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                </span>
              ) : (
                <strong
                  className={isAdmin ? 'cursor-pointer hover:text-primary transition-colors' : ''}
                  onClick={() => isAdmin && startEditDepartment()}
                >
                  {ticket.departments?.name || '\u2014'}
                  {isAdmin && <Pencil size={12} className="inline ml-1 opacity-0 group-hover:opacity-100" />}
                </strong>
              )}
            </span>
            <span>Creat de: <strong>{ticket.profiles?.full_name || '\u2014'}</strong></span>
            {ticket.assigned?.full_name && (
              <span>Atribuit: <strong>{ticket.assigned.full_name}</strong></span>
            )}
          </div>

          {/* Admin status change */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-dm-surface-high">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Schimbă status</p>
              <div className="flex gap-2 flex-wrap">
                {(['in_asteptare', 'in_lucru', 'rezolvat'] as TicketStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={ticket.status === s}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-dm-surface-bright/15 hover:bg-primary/5 hover:border-primary/30 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="bg-white dark:bg-dm-surface rounded-xl border border-slate-200 dark:border-dm-surface-high overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-dm-surface-high">
            <h3 className="font-semibold text-slate-800 dark:text-dm-on-surface">Mesaje ({messages.length})</h3>
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
                    <span className="text-sm font-semibold text-slate-900 dark:text-dm-on-surface">
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
                <p className="text-slate-700 dark:text-dm-on-surface pl-11 whitespace-pre-wrap">{msg.message}</p>
              </div>
            ))}
          </div>

          {/* New message form */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 dark:border-dm-surface-high flex gap-3">
            <input
              className="flex-1 h-12 px-4 bg-slate-50 dark:bg-dm-surface-high border-none rounded-lg focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 outline-none"
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
