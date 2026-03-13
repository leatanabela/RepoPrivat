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
    <div className="flex items-center justify-between border-t border-primary/10 px-6 py-4 bg-primary/5">
      <p className="text-sm text-slate-500">
        Afișare {(page - 1) * limit + 1}-{Math.min(page * limit, total)} din {total}
      </p>
      <div className="flex gap-2">
        <button
          className="flex h-8 w-8 items-center justify-center rounded border border-primary/20 bg-white text-slate-400 hover:bg-primary/5 transition-colors disabled:opacity-50"
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
                'flex h-8 w-8 items-center justify-center rounded border border-primary/20 text-sm font-medium transition-colors',
                pageNum === page
                  ? 'bg-primary text-white'
                  : 'bg-white text-slate-600 hover:bg-primary/5'
              )}
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          className="flex h-8 w-8 items-center justify-center rounded border border-primary/20 bg-white text-slate-400 hover:bg-primary/5 transition-colors disabled:opacity-50"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
