/**
 * A pure, in-browser ICO container parser. An .ico is a documented binary
 * format — a 6-byte header, then a 16-byte directory entry per embedded image,
 * then the image payloads (each a PNG or a BMP). We read the bytes directly
 * rather than trying to render the file, so we can verify what the browser's
 * <img>/canvas path can't: every embedded size, that it's really an ICO (not
 * just a .ico extension), and per-layer transparency.
 *
 * References: the ICONDIR / ICONDIRENTRY layout (Microsoft ICO format).
 */

export interface IcoLayer {
  width: number;
  height: number;
  /** True if the layer carries an alpha channel (PNG RGBA/GA, or 32-bit BMP). */
  hasAlpha: boolean;
  format: 'png' | 'bmp' | 'unknown';
}

export interface IcoInfo {
  isValidIco: boolean;
  layers: IcoLayer[];
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function isPng(view: DataView, offset: number): boolean {
  if (offset + 8 > view.byteLength) return false;
  return PNG_SIGNATURE.every((b, i) => view.getUint8(offset + i) === b);
}

/** PNG: read IHDR for dimensions + colour type (6/4 carry alpha). */
function readPngLayer(view: DataView, offset: number): { width: number; height: number; hasAlpha: boolean } | null {
  // IHDR starts at offset+16 (8 sig + 4 length + 4 "IHDR"); width/height are
  // big-endian uint32 at +16/+20, colour type is the byte at +25.
  if (offset + 26 > view.byteLength) return null;
  const width = view.getUint32(offset + 16, false);
  const height = view.getUint32(offset + 20, false);
  const colorType = view.getUint8(offset + 25);
  // Colour types with alpha: 4 (grayscale+alpha), 6 (truecolour+alpha).
  const hasAlpha = colorType === 4 || colorType === 6;
  return { width, height, hasAlpha };
}

/** BMP (BITMAPINFOHEADER): 32-bit depth implies an alpha channel; height is 2x. */
function readBmpLayer(view: DataView, offset: number): { hasAlpha: boolean } | null {
  if (offset + 16 > view.byteLength) return null;
  const bitCount = view.getUint16(offset + 14, true);
  return { hasAlpha: bitCount === 32 };
}

export function parseIco(buffer: ArrayBuffer): IcoInfo {
  const view = new DataView(buffer);
  if (view.byteLength < 6) return { isValidIco: false, layers: [] };

  const reserved = view.getUint16(0, true);
  const type = view.getUint16(2, true);
  const count = view.getUint16(4, true);
  // A real ICO: reserved 0, type 1 (icon), at least one image.
  if (reserved !== 0 || type !== 1 || count === 0) return { isValidIco: false, layers: [] };
  if (6 + count * 16 > view.byteLength) return { isValidIco: false, layers: [] };

  const layers: IcoLayer[] = [];
  for (let i = 0; i < count; i++) {
    const entry = 6 + i * 16;
    // A 0 byte means 256px.
    const width = view.getUint8(entry) || 256;
    const height = view.getUint8(entry + 1) || 256;
    const dataOffset = view.getUint32(entry + 12, true);

    let hasAlpha = false;
    let format: IcoLayer['format'] = 'unknown';
    let dims = { width, height };

    if (isPng(view, dataOffset)) {
      format = 'png';
      const png = readPngLayer(view, dataOffset);
      if (png) {
        hasAlpha = png.hasAlpha;
        if (png.width) dims = { width: png.width, height: png.height };
      }
    } else {
      format = 'bmp';
      const bmp = readBmpLayer(view, dataOffset);
      if (bmp) hasAlpha = bmp.hasAlpha;
    }

    layers.push({ width: dims.width, height: dims.height, hasAlpha, format });
  }

  return { isValidIco: true, layers };
}
