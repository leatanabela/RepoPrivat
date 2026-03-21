'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [disabled]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
  }, [message]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessage('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const hasContent = message.trim().length > 0;

  return (
    <div className="shrink-0 border-t border-slate-100 dark:border-dm-surface-bright/10 bg-white dark:bg-dm-surface-low">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-dm-surface-high rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/20 focus-within:border-primary/40 dark:focus-within:border-dm-primary/30 focus-within:ring-2 focus-within:ring-primary/10 dark:focus-within:ring-dm-primary/10 transition-all duration-180 px-4 py-3 [&:focus-visible]:outline-none">
            <textarea
              ref={textareaRef}
              className="flex-1 bg-transparent text-[15px] leading-relaxed placeholder:text-slate-400 dark:placeholder:text-dm-on-surface-variant/70 dark:text-dm-on-surface resize-none outline-none focus-visible:outline-none min-h-[24px] max-h-[160px]"
              placeholder="Pune o întrebare..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              rows={1}
            />
            <button
              type="submit"
              disabled={disabled || !hasContent}
              className={`shrink-0 size-9 rounded-xl flex items-center justify-center transition-all duration-180 ${
                hasContent && !disabled
                  ? 'bg-primary dark:bg-dm-primary text-white dark:text-dm-surface shadow-sm hover:bg-primary-hover dark:hover:bg-dm-primary/80 active:scale-95'
                  : 'bg-slate-200 dark:bg-dm-surface-bright text-slate-400 dark:text-dm-on-surface-variant cursor-not-allowed'
              }`}
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </form>
        <p className="text-center text-[11px] text-slate-400 dark:text-dm-on-surface-variant mt-3">
          Asistentul AI poate face greșeli. Verifică informațiile importante.
        </p>
      </div>
    </div>
  );
}
