// Client-side image analysis — no library, just Image + Canvas. Runs entirely
// in the browser against a local File (blob: URL), so cross-origin/CORS rules
// never apply here.

export interface LoadedImage {
  width: number;
  height: number;
  objectUrl: string;
}

export function loadImageDimensions(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight, objectUrl: url });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode image'));
    };
    img.src = url;
  });
}

// .ico cannot be reliably decoded by <img>/Image() across browsers (Safari in
// particular) — callers should skip loadImageDimensions/detectTransparency
// for that format and fall back to filename/MIME-only checks instead.
export function isIcoFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.ico');
}

export function isSvgFile(file: File): boolean {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
}

/** Draw an image into a fresh 2d canvas and hand back its context, or null. */
function drawToCanvas(
  width: number,
  height: number,
  imageEl: HTMLImageElement,
): CanvasRenderingContext2D | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(imageEl, 0, 0, width, height);
  return ctx;
}

// Returns true if any pixel has alpha < 255 anywhere in the image. Skipped
// for SVG (vector — no meaningful rasterized alpha channel to sample without
// picking an arbitrary render size) and .ico (can't reliably decode).
export function detectTransparency(width: number, height: number, imageEl: HTMLImageElement): boolean | 'unknown' {
  const result = analyzePixels(width, height, imageEl);
  return result ? result.hasAlpha : 'unknown';
}

export interface PixelAnalysis {
  /** Any pixel with alpha < 255. */
  hasAlpha: boolean;
  /** Every pixel is byte-for-byte identical — an all-one-colour or fully
   *  transparent image, almost always a placeholder or failed export. */
  isBlank: boolean;
}

/**
 * One pass over the pixel buffer that answers both "is there transparency?" and
 * "is this image blank?" — cheaper than scanning twice. Returns null when a 2d
 * context is unavailable (e.g. some headless environments).
 */
export function analyzePixels(width: number, height: number, imageEl: HTMLImageElement): PixelAnalysis | null {
  const ctx = drawToCanvas(width, height, imageEl);
  if (!ctx) return null;

  const { data } = ctx.getImageData(0, 0, width, height);
  let hasAlpha = false;
  let isBlank = true;

  const r0 = data[0];
  const g0 = data[1];
  const b0 = data[2];
  const a0 = data[3];

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 255) hasAlpha = true;
    if (isBlank && (data[i] !== r0 || data[i + 1] !== g0 || data[i + 2] !== b0 || data[i + 3] !== a0)) {
      isBlank = false;
    }
    // Once we know it has alpha AND isn't blank, nothing else can change.
    if (hasAlpha && !isBlank) break;
  }

  return { hasAlpha, isBlank };
}

/**
 * Advisory for maskable PWA icons: opaque, non-background content in the outer
 * 20% ring will be clipped by the OS adaptive-icon mask. Keep essential detail
 * inside the inner 80% safe zone. Returns null when no ring content bleeds, or
 * when a 2d context is unavailable.
 */
export function checkSafeZone(
  width: number,
  height: number,
  imageEl: HTMLImageElement,
): import('./types').QualityWarning | null {
  const ctx = drawToCanvas(width, height, imageEl);
  if (!ctx) return null;

  const { data } = ctx.getImageData(0, 0, width, height);
  const marginX = Math.floor(width * 0.1);
  const marginY = Math.floor(height * 0.1);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inRing = x < marginX || y < marginY || x >= width - marginX || y >= height - marginY;
      if (!inRing) continue;
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 0) {
        return {
          kind: 'safe-zone',
          message:
            'Content in the mask clip region — keep the logo inside the inner 80% safe zone (the OS may crop the outer edge)',
        };
      }
    }
  }
  return null;
}
