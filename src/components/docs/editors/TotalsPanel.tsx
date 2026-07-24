'use client';

import { amountInWords } from '@/lib/domain/amountInWords';
import { formatINR } from '@/lib/domain/money';
import type { DocTotals } from '@/lib/domain/types';

/** Live computed totals shown beside the form. Presentational only. */
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
        <span>{formatINR(totals.subtotalPaise)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">GST{gstRatePercent > 0 ? ` (${gstRatePercent}%)` : ''}</span>
        <span>{gstRatePercent > 0 ? formatINR(totals.gstPaise) : '—'}</span>
      </div>
      <div className="mt-1 flex justify-between border-t border-border pt-2 font-semibold">
        <span>Total</span>
        <span>{formatINR(totals.totalPaise)}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{amountInWords(totals.totalPaise)}</p>
    </section>
  );
}
