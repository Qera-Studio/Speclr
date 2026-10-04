import 'server-only';
import { z } from 'zod';
import { CURRENCY_CODES, type DayRates } from '@/lib/domain/currency';
import { logger } from '@/lib/logger';

/**
 * Today's rates out of INR, for the clients list's currency toggle.
 *
 * **For that list and nothing else.** `currency.ts` explains why an invoice is
 * INR whatever a client is billed in, and `docs/vendors.md` §1.5 why a market
 * rate is the right tool for a reading convenience and the wrong one for
 * anything a tax return keys off. A document importing this module is the
 * compliance bug both describe; the deviation is logged in `PRINCIPLES.md`.
 *
 * Fetched here, on the server, for the reasons the postcode proxy gives: the
 * third-party hostname stays out of the browser, the page that calls it is
 * already session-gated, and a provider swap is one file. Next's data cache
 * holds the answer for six hours across requests, which is the right cadence
 * for an upstream that moves once a day and means a new day's rate is on
 * screen by lunchtime IST.
 *
 * **Failure is silent and costs the toggle, never the figure.** The list's
 * amount is the INR total on the record whether or not this answers, so a slow
 * or dead upstream must not hold the page: three seconds, then null.
 *
 * ExchangeRate-API's open endpoint asks for attribution, which is why `source`
 * travels with the rates and the toggle's tooltip prints it.
 */

const UPSTREAM = 'https://open.er-api.com/v6/latest/INR';
const SOURCE = 'ExchangeRate-API';
const TIMEOUT_MS = 3000;
const REVALIDATE_SECONDS = 21600;

/** The fields read, and nothing more: an upstream's shape is not ours to trust. */
const upstreamSchema = z.object({
  result: z.literal('success'),
  time_last_update_unix: z.number().int().positive(),
  rates: z.record(z.string(), z.number().positive()),
});

export async function inrRatesToday(): Promise<DayRates | null> {
  try {
    const response = await fetch(UPSTREAM, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`upstream answered ${response.status}`);
    const body = upstreamSchema.parse(await response.json());

    const rates: DayRates['rates'] = {};
    for (const code of CURRENCY_CODES) {
      const rate = body.rates[code];
      if (code !== 'INR' && rate) rates[code] = rate;
    }

    return { asOf: utcDateOf(body.time_last_update_unix), rates, source: SOURCE };
  } catch (err) {
    logger.warn({ action: 'inrRatesToday', event: 'rates_unavailable', error: err });
    return null;
  }
}

/**
 * The calendar date of a unix timestamp, in UTC.
 *
 * UTC on purpose, and not the local-calendar rule `domain/dates.ts` insists on
 * for *today*: this is the upstream's own stamp, taken at 00:00 UTC on the day
 * it means, so the UTC date is the day the rate is for. Reading it in IST would
 * name the same day for a different reason and a different day for a source
 * that published in the evening.
 */
function utcDateOf(unixSeconds: number): string {
  const at = new Date(unixSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`;
}
