import { AmountCell } from '@/components/patterns/AmountCell';
import { contractFees } from '@/lib/domain/contract/listing';
import { totalPaiseOf } from '@/lib/domain/documentQuery';
import type { AdminDocument } from '@/lib/domain/types';
import { NIL } from '@/lib/utils';

/**
 * A document's figure, drawn one way for the table and the cards.
 *
 * The `DateCell` rule (`CONTEXT.md` §5e): a value that appears in two lists
 * gets one component that decides how it looks, or the two drift. The figure
 * itself is `totalPaiseOf`'s and the drawing is `AmountCell`'s, the same
 * raised currency chip and digits the clients list uses for an amount. What
 * this adds is the one case that is not a single number. A contract's
 * Retainer fee is a month's, and printing it bare under a column called Total
 * would read as the agreement's worth, so it carries a "/mo" and sits apart
 * from any one-off fee on the same agreement.
 */
export function DocumentTotal({ doc }: { doc: AdminDocument }) {
  if (doc.type === 'CON') {
    const { oncePaise, monthlyPaise } = contractFees(doc.contract);
    if (oncePaise === undefined && monthlyPaise === undefined) return NIL;
    return (
      <span className="inline-flex min-w-0 items-center gap-1">
        {oncePaise !== undefined && <AmountCell minor={oncePaise} currency="INR" />}
        {oncePaise !== undefined && monthlyPaise !== undefined && (
          <span className="text-muted-foreground">+</span>
        )}
        {monthlyPaise !== undefined && (
          <>
            <AmountCell minor={monthlyPaise} currency="INR" />
            <span aria-hidden="true" className="text-muted-foreground">
              /mo
            </span>
            <span className="sr-only">per month</span>
          </>
        )}
      </span>
    );
  }
  const total = totalPaiseOf(doc);
  return total === null ? NIL : <AmountCell minor={total} currency="INR" />;
}
