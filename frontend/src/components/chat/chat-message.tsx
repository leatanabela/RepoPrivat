'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Copy, Check } from 'lucide-react';
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

  // Capitalize each word in a document title: "cod etic si integritate" → "Cod Etic Si Integritate"
  function prettifyTitle(title: string): string {
    return title
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Clean up source references in AI responses:
  // - Replace "Sursa 1" with actual document name
  // - Replace [Document: "xyz"] with clean inline text
  function cleanSourceRefs(text: string): string {
    if (!sources || sources.length === 0) {
      // Still clean [Document: "..."] tags even without source map
      return text
        .replace(/\[Document:\s*"([^"]+)"\]/gi, (_, name) => prettifyTitle(name))
        .replace(/\[Document:\s*([^\]]+)\]/gi, (_, name) => prettifyTitle(name));
    }

    // Deduplicate sources by document_title preserving order
    const uniqueTitles: string[] = [];
    for (const s of sources) {
      if (!uniqueTitles.includes(s.document_title)) uniqueTitles.push(s.document_title);
    }

    let cleaned = text;
    // 1. Replace "Sursa N" with real document name
    cleaned = cleaned.replace(/\b[Ss]ursa\s*(\d+)\b/g, (_, num) => {
      const idx = parseInt(num, 10) - 1;
      return uniqueTitles[idx] ? prettifyTitle(uniqueTitles[idx]) : `Sursa ${num}`;
    });
    // 2. Remove [Document: "xyz"] wrappers, keep just the name prettified
    cleaned = cleaned
      .replace(/\[Document:\s*"([^"]+)"\]/gi, (_, name) => prettifyTitle(name))
      .replace(/\[Document:\s*([^\]]+)\]/gi, (_, name) => prettifyTitle(name));
    return cleaned;
  }

  const displayContent = isAI && !isStreaming ? cleanSourceRefs(content) : content;

  function handleCopy() {
    navigator.clipboard.writeText(displayContent);
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
              <ReactMarkdown>{displayContent}</ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-1.5 h-5 bg-primary/50 dark:bg-dm-primary/50 animate-pulse rounded-sm ml-0.5 align-middle" />
              )}
            </div>
          ) : (
            <p className="text-base leading-[1.75]">{content}</p>
          )}
        </div>

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
