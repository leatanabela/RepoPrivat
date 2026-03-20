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
          isAI ? 'bg-primary dark:bg-dm-primary/20 text-white dark:text-dm-primary' : 'bg-slate-200 dark:bg-dm-surface-bright text-slate-600 dark:text-dm-on-surface-variant'
        )}
      >
        {isAI ? <Bot size={18} /> : <User size={18} />}
      </div>

      <div className={cn('flex flex-col gap-1.5 max-w-[85%]', !isAI && 'items-end')}>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-dm-on-surface-variant px-1">
          {isAI ? 'Asistent AI' : 'Utilizator'}
        </span>
        <div
          className={cn(
            'p-6 rounded-2xl shadow-sm',
            isAI
              ? 'bg-slate-100 dark:bg-dm-surface-high rounded-tl-none'
              : 'bg-primary dark:bg-dm-primary/15 text-white dark:text-dm-primary rounded-tr-none shadow-md'
          )}
        >
          {isAI ? (
            <div className="prose prose-slate dark:prose-invert prose-sm max-w-none [&>p]:text-[17px] [&>p]:leading-relaxed [&>ul]:text-[17px] [&>ol]:text-[17px] dark:[&>p]:text-dm-on-surface dark:[&>ul]:text-dm-on-surface dark:[&>ol]:text-dm-on-surface">
              <ReactMarkdown>{content}</ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-5 bg-primary/60 dark:bg-dm-primary/60 animate-pulse ml-0.5" />
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
