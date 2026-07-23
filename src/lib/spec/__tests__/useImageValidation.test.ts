import { renderHook, act } from '@testing-library/react';
import { useImageValidation } from '../useImageValidation';
import { ICON_SPECS } from '../iconSpecData';

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

  it('does not skip pixel checks for the .ico slot and reports dimensions/transparency as unknown', async () => {
    const spec = ICON_SPECS.find((s) => s.id === 'favicon-ico')!;
    const file = new File(['x'], 'favicon.ico', { type: '' });

    const { result } = renderHook(() => useImageValidation());
    let validation;
    await act(async () => {
      validation = await result.current.validateFile(file, spec);
    });

    expect(validation).toMatchObject({ dimensionsOk: 'unknown', transparency: 'unknown', formatOk: true });
    expect(validation!.note).toBeTruthy();
  });

  it('reports transparency as unknown for SVG files without running a canvas scan', async () => {
    const restore = mockImageWithSize(0, 0);
    const spec = ICON_SPECS.find((s) => s.id === 'svg-favicon')!;
    const file = new File(['x'], 'favicon.svg', { type: 'image/svg+xml' });

    const { result } = renderHook(() => useImageValidation());
    let validation;
    await act(async () => {
      validation = await result.current.validateFile(file, spec);
    });

    expect(validation).toMatchObject({ transparency: 'unknown', formatOk: true });
    restore();
  });
});
