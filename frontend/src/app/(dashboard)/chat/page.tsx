'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { ChatMessage } from '@/components/chat/chat-message';
import { ChatInput } from '@/components/chat/chat-input';
import {
  createChatSession,
  getChatSessions,
  getChatMessages,
  saveUserMessage,
  saveAssistantMessage,
  deleteChatSession,
  submitFeedback,
  getFeedbackForSession,
  getPopularQuestions,
} from '@/lib/actions/chat.actions';
import { createTicketFromChat, getAiTicketSuggestions, getDepartments } from '@/lib/actions/ticket.actions';
import { Plus, Trash2, MessageSquare, TicketPlus, X, Loader2, Send, Bot, ThumbsUp, ThumbsDown, TrendingUp } from 'lucide-react';
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
  const { isAdmin } = useAuthStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const [ticketableMessages, setTicketableMessages] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Record<string, 'positive' | 'negative'>>({});
  const [popularQuestions, setPopularQuestions] = useState<string[]>([]);
  const lastQuestionRef = useRef<string>('');
  const questionForMessageRef = useRef<Map<string, string>>(new Map());
  const noChunksRef = useRef(false);
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
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);

  const userScrolledUpRef = useRef(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      userScrolledUpRef.current = scrollHeight - scrollTop - clientHeight > 100;
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!streaming) {
      userScrolledUpRef.current = false;
    }
    scrollToBottom();
  }, [messages, scrollToBottom, streaming]);

  useEffect(() => {
    if (streaming && streamingContent) {
      scrollToBottom();
    }
  }, [streamingContent, streaming, scrollToBottom]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadSessions();
    // Load popular questions for welcome screen
    getPopularQuestions(4).then(setPopularQuestions).catch(() => {});
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      getChatMessages(currentSessionId).then(setMessages).catch(() => {});
    }
  }, [currentSessionId]);

  async function loadSessions() {
    try {
      const data = await getChatSessions();
      setSessions(data);
      if (currentSessionId) {
        const msgs = await getChatMessages(currentSessionId);
        setMessages(msgs);
      }
    } catch {
      toast.error('Eroare la încărcarea conversațiilor');
    }
  }

  async function selectSession(id: string) {
    setCurrentSession(id);
    try {
      const [msgs, fbMap] = await Promise.all([
        getChatMessages(id),
        getFeedbackForSession(id),
      ]);
      setMessages(msgs);
      setFeedback(fbMap);
    } catch {
      toast.error('Eroare la încărcarea mesajelor');
    }
  }

  async function handleFeedback(messageId: string, rating: 'positive' | 'negative') {
    // Optimistic update
    const previous = feedback[messageId];
    setFeedback((prev) => ({ ...prev, [messageId]: rating }));

    const result = await submitFeedback(messageId, rating);
    if (result.error) {
      toast.error('Eroare la salvarea feedback-ului');
      setFeedback((prev) => {
        const next = { ...prev };
        if (previous) next[messageId] = previous;
        else delete next[messageId];
        return next;
      });
    } else {
      toast.success(rating === 'positive' ? 'Mulțumim pentru feedback! 👍' : 'Feedback înregistrat. Vom îmbunătăți răspunsurile.');
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

    try {
      const userMsg = await saveUserMessage(sessionId, message);
      addMessage(userMsg);
    } catch {
      toast.error('Eroare la trimiterea mesajului');
      return;
    }

    const history = [...messages, { role: 'user' as const, content: message }]
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

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
                fullContent += data;
                appendStreamingContent(data);
              }
            }
          }
        }
      }

      setStreamingContent('');
      setStreaming(false);

      const assistantMsg = await saveAssistantMessage(sessionId, fullContent);
      addMessage(assistantMsg);

      // Check if user explicitly asked for a ticket
      const userAskedForTicket = /tichet|sesizare|reclama[tț]ie|f[aă][\s-]?mi un|genereaz[aă]|vreau s[aă] (fac|creez|deschid|trimit)/i.test(lastQuestionRef.current);

      // Show ticket card if: user explicitly asked, OR AI truly could not help
      const trimmedContent = fullContent.trim();
      const isGreeting = /😊|cu ce te pot ajuta|te pot ajuta|sunt asistentul|pune-mi o întrebare/i.test(trimmedContent);
      const isVagueHelper = /subiecte:|proceduri administrative|legislație|administrație publică/i.test(trimmedContent);
      const isRefusalResponse = /^(îmi pare rău|nu am găsit|nu am gasit|nu s-au găsit|nu pot ajuta)/i.test(trimmedContent);
      const isShortNoInfo = trimmedContent.length < 200 &&
        /nu am găsit|nu am gasit|nu s-au găsit|nu conțin informații|nu pot ajuta/i.test(trimmedContent);
      const isLongAnswer = trimmedContent.length > 300;
      const couldNotAnswer = !isGreeting && !isVagueHelper && !isLongAnswer && ((noChunksRef.current && isShortNoInfo) || isRefusalResponse);

      // Store which question triggered this assistant message
      questionForMessageRef.current.set(assistantMsg.id, lastQuestionRef.current);
      if (!isAdmin && (userAskedForTicket || couldNotAnswer)) {
        setTicketableMessages((prev) => new Set(prev).add(assistantMsg.id));
      }

      const updatedSessions = await getChatSessions();
      setSessions(updatedSessions);
    } catch {
      toast.error('Eroare la comunicarea cu asistentul AI');
      setStreaming(false);
      setStreamingContent('');
    }
  }

  async function openTicketModal(messageId: string, assistantContent: string) {
    const originalQuestion = questionForMessageRef.current.get(messageId) || lastQuestionRef.current;
    setTicketModal({ messageId, question: originalQuestion, aiResponse: assistantContent });
    setTicketForm({ subject: originalQuestion, description: originalQuestion, priority: 'medie', departmentId: '' });
    setAiSuggestions(null);
    setModalLoading(false); // Modal opens instantly, form is usable immediately

    // Load departments (fast DB query)
    getDepartments().then(setDepartments).catch(() => {});

    // Load AI suggestions in background (slow - can take 10-30s)
    setSuggestionsLoading(true);
    getAiTicketSuggestions(originalQuestion)
      .then((suggestions) => {
        if (!suggestions) return;
        setAiSuggestions(suggestions);
        const priorityMap: Record<string, TicketPriority> = {
          low: 'scazuta', medium: 'medie', high: 'ridicata', urgent: 'urgenta',
          scazuta: 'scazuta', medie: 'medie', ridicata: 'ridicata', urgenta: 'urgenta',
        };
        setTicketForm((prev) => ({
          ...prev,
          subject: suggestions.title || prev.subject,
          priority: priorityMap[suggestions.priority] || prev.priority,
          departmentId: suggestions.department_id || prev.departmentId,
        }));
      })
      .catch(() => {})
      .finally(() => setSuggestionsLoading(false));
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
      <header className="h-14 flex items-center justify-between px-6 border-b border-slate-100/80 dark:border-dm-surface-bright/10 bg-white dark:bg-dm-surface-low shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-primary/10 dark:bg-dm-primary/10 flex items-center justify-center">
            <Bot size={14} className="text-primary dark:text-dm-primary" />
          </div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-dm-on-surface">
            Asistent AI
          </h2>
        </div>
        <button
          onClick={handleNewSession}
          className="flex items-center gap-2 px-3.5 py-2 bg-primary dark:bg-dm-primary-container text-white rounded-xl text-xs font-semibold hover:bg-primary-hover dark:hover:bg-dm-primary-container/80 transition-all duration-180 active:scale-[0.98]"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Conversație Nouă</span>
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4">
              <div className="flex flex-col gap-6 py-8">
                {/* Welcome message - only shown when no messages yet */}
                {messages.length === 0 && !streaming && !streamingContent && (
                  <div className="flex gap-3 justify-start">
                    <div className="size-8 rounded-xl bg-primary dark:bg-dm-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <Bot size={16} className="text-white dark:text-dm-primary" />
                    </div>
                    <div className="flex flex-col gap-1 max-w-[75%]">
                      <div className="px-5 py-4 rounded-2xl rounded-tl-md bg-white dark:bg-dm-surface-high border border-slate-100 dark:border-dm-surface-bright/10">
                        <p className="text-base leading-[1.75] text-slate-700 dark:text-dm-on-surface">
                          Bună ziua! Sunt asistentul virtual al primăriei. Te pot ajuta cu informații despre proceduri administrative, legislație, concesiuni, acte necesare și multe altele. Cu ce te pot ajuta?
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Example questions - only shown before any interaction */}
                {messages.length === 0 && !streaming && !streamingContent && (
                  <div className="flex gap-3 justify-start">
                    <div className="size-8 shrink-0" aria-hidden="true" />
                    <div className="flex flex-col gap-2 max-w-[85%] w-full">
                      {popularQuestions.length >= 2 ? (
                        <p className="text-xs font-semibold text-slate-500 dark:text-dm-on-surface-variant px-1 mb-1 flex items-center gap-1.5">
                          <TrendingUp size={12} />
                          Cele mai populare întrebări:
                        </p>
                      ) : (
                        <p className="text-xs font-semibold text-slate-500 dark:text-dm-on-surface-variant px-1 mb-1">
                          💡 Încearcă una din aceste întrebări:
                        </p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(popularQuestions.length >= 2
                          ? popularQuestions
                          : [
                              'Care sunt drepturile deținuților conform legii?',
                              'Cum se face promovarea în grad profesional?',
                              'Ce documente sunt necesare pentru autorizația de construire?',
                              'Ce obligații are angajatul conform regulamentului intern?',
                            ]
                        ).map((q) => (
                          <button
                            key={q}
                            onClick={() => handleSend(q)}
                            className="text-left px-4 py-3 bg-white dark:bg-dm-surface-high border border-slate-200 dark:border-dm-surface-bright/15 rounded-xl text-sm text-slate-700 dark:text-dm-on-surface hover:border-primary/40 dark:hover:border-dm-primary/40 hover:bg-primary/5 dark:hover:bg-dm-primary/5 transition-all duration-180"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 p-4 bg-amber-50/70 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl">
                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">
                          📋 Pentru răspunsuri cât mai precise:
                        </p>
                        <ul className="space-y-1 text-xs text-amber-800/90 dark:text-amber-300/90">
                          <li>• <strong>Fii specific</strong> — menționează categoria ta (angajat, funcționar public)</li>
                          <li>• <strong>Folosește termeni oficiali</strong> — ex: &quot;raport de serviciu&quot; în loc de &quot;contract&quot;</li>
                          <li>• <strong>O întrebare odată</strong> — nu combina mai multe subiecte</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages */}
                  {messages.map((msg) => (
                    <div key={msg.id}>
                      <ChatMessage role={msg.role} content={msg.content} />
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1.5 pl-11 mt-2">
                          <button
                            onClick={() => handleFeedback(msg.id, 'positive')}
                            className={cn(
                              'size-7 rounded-lg flex items-center justify-center transition-all duration-180',
                              feedback[msg.id] === 'positive'
                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-dm-surface-high hover:text-emerald-600 dark:hover:text-emerald-400'
                            )}
                            title="Răspuns util"
                          >
                            <ThumbsUp size={14} />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, 'negative')}
                            className={cn(
                              'size-7 rounded-lg flex items-center justify-center transition-all duration-180',
                              feedback[msg.id] === 'negative'
                                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-dm-surface-high hover:text-red-600 dark:hover:text-red-400'
                            )}
                            title="Răspuns greșit"
                          >
                            <ThumbsDown size={14} />
                          </button>
                        </div>
                      )}
                      {msg.role === 'assistant' && ticketableMessages.has(msg.id) && (
                        <div className="flex justify-start pl-11 mt-3">
                          <div className="relative bg-white dark:bg-dm-surface-high border border-slate-200 dark:border-dm-surface-bright/15 rounded-2xl p-5 w-full max-w-sm">
                            <button
                              onClick={() => setTicketableMessages((prev) => { const next = new Set(prev); next.delete(msg.id); return next; })}
                              className="absolute top-3 right-3 text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors duration-180"
                            >
                              <X size={14} />
                            </button>
                            <div className="flex items-start gap-3">
                              <div className="size-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                                <TicketPlus size={18} className="text-amber-600 dark:text-amber-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 dark:text-dm-on-surface">
                                  Nu am găsit un răspuns complet
                                </p>
                                <p className="text-xs text-slate-500 dark:text-dm-on-surface-variant mt-0.5">
                                  Trimite întrebarea către un administrator.
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => openTicketModal(msg.id, msg.content)}
                              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 dark:bg-dm-primary-container text-white rounded-xl text-sm font-semibold hover:bg-slate-800 dark:hover:bg-dm-primary-container/80 transition-all duration-180 active:scale-[0.98]"
                            >
                              <Send size={13} />
                              Creează Sesizare
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {streaming && !streamingContent && (
                    <div className="flex gap-3 justify-start">
                      <div className="size-8 rounded-xl bg-primary dark:bg-dm-primary/20 flex items-center justify-center shrink-0 mt-1">
                        <Bot size={16} className="text-white dark:text-dm-primary" />
                      </div>
                      <div className="bg-white dark:bg-dm-surface-high border border-slate-100 dark:border-dm-surface-bright/10 px-5 py-4 rounded-2xl rounded-tl-md">
                        <div className="flex items-center gap-1.5">
                          <span className="size-1.5 bg-slate-400 dark:bg-dm-on-surface-variant rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="size-1.5 bg-slate-400 dark:bg-dm-on-surface-variant rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="size-1.5 bg-slate-400 dark:bg-dm-on-surface-variant rounded-full animate-bounce [animation-delay:300ms]" />
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
          </div>

          <ChatInput onSend={handleSend} disabled={streaming} showTips />
        </div>
      </div>

      {/* Ticket Creation Modal */}
      {ticketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => !ticketSubmitting && setTicketModal(null)}>
          <div className="bg-white dark:bg-dm-surface-bright rounded-2xl shadow-2xl w-full max-w-[520px] overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-7 pt-7 pb-1 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-dm-on-surface">
                  Sesizare Nouă
                </h3>
                <p className="text-sm text-slate-500 dark:text-dm-on-surface-variant mt-1">
                  Completează formularul pentru asistență.
                </p>
              </div>
              <button
                onClick={() => setTicketModal(null)}
                className="size-8 rounded-lg hover:bg-slate-100 dark:hover:bg-dm-surface-high flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all duration-180"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-7 py-6 space-y-5">
              {suggestionsLoading && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                  <Loader2 size={14} className="animate-spin text-blue-600 dark:text-blue-400" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">AI analizează întrebarea pentru sugestii automate...</p>
                </div>
              )}
              {false ? null : (
                <>
<div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-dm-on-surface mb-1.5">
                      Subiect
                    </label>
                    <input
                      type="text"
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm((f) => ({ ...f, subject: e.target.value }))}
                      className="w-full bg-white dark:bg-dm-surface-high border border-slate-200 dark:border-dm-surface-bright/20 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-dm-on-surface focus:ring-2 focus:ring-primary/15 focus:border-primary dark:focus:border-dm-primary outline-none transition-all duration-180"
                      placeholder="Ex: Eroare conectare imprimantă"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-dm-on-surface mb-1.5">
                      Departament
                    </label>
                    <div className="relative">
                      <select
                        value={ticketForm.departmentId}
                        onChange={(e) => setTicketForm((f) => ({ ...f, departmentId: e.target.value }))}
                        className="w-full bg-white dark:bg-dm-surface-high border border-slate-200 dark:border-dm-surface-bright/20 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-dm-on-surface focus:ring-2 focus:ring-primary/15 focus:border-primary dark:focus:border-dm-primary outline-none transition-all duration-180 appearance-none pr-10"
                      >
                        <option value="" disabled hidden>Selectează departament</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <svg className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-dm-on-surface mb-2">
                      Urgență
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
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
                            'py-3 rounded-xl text-sm font-semibold transition-all duration-180 border',
                            ticketForm.priority === opt.value
                              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-500 text-amber-700 dark:text-amber-400'
                              : 'bg-white dark:bg-dm-surface-high border-slate-200 dark:border-dm-surface-bright/20 text-slate-600 dark:text-dm-on-surface-variant hover:border-amber-300 hover:text-amber-600'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-dm-on-surface mb-1.5">
                      Descriere
                    </label>
                    <textarea
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm((f) => ({ ...f, description: e.target.value }))}
                      rows={4}
                      className="w-full bg-white dark:bg-dm-surface-high border border-slate-200 dark:border-dm-surface-bright/20 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-dm-on-surface focus:ring-2 focus:ring-primary/15 focus:border-primary dark:focus:border-dm-primary outline-none resize-none transition-all duration-180"
                      placeholder="Descrieți problema cât mai detaliat..."
                    />
                  </div>
                </>
              )}
            </div>

            {/* Bottom buttons */}
            <div className="px-7 pb-7 pt-1 flex gap-3">
              <button
                onClick={handleSubmitTicket}
                disabled={ticketSubmitting || !ticketForm.description.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 dark:bg-dm-primary-container text-white rounded-xl text-sm font-semibold hover:bg-slate-800 dark:hover:bg-dm-primary-container/80 transition-all duration-180 disabled:opacity-50 active:scale-[0.98]"
              >
                {ticketSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Trimite Tichet
              </button>
              <button
                onClick={() => setTicketModal(null)}
                className="px-5 py-3 border border-slate-200 dark:border-dm-surface-bright/20 text-slate-600 dark:text-dm-on-surface-variant rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-dm-surface-high transition-all duration-180"
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
