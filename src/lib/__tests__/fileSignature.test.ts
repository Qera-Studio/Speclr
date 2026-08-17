import { isEncryptedPdf, sniffMimeType } from '../fileSignature';

// `charCodeAt` rather than `TextEncoder`, which jsdom does not define.
const bytes = (s: string) =>
  Uint8Array.from(Array.from(s, (char) => char.charCodeAt(0)));

describe('sniffMimeType', () => {
  it('reads the type from the bytes, not from a claim', () => {
    expect(sniffMimeType(bytes('%PDF-1.7'))).toBe('application/pdf');
    expect(sniffMimeType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    // An SVG announced as a PNG is script the browser would run.
    expect(sniffMimeType(bytes('<svg xmlns='))).toBeNull();
  });
});

describe('isEncryptedPdf', () => {
  it('finds the trailer’s /Encrypt, and does not invent one', () => {
    expect(isEncryptedPdf(bytes('%PDF-1.7\ntrailer<</Root 1 0 R/Encrypt 9 0 R>>'))).toBe(true);
    expect(isEncryptedPdf(bytes('%PDF-1.7\ntrailer<</Root 1 0 R>>'))).toBe(false);
  });

  it('survives the binary a real PDF carries', () => {
    const pdf = new Uint8Array([...bytes('%PDF-1.7'), 0xff, 0xfe, 0x00, ...bytes('/Encrypt')]);
    expect(isEncryptedPdf(pdf)).toBe(true);
  });
});
