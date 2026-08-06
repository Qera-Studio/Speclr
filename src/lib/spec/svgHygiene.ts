import type { IconSpec, QualityWarning } from './types';

/**
 * Advisory checks for SVG assets — the one substantive verification a vector
 * gets beyond "is it an SVG". Pure text/DOM analysis, no rasterization.
 *
 * - viewBox present      — without it the SVG has no intrinsic coordinate system
 *                          and scales unpredictably in a favicon slot.
 * - no embedded raster   — an <image> defeats the point of a vector favicon.
 * - no external refs      — href/xlink:href to a remote URL won't resolve as a
 *                          favicon and is a fetch/tracking surface.
 * - monochrome (pinned-tab only) — Safari recolours the mask-icon via its color
 *                          attribute, so it must be a single-colour silhouette.
 */
export function analyzeSvg(text: string, spec: IconSpec): QualityWarning[] {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  // Not parseable as SVG (or a parser error) — the format check owns that verdict.
  if (!svg || doc.querySelector('parsererror')) return [];

  const warnings: QualityWarning[] = [];

  if (!svg.getAttribute('viewBox')) {
    warnings.push({
      kind: 'svg-viewbox',
      message: 'No viewBox — add one so the icon scales predictably at any size',
    });
  }

  if (doc.querySelector('image')) {
    warnings.push({
      kind: 'svg-raster',
      message: 'Embeds a raster <image> — this defeats the crispness of a vector favicon',
    });
  }

  // Any href / xlink:href pointing off-document (http(s):// or //) is external.
  // xlink:href lives in a namespace, so inspect every attribute whose local
  // name is "href" regardless of prefix.
  const hasExternal = Array.from(doc.querySelectorAll('*')).some((el) =>
    Array.from(el.attributes).some(
      (attr) => attr.localName === 'href' && /^(https?:)?\/\//i.test(attr.value),
    ),
  );
  if (hasExternal) {
    warnings.push({
      kind: 'svg-external-ref',
      message: 'References an external URL — favicons must be self-contained',
    });
  }

  if (spec.id === 'safari-pinned-tab') {
    const colors = new Set<string>();
    doc.querySelectorAll('[fill], [stroke]').forEach((el) => {
      for (const attr of ['fill', 'stroke'] as const) {
        const v = el.getAttribute(attr);
        if (v && v.toLowerCase() !== 'none') colors.add(v.toLowerCase());
      }
    });
    if (colors.size > 1) {
      warnings.push({
        kind: 'svg-monochrome',
        message: `Uses ${colors.size} colours — Safari expects a single-colour silhouette (it recolours the icon itself)`,
      });
    }
  }

  return warnings;
}
