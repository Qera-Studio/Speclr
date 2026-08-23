'use client';

import { amountInWords } from '@/lib/domain/amountInWords';
import { formatINR } from '@/lib/domain/money';
import type { DocTotals } from '@/lib/domain/types';
import { NIL } from '@/lib/utils';

/**
 * Live computed totals shown beside the form. Presentational only.
 *
 * `tabular-nums` on every figure, and this is the one panel in the app where it
 * is not merely tidy: these three numbers are recomputed on **every keystroke**
 * in the line items, so in a proportional face the digits change width as they
 * change value and the column jitters sideways while somebody is typing a rate.
 * The label/value split is colour at one size, which is the same hierarchy the
 * tables use: a muted name, the figure at full strength.
 */
export default function TotalsPanel({
  totals,
  gstRatePercent,
}: {
  totals: DocTotals;
  gstRatePercent: number;
}) {
  return (
    <section
      aria-label="Totals"
      aria-live="polite"
      className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-4 text-sm"
    >
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="tabular-nums">{formatINR(totals.subtotalPaise)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">GST{gstRatePercent > 0 ? ` (${gstRatePercent}%)` : ''}</span>
        <span className="tabular-nums">
          {gstRatePercent > 0 ? formatINR(totals.gstPaise) : NIL}
        </span>
      </div>
      <div className="mt-1 flex justify-between border-t border-border pt-2 font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatINR(totals.totalPaise)}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{amountInWords(totals.totalPaise)}</p>
    </section>
  );
}
