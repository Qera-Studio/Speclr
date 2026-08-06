import type { IcoLayer } from './parseIco';
import type { IconDimensions } from './types';

export interface IcoDimensionsVerdict {
  dimensionsOk: boolean;
  /** Set when the pass is partial (some accepted sizes missing) or on failure. */
  note?: string;
}

function fmt(sizes: number[]): string {
  return sizes.map((s) => `${s}×${s}`).join(', ');
}

/**
 * Grade a .ico's embedded sizes against the spec's accepted sizes.
 * - all accepted sizes present  → full pass, no note.
 * - some present               → pass, but note which are present / missing.
 * - none present               → fail.
 */
export function evaluateIcoDimensions(layers: IcoLayer[], accepted: IconDimensions[]): IcoDimensionsVerdict {
  const acceptedSizes = accepted.map((d) => d.width);
  const embedded = new Set(layers.map((l) => l.width));

  const present = acceptedSizes.filter((s) => embedded.has(s));
  const missing = acceptedSizes.filter((s) => !embedded.has(s));

  if (present.length === 0) {
    return {
      dimensionsOk: false,
      note: `None of the expected sizes (${fmt(acceptedSizes)}) are embedded in this .ico.`,
    };
  }
  if (missing.length === 0) {
    return { dimensionsOk: true };
  }
  return {
    dimensionsOk: true,
    note: `Passed with ${fmt(present)} embedded — missing ${fmt(missing)}.`,
  };
}
