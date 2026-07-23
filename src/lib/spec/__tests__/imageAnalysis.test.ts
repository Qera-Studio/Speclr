import { detectTransparency, isIcoFile, isSvgFile, loadImageDimensions } from '../imageAnalysis';

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
