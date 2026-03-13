import ReactMarkdown from 'react-markdown';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isAI = role === 'assistant';

  return (
    <div className={cn('flex items-start gap-4', !isAI && 'flex-row-reverse')}>
      <div
        className={cn(
          'size-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm',
          isAI ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
        )}
      >
        {isAI ? <Bot size={18} /> : <User size={18} />}
      </div>

      <div className={cn('flex flex-col gap-1.5 max-w-[85%]', !isAI && 'items-end')}>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
          {isAI ? 'Asistent AI' : 'Utilizator'}
        </span>
        <div
          className={cn(
            'p-6 rounded-2xl shadow-sm',
            isAI
              ? 'bg-slate-100 dark:bg-slate-800 rounded-tl-none'
              : 'bg-primary text-white rounded-tr-none shadow-md'
          )}
        >
          {isAI ? (
            <div className="prose prose-slate dark:prose-invert prose-sm max-w-none [&>p]:text-[17px] [&>p]:leading-relaxed [&>ul]:text-[17px] [&>ol]:text-[17px]">
              <ReactMarkdown>{content}</ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-5 bg-primary/60 animate-pulse ml-0.5" />
              )}
            </div>
          ) : (
            <p className="text-[17px] leading-relaxed">{content}</p>
          )}
        </div>
      </div>
    </div>
  );
}
