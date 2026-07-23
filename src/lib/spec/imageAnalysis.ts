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

// Returns true if any pixel has alpha < 255 anywhere in the image. Skipped
// for SVG (vector — no meaningful rasterized alpha channel to sample without
// picking an arbitrary render size) and .ico (can't reliably decode).
export function detectTransparency(width: number, height: number, imageEl: HTMLImageElement): boolean | 'unknown' {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 'unknown';

  ctx.drawImage(imageEl, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}
