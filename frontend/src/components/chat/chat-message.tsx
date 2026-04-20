'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Copy, Check, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  sources?: Array<{ document_id: string; document_title: string; similarity: number; file_url: string }>;
}

export function ChatMessage({ role, content, isStreaming, sources }: ChatMessageProps) {
  const isAI = role === 'assistant';
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={cn(
        'group flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isAI ? 'justify-start' : 'justify-end'
      )}
    >
      {/* AI Avatar */}
      {isAI && (
        <div className="size-8 rounded-xl bg-primary dark:bg-dm-primary/20 flex items-center justify-center shrink-0 mt-1">
          <Bot size={16} className="text-white dark:text-dm-primary" />
        </div>
      )}

      <div className={cn('flex flex-col gap-1 max-w-[75%]', !isAI && 'items-end')}>
        {/* Message bubble */}
        <div
          className={cn(
            'relative px-5 py-4 rounded-2xl transition-shadow duration-180',
            isAI
              ? 'bg-white dark:bg-dm-surface-high border border-slate-100 dark:border-dm-surface-bright/10 rounded-tl-md'
              : 'bg-primary dark:bg-dm-primary-container text-white rounded-tr-md'
          )}
        >
          {isAI ? (
            <div className="prose prose-slate dark:prose-invert prose-base max-w-none [&>p]:text-base [&>p]:leading-[1.75] [&>ul]:text-base [&>ol]:text-base [&>p:last-child]:mb-0 dark:[&>p]:text-dm-on-surface dark:[&>ul]:text-dm-on-surface dark:[&>ol]:text-dm-on-surface [&>ul]:leading-[1.75] [&>ol]:leading-[1.75]">
              <ReactMarkdown>{content}</ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-1.5 h-5 bg-primary/50 dark:bg-dm-primary/50 animate-pulse rounded-sm ml-0.5 align-middle" />
              )}
            </div>
          ) : (
            <p className="text-base leading-[1.75]">{content}</p>
          )}
        </div>

        {/* Sources */}
        {isAI && !isStreaming && sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {sources.map((src, i) => (
              <a
                key={src.document_id}
                href={src.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-dm-surface-high border border-slate-200 dark:border-dm-surface-bright/15 rounded-lg text-xs text-slate-600 dark:text-dm-on-surface-variant hover:border-primary/40 dark:hover:border-dm-primary/40 hover:text-primary dark:hover:text-dm-primary transition-all duration-180"
                title={src.document_title}
              >
                <FileText size={12} />
                <span className="font-medium">Sursa {i + 1}:</span>
                <span className="truncate max-w-[200px]">{src.document_title}</span>
              </a>
            ))}
          </div>
        )}

        {/* Copy button — only on AI messages, visible on hover */}
        {isAI && !isStreaming && content && (
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-180 flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400 dark:text-dm-on-surface-variant hover:text-slate-600 dark:hover:text-dm-on-surface rounded-lg"
          >
            {copied ? (
              <>
                <Check size={12} />
                <span>Copiat</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copiază</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* User Avatar */}
      {!isAI && (
        <div className="size-8 rounded-xl bg-slate-200 dark:bg-dm-surface-bright flex items-center justify-center shrink-0 mt-1">
          <User size={16} className="text-slate-600 dark:text-dm-on-surface-variant" />
        </div>
      )}
    </div>
  );
}
