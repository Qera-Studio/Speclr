import {
  compressImageToDataUrl,
  ImageTooLargeError,
  NotAnImageError,
} from '../compressImage';

/**
 * jsdom has no real canvas encoder, so image decoding and toDataURL are stubbed.
 * These tests cover the decision logic — format choice, the size budget, and
 * the failure paths — not pixel output, which only a browser can verify.
 */

type Encoded = { type: string; quality?: number; length: number };

let encodings: Encoded[] = [];
let pngLength = 100;
let jpegLengthFor: (quality: number) => number = () => 50;
let naturalWidth = 800;
let naturalHeight = 800;
let shouldFailToLoad = false;

const lastCanvas: { width: number; height: number } = { width: 0, height: 0 };

beforeEach(() => {
  encodings = [];
  pngLength = 100;
  jpegLengthFor = () => 50;
  naturalWidth = 800;
  naturalHeight = 800;
  shouldFailToLoad = false;

  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: () => 'blob:x' });
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: () => {} });

  // Image: resolves (or fails) asynchronously, like the real thing.
  class StubImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 0;
    naturalHeight = 0;
    set src(_value: string) {
      setTimeout(() => {
        if (shouldFailToLoad) {
          this.onerror?.();
          return;
        }
        this.naturalWidth = naturalWidth;
        this.naturalHeight = naturalHeight;
        this.onload?.();
      }, 0);
    }
  }
  (global as unknown as { Image: unknown }).Image = StubImage;

  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({ fillStyle: '', fillRect: jest.fn(), drawImage: jest.fn() } as unknown as CanvasRenderingContext2D);

  jest
    .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
    .mockImplementation(function (this: HTMLCanvasElement, type?: string, quality?: number) {
      lastCanvas.width = this.width;
      lastCanvas.height = this.height;
      const isPng = !type || type === 'image/png';
      const length = isPng ? pngLength : jpegLengthFor(quality ?? 1);
      encodings.push({ type: isPng ? 'image/png' : 'image/jpeg', quality, length });
      return `data:${isPng ? 'image/png' : 'image/jpeg'};base64,${'x'.repeat(Math.max(0, length - 30))}`;
    });
});

afterEach(() => jest.restoreAllMocks());

function imageFile(type = 'image/png') {
  return new File(['bytes'], 'qr.png', { type });
}

describe('compressImageToDataUrl', () => {
  it('rejects a file that is not an image', async () => {
    await expect(compressImageToDataUrl(new File(['x'], 'notes.pdf', { type: 'application/pdf' })))
      .rejects.toBeInstanceOf(NotAnImageError);
  });

  it('rejects an image that cannot be decoded', async () => {
    shouldFailToLoad = true;
    await expect(compressImageToDataUrl(imageFile())).rejects.toBeInstanceOf(NotAnImageError);
  });

  it('keeps PNG when it fits the budget', async () => {
    // QR codes are line art — lossless edges scan more reliably, so PNG wins
    // whenever it's small enough.
    pngLength = 1000;
    const result = await compressImageToDataUrl(imageFile(), { maxBytes: 5000 });

    expect(result.startsWith('data:image/png')).toBe(true);
    expect(encodings.map((e) => e.type)).toEqual(['image/png']);
  });

  it('steps down through JPEG quality when PNG is too big', async () => {
    pngLength = 90_000;
    jpegLengthFor = (q) => (q >= 0.9 ? 80_000 : q >= 0.8 ? 40_000 : 10_000);

    const result = await compressImageToDataUrl(imageFile(), { maxBytes: 50_000 });

    expect(result.startsWith('data:image/jpeg')).toBe(true);
    // Tries the best quality first and stops at the first one that fits.
    expect(encodings.map((e) => e.quality)).toEqual([undefined, 0.92, 0.8]);
  });

  it('gives up rather than storing something oversized', async () => {
    // The QR rides along in every stipend slip's snapshot, so an unbounded
    // image is never acceptable.
    pngLength = 500_000;
    jpegLengthFor = () => 400_000;

    await expect(compressImageToDataUrl(imageFile(), { maxBytes: 60_000 }))
      .rejects.toBeInstanceOf(ImageTooLargeError);
  });

  it('downscales a large image to the max dimension, preserving aspect ratio', async () => {
    naturalWidth = 2000;
    naturalHeight = 1000;

    await compressImageToDataUrl(imageFile(), { maxDimension: 512, maxBytes: 5000 });

    expect(lastCanvas.width).toBe(512);
    expect(lastCanvas.height).toBe(256);
  });

  it('leaves a small image at its natural size', async () => {
    naturalWidth = 200;
    naturalHeight = 200;

    await compressImageToDataUrl(imageFile(), { maxDimension: 512, maxBytes: 5000 });

    expect(lastCanvas.width).toBe(200);
    expect(lastCanvas.height).toBe(200);
  });
});
