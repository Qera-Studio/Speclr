'use client';

import { useCallback, useState } from 'react';
import type { IconSpec, ValidationResult } from './types';
import { detectTransparency, isIcoFile, isSvgFile, loadImageDimensions } from './imageAnalysis';

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

      // .ico can't be reliably decoded by Image() cross-browser — skip pixel
      // checks entirely and report the limitation honestly rather than guess.
      if (spec.format === 'ico') {
        const objectUrl = URL.createObjectURL(file);
        return {
          dimensionsOk: 'unknown',
          formatOk,
          transparency: 'unknown',
          transparencyIsWarning: false,
          objectUrl,
          actualFormat: file.type || file.name.split('.').pop(),
          note: "Automatic pixel inspection isn't supported for .ico in-browser — open it in an OS previewer to confirm the embedded 16/32/48px layers.",
        };
      }

      const { width, height, objectUrl } = await loadImageDimensions(file);
      const dimensionsOk = matchesAcceptedDimensions(spec, width, height);

      // SVG is vector — no meaningful rasterized alpha channel to sample.
      if (spec.format === 'svg' || isSvgFile(file)) {
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
        };
      }

      const img = new Image();
      const decodedForCanvas = await new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Could not decode image for transparency check'));
        img.src = objectUrl;
      });
      const transparencyResult = detectTransparency(width, height, decodedForCanvas);
      const transparency: ValidationResult['transparency'] =
        transparencyResult === 'unknown' ? 'unknown' : transparencyResult ? 'transparent' : 'opaque';

      return {
        dimensionsOk,
        formatOk,
        transparency,
        transparencyIsWarning: transparency === 'transparent' && spec.requireOpaque,
        actualWidth: width,
        actualHeight: height,
        actualFormat: file.type,
        objectUrl,
      };
    } finally {
      setIsValidating(false);
    }
  }, []);

  return { validateFile, isValidating };
}
