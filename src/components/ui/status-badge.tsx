import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DocStatus } from '@/lib/domain/types';

/**
 * A document's status, said the same way everywhere.
 *
 * The table and the card view each decided this for themselves, which is how
 * the same fact comes to look like two facts. `design-system.test.ts` fails the
 * build on a hand-written status badge now, the same mechanism as `DateCell`.
 *
 * **Every status carries a word**, and only a word. The fill is the second
 * reading, never the first: roughly one man in twelve cannot separate the
 * filled badge from the muted one, and nobody at all can hear a colour.
 *
 * Only the statuses that exist. `void` is in `DocStatus`'s docstring as
 * reserved and is not reachable; overdue and blocked are not modelled at all,
 * and a badge for a status nothing can be in is a badge nobody maintains.
 */
const STATUSES = {
  draft: { label: 'Draft', variant: 'secondary' as const },
  finalized: { label: 'Finalized', variant: 'default' as const },
  void: { label: 'Void', variant: 'outline' as const },
};

export function StatusBadge({
  status,
  className,
}: {
  status: DocStatus | 'void';
  className?: string;
}) {
  const { label, variant } = STATUSES[status] ?? STATUSES.draft;
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
