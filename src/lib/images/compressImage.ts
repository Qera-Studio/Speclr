/**
 * Client-side image downscale + compress to a data URL.
 *
 * Used for the employee's UPI QR, which is stored inside the employee row and
 * copied into the snapshot of every stipend slip issued to them — so it has to
 * be small. There is no blob storage in this project; a bounded data URL keeps
 * it that way rather than adding a bucket, a secret and an upload endpoint for
 * one image.
 *
 * QR codes are high-contrast line art, so PNG is kept for its lossless edges
 * unless that blows the budget, in which case it steps down to JPEG quality.
 * A blurry QR is a QR that won't scan.
 */

export interface CompressOptions {
  /** Longest edge in pixels after downscaling. */
  maxDimension?: number;
  /** Hard ceiling for the resulting data URL, in characters. */
  maxBytes?: number;
}

export const DEFAULT_MAX_DIMENSION = 512;
export const DEFAULT_MAX_BYTES = 60_000;

/** Progressive fallbacks, best quality first. */
const JPEG_QUALITIES = [0.92, 0.8, 0.68, 0.55, 0.42];

export class ImageTooLargeError extends Error {
  constructor() {
    super("That image is too detailed to store. Try a smaller or simpler QR image.");
    this.name = 'ImageTooLargeError';
  }
}

export class NotAnImageError extends Error {
  constructor() {
    super('That file is not an image.');
    this.name = 'NotAnImageError';
  }
}

function scaledSize(width: number, height: number, max: number) {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const ratio = max / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new NotAnImageError());
    };
    image.src = url;
  });
}

export async function compressImageToDataUrl(
  file: File,
  { maxDimension = DEFAULT_MAX_DIMENSION, maxBytes = DEFAULT_MAX_BYTES }: CompressOptions = {},
): Promise<string> {
  if (!file.type.startsWith('image/')) throw new NotAnImageError();

  const image = await loadImage(file);
  const { width, height } = scaledSize(image.naturalWidth, image.naturalHeight, maxDimension);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new NotAnImageError();

  // White backdrop: a transparent PNG flattened onto nothing renders black-on-
  // black once it's printed on a slip.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const png = canvas.toDataURL('image/png');
  if (png.length <= maxBytes) return png;

  for (const quality of JPEG_QUALITIES) {
    const jpeg = canvas.toDataURL('image/jpeg', quality);
    if (jpeg.length <= maxBytes) return jpeg;
  }

  throw new ImageTooLargeError();
}
