'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Lightbulb } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  showTips?: boolean;
}

// Rotating placeholder examples so users see good question patterns
const PLACEHOLDER_EXAMPLES = [
  'Ex: Care sunt drepturile deținuților conform legii?',
  'Ex: Cum se face promovarea în grad profesional?',
  'Ex: Ce sancțiuni disciplinare există pentru funcționari publici?',
  'Ex: Ce documente sunt necesare pentru autorizația de construire?',
  'Ex: Care e procedura de eliberare a certificatului de urbanism?',
  'Ex: Ce obligații are angajatul conform regulamentului intern?',
  'Ex: Cum se organizează ședințele consiliului local?',
];

export function ChatInput({ onSend, disabled, showTips }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rotate placeholder every 4 seconds so user sees variety
  useEffect(() => {
    if (message || disabled) return;
    const timer = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [message, disabled]);

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
        {/* Tips panel */}
        {showHelp && (
          <div className="mb-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm">
            <p className="font-semibold text-blue-700 dark:text-blue-300 mb-2">💡 Cum să pui întrebări bune:</p>
            <ul className="space-y-1 text-blue-700/90 dark:text-blue-300/90 text-[13px]">
              <li>✓ <strong>Fii specific</strong> — menționează categoria (angajat, elev, detinut, funcționar public)</li>
              <li>✓ <strong>Folosește termeni oficiali</strong> — &quot;raport de serviciu&quot; nu &quot;contract&quot;</li>
              <li>✓ <strong>O întrebare odată</strong> — nu combina mai multe subiecte</li>
              <li>✗ Evită întrebări prea vagi precum &quot;ajutor&quot; sau &quot;ce fac?&quot;</li>
              <li>✗ Dacă nu știi termenul exact, descrie problema cu cuvintele tale</li>
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-dm-surface-high rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/20 focus-within:border-primary/40 dark:focus-within:border-dm-primary/30 focus-within:ring-2 focus-within:ring-primary/10 dark:focus-within:ring-dm-primary/10 transition-all duration-180 px-4 py-3 [&:focus-visible]:outline-none">
            <textarea
              ref={textareaRef}
              className="flex-1 bg-transparent text-[15px] leading-relaxed placeholder:text-slate-400 dark:placeholder:text-dm-on-surface-variant/70 dark:text-dm-on-surface resize-none outline-none focus-visible:outline-none min-h-[24px] max-h-[160px]"
              placeholder={PLACEHOLDER_EXAMPLES[placeholderIndex]}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              rows={1}
            />
            {showTips && (
              <button
                type="button"
                onClick={() => setShowHelp((s) => !s)}
                className="shrink-0 size-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 dark:hover:text-dm-primary transition-all"
                title="Ghid pentru întrebări bune"
              >
                <Lightbulb size={18} />
              </button>
            )}
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
