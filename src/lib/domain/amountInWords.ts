/**
 * Convert an integer paise amount to Indian-system words for money documents,
 * e.g. 12345678 → 'One Lakh Twenty-Three Thousand Four Hundred Fifty-Six Rupees
 * and Seventy-Eight Paise Only'.
 *
 * Pure function — safe on both server (print route) and client (live preview).
 */

import { currencyByCode, type CurrencyCode } from './currency';

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const unit = n % 10;
  return unit === 0 ? tens : `${tens}-${ONES[unit]}`;
}

function threeDigitWords(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds === 0) return twoDigitWords(rest);
  const head = `${ONES[hundreds]} Hundred`;
  return rest === 0 ? head : `${head} ${twoDigitWords(rest)}`;
}

/** Indian grouping: crore (10^7) → lakh (10^5) → thousand (10^3) → hundreds. */
function integerWords(n: number): string {
  if (n === 0) return 'Zero';

  const parts: string[] = [];

  const crore = Math.floor(n / 1e7);
  if (crore > 0) {
    // Recurse so amounts above 99 crore read naturally ('One Hundred Crore', …).
    parts.push(`${integerWords(crore)} Crore`);
  }

  const lakh = Math.floor((n % 1e7) / 1e5);
  if (lakh > 0) parts.push(`${twoDigitWords(lakh)} Lakh`);

  const thousand = Math.floor((n % 1e5) / 1e3);
  if (thousand > 0) parts.push(`${twoDigitWords(thousand)} Thousand`);

  const belowThousand = n % 1e3;
  if (belowThousand > 0) parts.push(threeDigitWords(belowThousand));

  return parts.join(' ');
}

/** International grouping: billion (10^9) → million (10^6) → thousand (10^3). */
const SCALES: [number, string][] = [
  [1e9, 'Billion'],
  [1e6, 'Million'],
  [1e3, 'Thousand'],
];

function internationalWords(n: number): string {
  if (n === 0) return 'Zero';

  const parts: string[] = [];
  let rest = n;

  for (const [value, name] of SCALES) {
    const count = Math.floor(rest / value);
    if (count > 0) {
      // Recurse so amounts above 999 billion read naturally.
      parts.push(`${count >= 1000 ? internationalWords(count) : threeDigitWords(count)} ${name}`);
      rest %= value;
    }
  }

  if (rest > 0) parts.push(threeDigitWords(rest));

  return parts.join(' ');
}

/**
 * Convert a minor-unit integer to words for a money document.
 *
 * `currency` defaults to INR and that path is unchanged — the grouping
 * (lakh/crore) and the wording ('… Rupees and … Paise Only') are exactly what
 * they were before currencies existed, because the domain tests for it are
 * lifted verbatim from the source project and must keep passing.
 *
 * Non-INR currencies use international grouping (thousand/million/billion) and
 * their own unit words. Every supported currency is 2-decimal — see the note in
 * `currency.ts`.
 */
export function amountInWords(minor: number, currency: CurrencyCode = 'INR'): string {
  if (!Number.isInteger(minor) || minor < 0) {
    throw new Error(`amountInWords expects a non-negative integer paise amount, got: ${minor}`);
  }

  const spec = currencyByCode(currency) ?? currencyByCode('INR')!;
  const major = Math.floor(minor / 100);
  const sub = minor % 100;
  const words = spec.indian ? integerWords : internationalWords;
  const majorPlural = `${spec.major}s`;

  if (major === 0 && sub === 0) return `Zero ${majorPlural} Only`;

  const parts: string[] = [];
  if (major > 0) {
    parts.push(`${words(major)} ${major === 1 ? spec.major : majorPlural}`);
  }
  if (sub > 0) {
    parts.push(`${twoDigitWords(sub)} ${sub === 1 ? spec.minor : spec.minorPlural}`);
  }

  return `${parts.join(' and ')} Only`;
}
