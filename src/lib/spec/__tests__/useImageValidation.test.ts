import { renderHook, act } from '@testing-library/react';
import { useImageValidation } from '../useImageValidation';
import { ICON_SPECS } from '../iconSpecData';
import type { ValidationResult } from '../types';

/** A File whose bytes are readable via arrayBuffer() (jsdom's File lacks it). */
function icoFile(sizes: number[]): File {
  const buffer = makeIco(sizes);
  const file = new File([buffer], 'favicon.ico', { type: 'image/x-icon' });
  Object.defineProperty(file, 'arrayBuffer', { value: () => Promise.resolve(buffer) });
  return file;
}

/** Build a valid ICO with opaque 24-bit BMP layers at the given sizes. */
function makeIco(sizes: number[]): ArrayBuffer {
  const HEADER = 6;
  const ENTRY = 16;
  const BMP = 40;
  const total = HEADER + ENTRY * sizes.length + BMP * sizes.length;
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint16(2, 1, true); // type = icon
  dv.setUint16(4, sizes.length, true); // count
  let payload = HEADER + ENTRY * sizes.length;
  sizes.forEach((s, i) => {
    const entry = HEADER + i * ENTRY;
    out[entry] = s === 256 ? 0 : s;
    out[entry + 1] = s === 256 ? 0 : s;
    dv.setUint32(entry + 8, BMP, true);
    dv.setUint32(entry + 12, payload, true);
    dv.setUint32(payload, 40, true); // BITMAPINFOHEADER size
    dv.setInt32(payload + 4, s, true);
    dv.setInt32(payload + 8, s * 2, true);
    dv.setUint16(payload + 14, 24, true); // 24-bit = opaque
    payload += BMP;
  });
  return out.buffer;
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth: number;
  naturalHeight: number;

  constructor(width: number, height: number) {
    this.naturalWidth = width;
    this.naturalHeight = height;
  }

  set src(_value: string) {
    if (this.onload) this.onload();
  }
}

function mockOpaqueCanvas() {
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: jest.fn(),
    getImageData: () => ({ data: new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255]) }),
  } as unknown as CanvasRenderingContext2D);
}

function mockTransparentCanvas() {
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: jest.fn(),
    getImageData: () => ({ data: new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 0]) }),
  } as unknown as CanvasRenderingContext2D);
}

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:mock') });
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: jest.fn() });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function mockImageWithSize(width: number, height: number) {
  const OriginalImage = global.Image;
  // @ts-expect-error — intentional minimal test double
  global.Image = class extends MockImage {
    constructor() {
      super(width, height);
    }
  };
  return () => {
    global.Image = OriginalImage;
  };
}

describe('useImageValidation', () => {
  it('passes a PNG that matches the exact required dimensions and is opaque', async () => {
    const restore = mockImageWithSize(192, 192);
    mockOpaqueCanvas();
    const spec = ICON_SPECS.find((s) => s.id === 'favicon-192')!;
    const file = new File(['x'], 'favicon-192x192.png', { type: 'image/png' });

    const { result } = renderHook(() => useImageValidation());
    let validation;
    await act(async () => {
      validation = await result.current.validateFile(file, spec);
    });

    expect(validation).toMatchObject({
      dimensionsOk: true,
      formatOk: true,
      transparency: 'opaque',
      transparencyIsWarning: false,
    });
    restore();
  });

  it('flags wrong dimensions as a fail', async () => {
    const restore = mockImageWithSize(64, 64);
    mockOpaqueCanvas();
    const spec = ICON_SPECS.find((s) => s.id === 'favicon-192')!;
    const file = new File(['x'], 'favicon-192x192.png', { type: 'image/png' });

    const { result } = renderHook(() => useImageValidation());
    let validation;
    await act(async () => {
      validation = await result.current.validateFile(file, spec);
    });

    expect(validation).toMatchObject({ dimensionsOk: false });
    restore();
  });

  it('flags transparency as a warning when the spec requires opacity', async () => {
    const restore = mockImageWithSize(180, 180);
    mockTransparentCanvas();
    const spec = ICON_SPECS.find((s) => s.id === 'apple-touch-icon')!;
    const file = new File(['x'], 'apple-touch-icon.png', { type: 'image/png' });

    const { result } = renderHook(() => useImageValidation());
    let validation;
    await act(async () => {
      validation = await result.current.validateFile(file, spec);
    });

    expect(validation).toMatchObject({ transparency: 'transparent', transparencyIsWarning: true });
    restore();
  });

  it('parses a real .ico container and verifies its embedded sizes + transparency', async () => {
    const spec = ICON_SPECS.find((s) => s.id === 'favicon-ico')!;
    // A valid ICO bundling opaque 16/32/48 BMP-24 layers (all accepted sizes).
    const file = icoFile([16, 32, 48]);

    const { result } = renderHook(() => useImageValidation());
    let validation;
    await act(async () => {
      validation = await result.current.validateFile(file, spec);
    });

    // Fully verified: all sizes present → dimensions pass, no shortfall note,
    // opaque BMP layers → no transparency warning.
    expect(validation).toMatchObject({ dimensionsOk: true, transparency: 'opaque', formatOk: true });
    expect(validation!.transparencyIsWarning).toBe(false);
    expect(validation!.note).toBeUndefined();
  });

  it('notes the shortfall when a .ico is missing an accepted size', async () => {
    const spec = ICON_SPECS.find((s) => s.id === 'favicon-ico')!;
    const file = icoFile([16, 32]);

    const { result } = renderHook(() => useImageValidation());
    let validation;
    await act(async () => {
      validation = await result.current.validateFile(file, spec);
    });

    expect(validation!.dimensionsOk).toBe(true);
    expect(validation!.note).toMatch(/missing.*48/i);
  });

  it('warns (advisory) when a square-expecting icon is not square, without failing it', async () => {
    const restore = mockImageWithSize(192, 180); // not square
    mockOpaqueCanvas();
    const spec = ICON_SPECS.find((s) => s.id === 'favicon-192')!;
    const file = new File(['x'], 'favicon-192x192.png', { type: 'image/png' });

    const { result } = renderHook(() => useImageValidation());
    let validation: ValidationResult | undefined;
    await act(async () => {
      validation = await result.current.validateFile(file, spec);
    });

    expect(validation!.warnings?.some((w) => w.kind === 'aspect-ratio')).toBe(true);
    restore();
  });

  it('warns when the image is blank (single-colour placeholder)', async () => {
    const restore = mockImageWithSize(192, 192);
    // A canvas whose every pixel is identical → blank.
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: jest.fn(),
      getImageData: () => ({ data: new Uint8ClampedArray([9, 9, 9, 255, 9, 9, 9, 255]) }),
    } as unknown as CanvasRenderingContext2D);
    const spec = ICON_SPECS.find((s) => s.id === 'favicon-192')!;
    const file = new File(['x'], 'favicon-192x192.png', { type: 'image/png' });

    const { result } = renderHook(() => useImageValidation());
    let validation: ValidationResult | undefined;
    await act(async () => {
      validation = await result.current.validateFile(file, spec);
    });

    expect(validation!.warnings?.some((w) => w.kind === 'blank')).toBe(true);
    restore();
  });

  it('warns on SVG hygiene (missing viewBox) via file text', async () => {
    const restore = mockImageWithSize(0, 0);
    const spec = ICON_SPECS.find((s) => s.id === 'svg-favicon')!;
    const svgText = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z" fill="#000"/></svg>';
    const file = new File([svgText], 'favicon.svg', { type: 'image/svg+xml' });
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(svgText) });

    const { result } = renderHook(() => useImageValidation());
    let validation: ValidationResult | undefined;
    await act(async () => {
      validation = await result.current.validateFile(file, spec);
    });

    expect(validation!.warnings?.some((w) => w.kind === 'svg-viewbox')).toBe(true);
    restore();
  });

  it('reports transparency as unknown for SVG files without running a canvas scan', async () => {
    const restore = mockImageWithSize(0, 0);
    const spec = ICON_SPECS.find((s) => s.id === 'svg-favicon')!;
    const svgText = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 1h22v22H1z" fill="#123"/></svg>';
    const file = new File([svgText], 'favicon.svg', { type: 'image/svg+xml' });
    // jsdom's File lacks .text(); the standard method exists in real browsers.
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(svgText) });

    const { result } = renderHook(() => useImageValidation());
    let validation;
    await act(async () => {
      validation = await result.current.validateFile(file, spec);
    });

    expect(validation).toMatchObject({ transparency: 'unknown', formatOk: true });
    restore();
  });
});
