import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-slate-200 dark:bg-slate-700 rounded', className)} />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-6 p-8 max-w-3xl mx-auto">
      <div className="flex gap-4">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <Skeleton className="h-24 flex-1 rounded-2xl" />
      </div>
      <div className="flex gap-4 flex-row-reverse">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <Skeleton className="h-16 w-2/3 rounded-2xl" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <Skeleton className="h-32 flex-1 rounded-2xl" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-background-dark p-6 rounded-xl border border-primary/5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5" />
      </div>
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}
