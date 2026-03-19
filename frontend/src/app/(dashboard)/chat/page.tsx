'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { ChatMessage } from '@/components/chat/chat-message';
import { ChatInput } from '@/components/chat/chat-input';
import {
  createChatSession,
  getChatSessions,
  getChatMessages,
  saveUserMessage,
  saveAssistantMessage,
  deleteChatSession,
} from '@/lib/actions/chat.actions';
import { createTicketFromChat, getAiTicketSuggestions, getDepartments } from '@/lib/actions/ticket.actions';
import { Plus, Trash2, MessageSquare, TicketPlus, X, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatSkeleton } from '@/components/ui/loading-skeleton';
import { PRIORITY_LABELS } from '@/lib/constants';
import type { TicketPriority } from '@/lib/types';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const {
    sessions,
    currentSessionId,
    messages,
    streaming,
    streamingContent,
    setSessions,
    setCurrentSession,
    setMessages,
    addMessage,
    setStreaming,
    setStreamingContent,
    appendStreamingContent,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  // Track which assistant message IDs should show the "Create Ticket" button
  const [ticketableMessages, setTicketableMessages] = useState<Set<string>>(new Set());
  // Track the last user question for ticket creation
  const lastQuestionRef = useRef<string>('');
  // Track if current stream had no chunks
  const noChunksRef = useRef(false);
  // Ticket creation modal state
  const [ticketModal, setTicketModal] = useState<{
    messageId: string;
    question: string;
    aiResponse: string;
  } | null>(null);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
    priority: 'medie' as TicketPriority,
    departmentId: '' as string,
  });
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<{
    title?: string;
    priority?: string;
    department_id?: string;
    reasoning?: string;
  } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const data = await getChatSessions();
      setSessions(data);
      if (data.length > 0 && !currentSessionId) {
        selectSession(data[0].id);
      }
    } catch {
      toast.error('Eroare la încărcarea conversațiilor');
    }
  }

  async function selectSession(id: string) {
    setCurrentSession(id);
    try {
      const msgs = await getChatMessages(id);
      setMessages(msgs);
    } catch {
      toast.error('Eroare la încărcarea mesajelor');
    }
  }

  async function handleNewSession() {
    try {
      const session = await createChatSession();
      setSessions([session, ...sessions]);
      setCurrentSession(session.id);
      setMessages([]);
    } catch {
      toast.error('Eroare la crearea conversației');
    }
  }

  async function handleDeleteSession(id: string) {
    try {
      await deleteChatSession(id);
      const updated = sessions.filter((s) => s.id !== id);
      setSessions(updated);
      if (currentSessionId === id) {
        if (updated.length > 0) {
          selectSession(updated[0].id);
        } else {
          setCurrentSession(null);
          setMessages([]);
        }
      }
    } catch {
      toast.error('Eroare la ștergerea conversației');
    }
  }

  async function handleSend(message: string) {
    if (!currentSessionId) {
      // Create a new session first
      try {
        const session = await createChatSession();
        setSessions([session, ...sessions]);
        setCurrentSession(session.id);
        setMessages([]);
        await sendToSession(session.id, message);
      } catch {
        toast.error('Eroare la crearea conversației');
      }
      return;
    }

    await sendToSession(currentSessionId, message);
  }

  async function sendToSession(sessionId: string, message: string) {
    lastQuestionRef.current = message;
    noChunksRef.current = false;

    // Save user message
    try {
      const userMsg = await saveUserMessage(sessionId, message);
      addMessage(userMsg);
    } catch {
      toast.error('Eroare la trimiterea mesajului');
      return;
    }

    // Build chat history for context
    const history = [...messages, { role: 'user' as const, content: message }]
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    // Start streaming
    setStreaming(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: message,
          session_id: sessionId,
          chat_history: history,
        }),
      });

      if (!response.ok) throw new Error('Stream failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'metadata' && parsed.data) {
                  if (parsed.data.chunks_used === 0) {
                    noChunksRef.current = true;
                  }
                }
                if (parsed.type === 'token' && parsed.data) {
                  fullContent += parsed.data;
                  appendStreamingContent(parsed.data);
                }
                if (parsed.token) {
                  fullContent += parsed.token;
                  appendStreamingContent(parsed.token);
                }
                if (parsed.answer) {
                  fullContent = parsed.answer;
                }
              } catch {
                // Plain text token
                fullContent += data;
                appendStreamingContent(data);
              }
            }
          }
        }
      }

      // Save assistant message
      const assistantMsg = await saveAssistantMessage(sessionId, fullContent);
      addMessage(assistantMsg);

      // If no chunks were used OR AI response indicates it couldn't find info, mark as ticketable
      const couldNotAnswer = noChunksRef.current ||
        /nu am găsit|nu am gasit|nu s-au găsit|nu conțin|nu am mai multe informații/i.test(fullContent);
      if (couldNotAnswer) {
        setTicketableMessages((prev) => new Set(prev).add(assistantMsg.id));
      }

      // Refresh sessions to update title
      const updatedSessions = await getChatSessions();
      setSessions(updatedSessions);
    } catch {
      toast.error('Eroare la comunicarea cu asistentul AI');
    } finally {
      setStreaming(false);
      setStreamingContent('');
    }
  }

  async function openTicketModal(messageId: string, assistantContent: string) {
    setTicketModal({ messageId, question: lastQuestionRef.current, aiResponse: assistantContent });
    setTicketForm({ subject: lastQuestionRef.current, description: lastQuestionRef.current, priority: 'medie', departmentId: '' });
    setAiSuggestions(null);
    setModalLoading(true);

    try {
      const [depts, suggestions] = await Promise.all([
        getDepartments(),
        getAiTicketSuggestions(lastQuestionRef.current),
      ]);
      setDepartments(depts);
      if (suggestions) {
        setAiSuggestions(suggestions);
        const priorityMap: Record<string, TicketPriority> = {
          low: 'scazuta', medium: 'medie', high: 'ridicata', urgent: 'urgenta',
        };
        setTicketForm((prev) => ({
          ...prev,
          subject: suggestions.title || prev.subject,
          priority: priorityMap[suggestions.priority] || prev.priority,
          departmentId: suggestions.department_id || prev.departmentId,
        }));
      }
    } catch {
      // Continue without suggestions
    } finally {
      setModalLoading(false);
    }
  }

  async function handleSubmitTicket() {
    if (!ticketModal) return;
    setTicketSubmitting(true);

    try {
      const result = await createTicketFromChat(
        ticketForm.subject || ticketModal.question,
        ticketModal.aiResponse,
        ticketForm.description,
        ticketForm.priority,
        ticketForm.departmentId || null,
        aiSuggestions?.priority || null,
        aiSuggestions?.department_id || null,
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Tichet creat cu succes! Veți fi contactat de un administrator.');
      setTicketableMessages((prev) => {
        const next = new Set(prev);
        next.delete(ticketModal.messageId);
        return next;
      });
      setTicketModal(null);
    } catch {
      toast.error('Eroare la crearea tichetului');
    } finally {
      setTicketSubmitting(false);
    }
  }

  return (
    <>
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-background-dark shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Conversație Asistent AI
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewSession}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Conversație nouă</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Session list - collapsible */}
        {sessions.length > 0 && (
          <div className="w-64 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto hidden md:block">
            <div className="p-3 space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group transition-colors text-sm',
                    session.id === currentSessionId
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <MessageSquare size={14} className="shrink-0" />
                  <span
                    className="truncate flex-1"
                    onClick={() => selectSession(session.id)}
                  >
                    {session.title && session.title !== 'Conversație nouă'
                      ? session.title
                      : new Date(session.created_at).toLocaleString('ro-RO', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-8 py-10">
            <div className="max-w-3xl mx-auto flex flex-col gap-10">
              <div className="flex items-start gap-4">
                <div className="size-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  <MessageSquare size={18} className="text-white" />
                </div>
                <div className="flex flex-col gap-1.5 max-w-[85%]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                    Asistent AI
                  </span>
                  <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-2xl rounded-tl-none shadow-sm">
                    <p className="text-[17px] leading-relaxed text-slate-700 dark:text-slate-300">
                      Bună ziua! Sunt asistentul tău virtual. Cu ce te pot ajuta astăzi? Putem discuta despre tichete, setări sau alte informații tehnice.
                    </p>
                  </div>
                </div>
              </div>

              {messages.map((msg) => (
                <div key={msg.id}>
                  <ChatMessage role={msg.role} content={msg.content} />
                  {msg.role === 'assistant' && ticketableMessages.has(msg.id) && (
                    <div className="flex justify-center mt-4">
                      <div className="relative bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-5 w-full max-w-md shadow-sm">
                        <button
                          onClick={() => setTicketableMessages((prev) => { const next = new Set(prev); next.delete(msg.id); return next; })}
                          className="absolute top-3 right-3 text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors"
                        >
                          <X size={16} />
                        </button>
                        <div className="flex flex-col items-center text-center gap-2 pr-0">
                          <div className="size-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                            <TicketPlus size={20} className="text-primary" />
                          </div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Nu am găsit un răspuns
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Trimite întrebarea către un administrator pentru asistență.
                          </p>
                        </div>
                        <button
                          onClick={() => openTicketModal(msg.id, msg.content)}
                          className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-[#1e293b] dark:bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
                        >
                          <Send size={15} />
                          Creează Sesizare
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* AI Thinking Indicator */}
              {streaming && !streamingContent && (
                <div className="flex items-start gap-4">
                  <div className="size-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <MessageSquare size={18} className="text-white" />
                  </div>
                  <div className="flex flex-col gap-1.5 max-w-[85%]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      Asistent AI
                    </span>
                    <div className="bg-slate-100 dark:bg-slate-800 px-6 py-4 rounded-2xl rounded-tl-none shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="size-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="size-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {streaming && streamingContent && (
                <ChatMessage role="assistant" content={streamingContent} isStreaming />
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <ChatInput onSend={handleSend} disabled={streaming} />
        </div>
      </div>

      {/* Ticket Creation Modal — Stitch design */}
      {ticketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-[#f8fafc] dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-[540px] overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-8 pt-8 pb-1">
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Sesizare Nouă
              </h3>
              <p className="text-[15px] text-slate-500 dark:text-slate-400 mt-1.5">
                Te rugăm să completezi formularul de mai jos pentru asistență tehnică.
              </p>
            </div>

            <div className="px-8 py-6 space-y-6">
              {modalLoading ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Loader2 size={28} className="animate-spin text-primary" />
                  <p className="text-sm text-slate-500">AI analizează întrebarea...</p>
                </div>
              ) : (
                <>
                  {aiSuggestions?.reasoning && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3.5">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Sugestie AI</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">{aiSuggestions.reasoning}</p>
                    </div>
                  )}

                  {/* Subiect */}
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                      Subiect
                    </label>
                    <input
                      type="text"
                      value={ticketForm.subject || ticketModal.question}
                      onChange={(e) => setTicketForm((f) => ({ ...f, subject: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="Ex: Eroare conectare imprimantă"
                    />
                  </div>

                  {/* Categorie */}
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                      Categorie
                    </label>
                    <div className="relative">
                      <select
                        value={ticketForm.departmentId}
                        onChange={(e) => setTicketForm((f) => ({ ...f, departmentId: e.target.value }))}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none pr-10"
                      >
                        <option value="">Alegeți o categorie...</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <svg className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>

                  {/* Urgență */}
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2.5">
                      Urgență
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { value: 'scazuta' as TicketPriority, label: 'Mică' },
                        { value: 'medie' as TicketPriority, label: 'Medie' },
                        { value: 'ridicata' as TicketPriority, label: 'Mare' },
                      ]).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setTicketForm((f) => ({ ...f, priority: opt.value }))}
                          className={cn(
                            'py-4 rounded-xl text-sm font-semibold transition-all border',
                            ticketForm.priority === opt.value
                              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 dark:border-orange-500 text-orange-600 dark:text-orange-400'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-orange-300 hover:text-orange-500'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Descriere */}
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                      Descriere
                    </label>
                    <textarea
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm((f) => ({ ...f, description: e.target.value }))}
                      rows={5}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
                      placeholder="Descrieți problema cât mai detaliat..."
                    />
                  </div>
                </>
              )}
            </div>

            {/* Bottom buttons — side by side */}
            <div className="px-8 pb-8 pt-2 flex gap-3">
              <button
                onClick={handleSubmitTicket}
                disabled={ticketSubmitting || modalLoading || !ticketForm.description.trim()}
                className="flex-[3] flex items-center justify-center gap-2.5 py-4 bg-[#1e293b] dark:bg-primary text-white rounded-xl text-[15px] font-bold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {ticketSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Trimite Tichet
              </button>
              <button
                onClick={() => setTicketModal(null)}
                className="flex-[2] py-4 bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[15px] font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Anulează
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
