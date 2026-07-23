/**
 * Document number formatting — pure, no Redis. The atomic serial claim lives
 * in counter.ts; this only turns (type, FY code, serial) into the display
 * number, e.g. 'QS-INV-2526-003' for FY 2025-26.
 */

import type { DocTypeCode } from './types';

/** formatDocNumber('INV', '2526', 3) → 'QS-INV-2526-003'. Pads to 3, grows past 999 naturally. */
export function formatDocNumber(code: DocTypeCode, fyCode: string, serial: number): string {
  if (!/^\d{4}$/.test(fyCode)) {
    throw new Error(`formatDocNumber expects a 4-digit financial-year code, got: ${fyCode}`);
  }
  if (!Number.isInteger(serial) || serial < 1) {
    throw new Error(`formatDocNumber expects a positive integer serial, got: ${serial}`);
  }
  return `QS-${code}-${fyCode}-${String(serial).padStart(3, '0')}`;
}
