/**
 * Convert an integer paise amount to Indian-system words for money documents,
 * e.g. 12345678 → 'One Lakh Twenty-Three Thousand Four Hundred Fifty-Six Rupees
 * and Seventy-Eight Paise Only'.
 *
 * Pure function — safe on both server (print route) and client (live preview).
 */

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

export function amountInWords(paise: number): string {
  if (!Number.isInteger(paise) || paise < 0) {
    throw new Error(`amountInWords expects a non-negative integer paise amount, got: ${paise}`);
  }

  const rupees = Math.floor(paise / 100);
  const p = paise % 100;

  if (rupees === 0 && p === 0) return 'Zero Rupees Only';

  const parts: string[] = [];
  if (rupees > 0) {
    parts.push(`${integerWords(rupees)} ${rupees === 1 ? 'Rupee' : 'Rupees'}`);
  }
  if (p > 0) {
    parts.push(`${twoDigitWords(p)} ${p === 1 ? 'Paisa' : 'Paise'}`);
  }

  return `${parts.join(' and ')} Only`;
}
