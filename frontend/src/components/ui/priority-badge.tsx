import { cn } from '@/lib/utils';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/lib/constants';
import type { TicketPriority } from '@/lib/types';

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const colors = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medie;
  const label = PRIORITY_LABELS[priority] || priority;

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold', colors.bg, colors.text)}>
      <span className={cn('size-1.5 rounded-full', colors.dot)} />
      {label}
    </span>
  );
}
