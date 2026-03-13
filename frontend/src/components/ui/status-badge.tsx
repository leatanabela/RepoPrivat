import { cn } from '@/lib/utils';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';
import type { TicketStatus } from '@/lib/types';

export function StatusBadge({ status }: { status: TicketStatus }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.new;
  const label = STATUS_LABELS[status] || status;

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', colors.bg, colors.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
      {label}
    </span>
  );
}
