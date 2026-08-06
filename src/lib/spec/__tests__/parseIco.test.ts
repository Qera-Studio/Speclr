import { parseIco } from '../parseIco';

/**
 * Build a minimal ICO ArrayBuffer with the given layer specs. Each layer gets a
 * 16-byte directory entry; we point every entry at a tiny fabricated payload
 * (PNG signature or BMP header) so the parser can classify + read it.
 */
function buildIco(layers: Array<{ width: number; height: number; kind: 'png32' | 'bmp32' | 'bmp24' }>): ArrayBuffer {
  const HEADER = 6;
  const ENTRY = 16;
  // Fabricate payloads.
  const payloads = layers.map((l) => {
    if (l.kind === 'png32') {
      // PNG signature + IHDR (width, height, bitDepth=8, colorType=6 = RGBA).
      const buf = new Uint8Array(8 + 4 + 4 + 13 + 4);
      buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0); // signature
      const dv = new DataView(buf.buffer);
      // length + "IHDR"
      dv.setUint32(8, 13);
      buf.set([0x49, 0x48, 0x44, 0x52], 12); // IHDR
      dv.setUint32(16, l.width);
      dv.setUint32(20, l.height);
      buf[24] = 8; // bit depth
      buf[25] = 6; // color type 6 = truecolor + alpha
      return buf;
    }
    // BMP (BITMAPINFOHEADER): 40 bytes. height is doubled in ICO (XOR+AND mask).
    const buf = new Uint8Array(40);
    const dv = new DataView(buf.buffer);
    dv.setUint32(0, 40, true); // header size
    dv.setInt32(4, l.width, true);
    dv.setInt32(8, l.height * 2, true); // ICO stores 2x height
    dv.setUint16(14, l.kind === 'bmp32' ? 32 : 24, true); // bit count
    return buf;
  });

  const total = HEADER + ENTRY * layers.length + payloads.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint16(0, 0, true); // reserved
  dv.setUint16(2, 1, true); // type = 1 (icon)
  dv.setUint16(4, layers.length, true); // count

  let payloadOffset = HEADER + ENTRY * layers.length;
  layers.forEach((l, i) => {
    const entry = HEADER + i * ENTRY;
    out[entry] = l.width === 256 ? 0 : l.width; // 0 means 256
    out[entry + 1] = l.height === 256 ? 0 : l.height;
    dv.setUint32(entry + 8, payloads[i].length, true); // bytes in resource
    dv.setUint32(entry + 12, payloadOffset, true); // offset
    out.set(payloads[i], payloadOffset);
    payloadOffset += payloads[i].length;
  });

  return out.buffer;
}

describe('parseIco', () => {
  it('rejects data that is not an ICO container', () => {
    const notIco = new Uint8Array([0, 0, 9, 9, 1, 0]).buffer; // wrong type field
    expect(parseIco(notIco).isValidIco).toBe(false);
  });

  it('reads the embedded layer sizes', () => {
    const ico = buildIco([
      { width: 16, height: 16, kind: 'png32' },
      { width: 32, height: 32, kind: 'bmp24' },
      { width: 48, height: 48, kind: 'bmp32' },
    ]);
    const result = parseIco(ico);
    expect(result.isValidIco).toBe(true);
    expect(result.layers.map((l) => l.width).sort((a, b) => a - b)).toEqual([16, 32, 48]);
  });

  it('detects a PNG RGBA layer as having alpha', () => {
    const ico = buildIco([{ width: 32, height: 32, kind: 'png32' }]);
    expect(parseIco(ico).layers[0].hasAlpha).toBe(true);
  });

  it('detects a 32-bit BMP layer as having alpha, a 24-bit BMP as opaque', () => {
    const ico = buildIco([
      { width: 16, height: 16, kind: 'bmp32' },
      { width: 32, height: 32, kind: 'bmp24' },
    ]);
    const byW = Object.fromEntries(parseIco(ico).layers.map((l) => [l.width, l]));
    expect(byW[16].hasAlpha).toBe(true);
    expect(byW[32].hasAlpha).toBe(false);
  });

  it('treats a 0 width/height byte as 256', () => {
    const ico = buildIco([{ width: 256, height: 256, kind: 'png32' }]);
    expect(parseIco(ico).layers[0].width).toBe(256);
  });
});
