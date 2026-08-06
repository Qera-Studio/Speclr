import { analyzePixels, checkSafeZone, detectTransparency, isIcoFile, isSvgFile, loadImageDimensions } from '../imageAnalysis';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: mockCreateObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: mockRevokeObjectURL });
});

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;
  private _src = '';

  set src(value: string) {
    this._src = value;
    // Synchronously invoke onload, matching the real Image() microtask timing
    // closely enough for these tests (jsdom doesn't actually decode images).
    if (this.onload) this.onload();
  }
  get src() {
    return this._src;
  }
}

describe('loadImageDimensions', () => {
  it('resolves with the decoded image dimensions and an object URL', async () => {
    const OriginalImage = global.Image;
    // @ts-expect-error — intentionally replacing with a minimal test double
    global.Image = class extends MockImage {
      constructor() {
        super();
        this.naturalWidth = 192;
        this.naturalHeight = 192;
      }
    };

    const file = new File(['x'], 'icon.png', { type: 'image/png' });
    const result = await loadImageDimensions(file);

    expect(result).toEqual({ width: 192, height: 192, objectUrl: 'blob:mock-url' });
    global.Image = OriginalImage;
  });

  it('rejects when the image cannot be decoded', async () => {
    const OriginalImage = global.Image;
    // @ts-expect-error — intentionally replacing with a minimal test double
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        if (this.onerror) this.onerror();
      }
    };

    const file = new File(['x'], 'broken.png', { type: 'image/png' });
    await expect(loadImageDimensions(file)).rejects.toThrow('Could not decode image');
    global.Image = OriginalImage;
  });
});

describe('isIcoFile', () => {
  it('returns true for .ico filenames', () => {
    const file = new File(['x'], 'favicon.ico', { type: '' });
    expect(isIcoFile(file)).toBe(true);
  });

  it('returns false for non-.ico filenames', () => {
    const file = new File(['x'], 'favicon.png', { type: 'image/png' });
    expect(isIcoFile(file)).toBe(false);
  });
});

describe('isSvgFile', () => {
  it('returns true for image/svg+xml MIME type', () => {
    const file = new File(['x'], 'logo.svg', { type: 'image/svg+xml' });
    expect(isSvgFile(file)).toBe(true);
  });

  it('returns true for .svg filename even with empty MIME', () => {
    const file = new File(['x'], 'logo.svg', { type: '' });
    expect(isSvgFile(file)).toBe(true);
  });

  it('returns false for a PNG file', () => {
    const file = new File(['x'], 'logo.png', { type: 'image/png' });
    expect(isSvgFile(file)).toBe(false);
  });
});

describe('detectTransparency', () => {
  function mockCanvasContext(alphaBytes: number[]) {
    const getImageData = jest.fn(() => ({ data: new Uint8ClampedArray(alphaBytes) }));
    const drawImage = jest.fn();
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
      getImageData,
      // Minimal shape — cast through unknown since jsdom's CanvasRenderingContext2D
      // type is much larger than what this test needs to stub.
    } as unknown as CanvasRenderingContext2D);
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns false when every pixel is fully opaque', () => {
    // RGBA quadruplets, alpha (4th byte) always 255
    mockCanvasContext([10, 20, 30, 255, 40, 50, 60, 255]);
    const img = document.createElement('img');
    expect(detectTransparency(2, 1, img)).toBe(false);
  });

  it('returns true when any pixel has alpha below 255', () => {
    mockCanvasContext([10, 20, 30, 255, 40, 50, 60, 128]);
    const img = document.createElement('img');
    expect(detectTransparency(2, 1, img)).toBe(true);
  });

  it('returns "unknown" when a 2d context is unavailable', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const img = document.createElement('img');
    expect(detectTransparency(2, 1, img)).toBe('unknown');
  });
});

describe('analyzePixels', () => {
  function mockCanvasContext(bytes: number[]) {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(bytes) })),
    } as unknown as CanvasRenderingContext2D);
  }
  afterEach(() => jest.restoreAllMocks());

  it('reports alpha + non-blank for a normal two-tone opaque image', () => {
    mockCanvasContext([10, 20, 30, 255, 200, 200, 200, 255]);
    const img = document.createElement('img');
    expect(analyzePixels(2, 1, img)).toEqual({ hasAlpha: false, isBlank: false });
  });

  it('flags hasAlpha when any pixel is not fully opaque', () => {
    mockCanvasContext([10, 20, 30, 128, 200, 200, 200, 255]);
    const img = document.createElement('img');
    expect(analyzePixels(2, 1, img)!.hasAlpha).toBe(true);
  });

  it('flags isBlank when every pixel is identical (single-colour placeholder)', () => {
    mockCanvasContext([255, 255, 255, 255, 255, 255, 255, 255]);
    const img = document.createElement('img');
    expect(analyzePixels(2, 1, img)!.isBlank).toBe(true);
  });

  it('flags isBlank when the whole image is fully transparent', () => {
    mockCanvasContext([0, 0, 0, 0, 0, 0, 0, 0]);
    const img = document.createElement('img');
    expect(analyzePixels(2, 1, img)!.isBlank).toBe(true);
  });

  it('returns null when a 2d context is unavailable', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const img = document.createElement('img');
    expect(analyzePixels(2, 1, img)).toBeNull();
  });
});

describe('checkSafeZone', () => {
  // A 10×10 image; the safe-zone check samples the outer 20% ring (outer 1px on
  // each edge here). We stub getImageData per-region by returning bytes based on
  // the requested rectangle so we can place content in or out of the ring.
  function mockRingContext(ringHasContent: boolean) {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: jest.fn(),
      getImageData: jest.fn((x: number, y: number, w: number, h: number) => {
        // The check reads the full buffer and inspects ring coordinates itself.
        // Build a 10×10 buffer: centre opaque, ring transparent unless content.
        const width = 10;
        const data = new Uint8ClampedArray(w * h * 4);
        for (let py = 0; py < h; py++) {
          for (let px = 0; px < w; px++) {
            const gx = x + px;
            const gy = y + py;
            const inRing = gx === 0 || gy === 0 || gx === width - 1 || gy === width - 1;
            const opaque = inRing ? ringHasContent : true;
            const idx = (py * w + px) * 4 + 3;
            data[idx] = opaque ? 255 : 0;
          }
        }
        return { data };
      }),
    } as unknown as CanvasRenderingContext2D);
  }
  afterEach(() => jest.restoreAllMocks());

  it('warns when opaque content bleeds into the outer safe-zone ring', () => {
    mockRingContext(true);
    const img = document.createElement('img');
    const w = checkSafeZone(10, 10, img);
    expect(w?.kind).toBe('safe-zone');
  });

  it('does not warn when the outer ring is clear (content kept in the inner 80%)', () => {
    mockRingContext(false);
    const img = document.createElement('img');
    expect(checkSafeZone(10, 10, img)).toBeNull();
  });
});
