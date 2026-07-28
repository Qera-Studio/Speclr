'use client';

import { useCallback, useState } from 'react';
import type { IconSpec, QualityWarning, ValidationResult } from './types';
import { analyzePixels, checkSafeZone, isIcoFile, isSvgFile, loadImageDimensions } from './imageAnalysis';
import { parseIco } from './parseIco';
import { evaluateIcoDimensions } from './evaluateIco';
import { checkAspectRatio, checkFileWeight } from './qualityChecks';
import { analyzeSvg } from './svgHygiene';

/** Drop nulls from a list of optional warnings. */
function compact(...ws: (QualityWarning | null)[]): QualityWarning[] {
  return ws.filter((w): w is QualityWarning => w !== null);
}

function matchesAcceptedDimensions(spec: IconSpec, width: number, height: number): boolean {
  if (spec.acceptedDimensions.length === 0) return true; // vector formats — no fixed px spec
  return spec.acceptedDimensions.some((d) => d.width === width && d.height === height);
}

function formatMatches(spec: IconSpec, file: File): boolean {
  if (spec.format === 'ico') return isIcoFile(file);
  if (spec.format === 'svg') return isSvgFile(file);
  if (spec.format === 'png') return file.type === 'image/png';
  if (spec.format === 'jpeg') return file.type === 'image/jpeg';
  return false;
}

export function useImageValidation() {
  const [isValidating, setIsValidating] = useState(false);

  const validateFile = useCallback(async (file: File, spec: IconSpec): Promise<ValidationResult> => {
    setIsValidating(true);
    try {
      const formatOk = formatMatches(spec, file);

      // .ico can't be rendered reliably by Image()/canvas — but it's a
      // documented binary container, so we parse its bytes directly to verify
      // the embedded sizes, that it's really an ICO, and per-layer transparency.
      if (spec.format === 'ico') {
        const objectUrl = URL.createObjectURL(file);
        const info = parseIco(await file.arrayBuffer());

        if (!info.isValidIco) {
          return {
            dimensionsOk: 'unknown',
            formatOk: false,
            transparency: 'unknown',
            transparencyIsWarning: false,
            objectUrl,
            actualFormat: file.type || file.name.split('.').pop(),
            note: "This file isn't a valid .ico container (its bytes don't match the ICO format).",
          };
        }

        const { dimensionsOk, note } = evaluateIcoDimensions(info.layers, spec.acceptedDimensions);
        const anyAlpha = info.layers.some((l) => l.hasAlpha);
        const transparency: ValidationResult['transparency'] = anyAlpha ? 'transparent' : 'opaque';
        const sizes = info.layers.map((l) => `${l.width}×${l.height}`).join(', ');

        return {
          dimensionsOk,
          formatOk,
          transparency,
          transparencyIsWarning: anyAlpha && spec.requireOpaque,
          objectUrl,
          actualFormat: `ICO (${info.layers.length} layer${info.layers.length === 1 ? '' : 's'}: ${sizes})`,
          note,
          warnings: compact(checkFileWeight(file.size, spec)),
        };
      }

      const { width, height, objectUrl } = await loadImageDimensions(file);
      const dimensionsOk = matchesAcceptedDimensions(spec, width, height);

      // SVG is vector — no meaningful rasterized alpha channel to sample. Its
      // quality checks are text-based hygiene (viewBox, no embedded raster,
      // no external refs, monochrome for the pinned-tab) plus file weight.
      if (spec.format === 'svg' || isSvgFile(file)) {
        const svgText = await file.text();
        return {
          dimensionsOk: 'unknown',
          formatOk,
          transparency: 'unknown',
          transparencyIsWarning: false,
          actualWidth: width,
          actualHeight: height,
          actualFormat: file.type || 'image/svg+xml',
          objectUrl,
          note: 'Transparency is a design choice for vector assets, not checked automatically.',
          warnings: compact(checkFileWeight(file.size, spec), ...analyzeSvg(svgText, spec)),
        };
      }

      const img = new Image();
      const decodedForCanvas = await new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Could not decode image for transparency check'));
        img.src = objectUrl;
      });
      const pixels = analyzePixels(width, height, decodedForCanvas);
      const transparency: ValidationResult['transparency'] =
        pixels === null ? 'unknown' : pixels.hasAlpha ? 'transparent' : 'opaque';

      // Advisory quality nudges — never affect the pass/fail verdict.
      const warnings = compact(
        checkAspectRatio(width, height, spec),
        checkFileWeight(file.size, spec),
        pixels?.isBlank
          ? ({ kind: 'blank', message: 'Image appears blank — every pixel is identical (likely a placeholder or failed export)' } satisfies QualityWarning)
          : null,
        // The maskable safe-zone check only applies to maskable manifest icons.
        spec.previewMockup === 'maskableSafeZone' ? checkSafeZone(width, height, decodedForCanvas) : null,
      );

      return {
        dimensionsOk,
        formatOk,
        transparency,
        transparencyIsWarning: transparency === 'transparent' && spec.requireOpaque,
        actualWidth: width,
        actualHeight: height,
        actualFormat: file.type,
        objectUrl,
        warnings,
      };
    } finally {
      setIsValidating(false);
    }
  }, []);

  return { validateFile, isValidating };
}
