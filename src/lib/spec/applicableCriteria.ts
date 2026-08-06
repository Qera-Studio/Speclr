import type { IconSpec } from './types';

export interface ApplicableCriteria {
  dimensions: boolean;
  format: boolean;
  transparency: boolean;
}

/**
 * Which validation criteria actually apply to a spec — so the UI shows only the
 * checks it can genuinely run, instead of padding the list with meaningless
 * "not checked" dash rows.
 *
 * - `dimensions`  — only when the spec pins accepted sizes. Vector formats
 *   (`acceptedDimensions: []`) can render at any size, so there is nothing to
 *   pass or fail.
 * - `transparency` — only for raster formats we can rasterize and sample
 *   (png / jpeg / ico). SVG has no meaningful rasterized alpha channel, and for
 *   the Safari pinned-tab a transparent silhouette is *expected* — either way,
 *   an automatic transparency verdict is not something to surface.
 * - `format` — always applicable; it is the one substantive check for a vector.
 */
export function applicableCriteria(spec: IconSpec): ApplicableCriteria {
  return {
    dimensions: spec.acceptedDimensions.length > 0,
    format: true,
    transparency: spec.format !== 'svg',
  };
}
