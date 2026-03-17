'use client';

import { useEffect, useRef, useCallback } from 'react';
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
import { Plus, Trash2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatSkeleton } from '@/components/ui/loading-skeleton';
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
                if (parsed.type === 'token' && parsed.data) {
                  fullContent += parsed.data;
                  appendStreamingContent(parsed.data);
<<<<<<< Updated upstream
=======
                }
                if (parsed.token) {
                  fullContent += parsed.token;
                  appendStreamingContent(parsed.token);
                }
                if (parsed.answer) {
                  fullContent = parsed.answer;
>>>>>>> Stashed changes
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
              {messages.length === 0 && !streaming && (
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
              )}

              {messages.map((msg) => (
                <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
              ))}

              {streaming && streamingContent && (
                <ChatMessage role="assistant" content={streamingContent} isStreaming />
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <ChatInput onSend={handleSend} disabled={streaming} />
        </div>
      </div>
    </>
  );
}
