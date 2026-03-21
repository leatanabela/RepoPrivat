'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total: number;
  limit: number;
}

export function Pagination({ page, totalPages, onPageChange, total, limit }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-100 dark:border-dm-surface-bright/10 px-6 py-4 bg-slate-50/50 dark:bg-dm-surface-high/20">
      <p className="text-sm text-slate-600 dark:text-dm-on-surface-variant">
        Afișare <span className="font-medium">{(page - 1) * limit + 1}-{Math.min(page * limit, total)}</span> din <span className="font-medium">{total}</span>
      </p>
      <div className="flex gap-1.5">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-dm-surface-bright/20 bg-white dark:bg-dm-surface-high text-slate-500 dark:text-dm-on-surface-variant hover:bg-slate-50 dark:hover:bg-dm-surface-bright transition-all duration-180 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
          const pageNum = i + 1;
          return (
            <button
              key={pageNum}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium transition-all duration-180',
                pageNum === page
                  ? 'bg-primary dark:bg-dm-primary-container text-white border-primary dark:border-dm-primary-container'
                  : 'bg-white dark:bg-dm-surface-high border-slate-200 dark:border-dm-surface-bright/20 text-slate-600 dark:text-dm-on-surface-variant hover:bg-slate-50 dark:hover:bg-dm-surface-bright'
              )}
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-dm-surface-bright/20 bg-white dark:bg-dm-surface-high text-slate-500 dark:text-dm-on-surface-variant hover:bg-slate-50 dark:hover:bg-dm-surface-bright transition-all duration-180 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
