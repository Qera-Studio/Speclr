import type { IconSpec, QualityWarning } from './types';

/** Human-readable file size, e.g. "812 KB" or "1.2 MB". */
function humanSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Advisory: an icon meant to be square that isn't. Non-square icons get
 * squished by browsers into their square slot. Skipped for specs that are
 * intentionally non-square (the landscape OG image), which we detect from the
 * spec's own accepted dimensions.
 */
export function checkAspectRatio(width: number, height: number, spec: IconSpec): QualityWarning | null {
  // A spec whose only accepted dimension is itself non-square is meant to be
  // non-square (e.g. 1200×630 OG) — never warn there.
  const expectsSquare = spec.acceptedDimensions.every((d) => d.width === d.height);
  if (!expectsSquare) return null;
  if (width === height) return null;

  return {
    kind: 'aspect-ratio',
    message: `Not square — ${width}×${height} (icons should be 1:1; browsers stretch non-square icons)`,
  };
}

/**
 * Per-spec file-weight budget in bytes. Larger canvases and full design assets
 * (OG) get more room; a tiny favicon should be tiny. Derived from the spec's
 * largest accepted pixel area with a sensible floor, so we don't maintain a
 * hand-tuned table per id.
 */
function weightBudgetBytes(spec: IconSpec): number {
  const maxArea = spec.acceptedDimensions.reduce((m, d) => Math.max(m, d.width * d.height), 0);
  // Vectors (no fixed size) should be tiny — a heavy SVG is almost always an
  // embedded raster or bloat.
  if (maxArea === 0) return 50 * 1024;
  // ~0.6 bytes/px is generous for a well-optimized PNG/ICO, with a 100 KB floor
  // so small icons still have breathing room and a 700 KB ceiling for big assets.
  const budget = Math.round(maxArea * 0.6);
  return Math.min(Math.max(budget, 100 * 1024), 700 * 1024);
}

/** Advisory: the file is heavier than sensible for its role — usually an un-optimized export. */
export function checkFileWeight(bytes: number, spec: IconSpec): QualityWarning | null {
  const budget = weightBudgetBytes(spec);
  if (bytes <= budget) return null;
  return {
    kind: 'file-weight',
    message: `Large file — ${humanSize(bytes)} (consider optimizing under ~${humanSize(budget)})`,
  };
}
