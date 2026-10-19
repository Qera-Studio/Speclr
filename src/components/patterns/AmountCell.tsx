'use client';

import { useState, type ReactNode } from 'react';
import { RaisedChip } from '@/components/patterns/LocationCell';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { convertMinor, currencyByCode, type CurrencyCode } from '@/lib/domain/currency';
import { formatDisplayDate } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';

/**
 * A money figure with its currency symbol in a raised chip, matching the flag.
 *
 * **It sits in `admin/` rather than beside the table that first wanted it, and
 * the move is `PRINCIPLES.md` rule 1 fired late.** It was written for the
 * clients table and parented under it, which was right while that was its only
 * caller. It was not: `services/ItemsTable` was importing it back out through
 * the clients folder, which is the shape the rule exists to stop, and the
 * template table in `library/table/` made a third. A record referenced by more
 * than one caller is a shared record, not a child of whichever surface happened
 * to touch it first. Same home and same reason as `LocationCell` and
 * `PersonCell` beside it.
 *
 * The chip is `LocationCell`'s (`RaisedChip`), not a second copy of the same
 * shadow recipe: two boxes that are meant to look identical and are written
 * twice are two boxes that stop looking identical the first time either is
 * touched. That is `PRINCIPLES.md` rule 1 applied to presentation, the same way
 * `DateCell` and `CopyValue` are.
 *
 * **The digits are `formatMoney`'s, untouched.** The symbol is split off what
 * the formatter produced rather than the number being re-formatted here, so a
 * rupee figure is byte-identical to the same figure on an invoice: Indian digit
 * grouping for INR, the locale's own for everything else, two decimals and
 * integer minor units throughout (`CONTEXT.md` §1). Money formatting has
 * exactly one owner and this is not it.
 *
 * **With `local`, the chip is a toggle between two currencies.** The figure
 * arrives in its own currency (the clients list's is INR, because the rates
 * are typed in rupees) and opens in the client's, converted at the rate for
 * the day named; the chip flips it back. It is a toggle button in the ARIA
 * sense: one constant name and `aria-pressed` for which state it is in, so a
 * screen reader hears "Show in Pound Sterling, pressed" rather than a label
 * that changes under it. A `local` that is the figure's own currency is
 * nothing to toggle to, so an Indian client gets the plain chip. The rate, the
 * day and who published it are in the tooltip: a converted figure with no
 * rate beside it reads as a fact, and this one is a reading of the day.
 *
 * **What this is not.** There is no exchange rate anywhere else in the app and
 * `currency.ts` says why invoices stay INR regardless of what a client is
 * billed in. This conversion is display arithmetic for a list, the only
 * caller of `convertMinor`, and nothing that prints on a document may reach
 * for it. A client's agreed billing currency is a different fact
 * (`commercial.currency`) and would be a different column, not a conversion
 * of this one.
 *
 * `aria-hidden` on the chip is inherited from `RaisedChip`, so the currency is
 * spoken from the `sr-only` text rather than from a symbol a screen reader may
 * or may not name. A figure read out as "1,37,000.00" with no unit is a figure
 * that could be anything, and '£' and '$' are exactly the case where guessing
 * costs the reader the meaning.
 */

/** The second currency a figure can be read in: the client's own, at a day's rate. */
export interface LocalCurrency {
  currency: CurrencyCode;
  /** What one unit of the figure's currency buys in this one, on `asOf`. */
  rate: number;
  /** ISO date the rate was published. */
  asOf: string;
  /** Who published it, printed in the tooltip as attribution. */
  source: string;
}

function nameOf(code: CurrencyCode): string {
  return currencyByCode(code)?.name ?? code;
}

export function AmountCell({
  minor,
  currency,
  local,
  chipClassName,
  suffix,
  below,
}: {
  /** Integer minor units (paise, pence, cents), as all money here is. */
  minor: number;
  currency: CurrencyCode;
  local?: LocalCurrency;
  /** Resizes the symbol chip, for a two-line cell whose other marks are larger. */
  chipClassName?: string;
  /** Muted, right after the figure: '/mo'. */
  suffix?: ReactNode;
  /**
   * A second line under the figure, not under the chip: the chip stands for
   * both lines, so the text column starts after it on each.
   */
  below?: ReactNode;
}) {
  // Opens in the client's currency, which is what the row is for; the chip is
  // the way back to the figure as stored.
  const [showLocal, setShowLocal] = useState(true);
  const other = local && local.currency !== currency ? local : undefined;
  const shown =
    other && showLocal
      ? { minor: convertMinor(minor, other.rate), currency: other.currency }
      : { minor, currency };

  const formatted = formatMoney(shown.minor, shown.currency);
  // `formatMoney` returns '₹ 1,37,000.00' / '£ 62,000.00'. The space is the
  // split point, and it is part of that function's contract rather than a
  // guess: both branches write the symbol, a space, then the digits.
  const [symbol, ...rest] = formatted.split(' ');
  const digits = rest.join(' ');

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {other ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-pressed={showLocal}
                aria-label={`Show in ${nameOf(other.currency)}`}
                onClick={() => setShowLocal((value) => !value)}
                // `relative z-10` for the reason `CopyValue` carries it: the
                // row is one stretched link, and a control under the overlay
                // is a control the overlay gets the click for.
                className="relative z-10 cursor-pointer rounded-sm focus-ring focus-visible:outline-none"
              />
            }
          >
            <RaisedChip className={chipClassName}>{symbol}</RaisedChip>
          </TooltipTrigger>
          <TooltipContent>
            1 {currency} = {Number(other.rate.toPrecision(4))} {other.currency} on{' '}
            {formatDisplayDate(other.asOf)}. Rates by {other.source}.
          </TooltipContent>
        </Tooltip>
      ) : (
        <RaisedChip className={chipClassName}>{symbol}</RaisedChip>
      )}
      <span className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-baseline gap-1">
          {/* The currency's own name, so the figure is spoken as money rather
              than as a bare number: "Pound Sterling 492.90" is awkward but
              unambiguous. */}
          <span className="sr-only">{nameOf(shown.currency)} </span>
          <span className="truncate">{digits}</span>
          {suffix ? <span className="shrink-0 text-meta text-muted-foreground">{suffix}</span> : null}
        </span>
        {below ? (
          <span className="truncate text-meta text-muted-foreground">{below}</span>
        ) : null}
      </span>
    </span>
  );
}
