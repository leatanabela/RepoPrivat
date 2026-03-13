'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [disabled]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessage('');
  }

  return (
    <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-background-dark">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
        <input
          ref={inputRef}
          className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl py-5 pl-6 pr-16 text-lg focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 transition-all outline-none"
          placeholder="Pune o întrebare..."
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </form>
      <p className="text-center text-xs text-slate-400 mt-4">
        Asistentul AI poate face greșeli. Verifică informațiile importante.
      </p>
    </div>
  );
}
