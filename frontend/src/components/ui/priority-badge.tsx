import { cn } from '@/lib/utils';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/lib/constants';
import type { TicketPriority } from '@/lib/types';

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const colors = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
  const label = PRIORITY_LABELS[priority] || priority;

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', colors.bg, colors.text)}>
      {label}
    </span>
  );
}
