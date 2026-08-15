/**
 * What a file actually is, read from its first bytes.
 *
 * The browser's declared `Content-Type` is a claim, not a fact — it comes from
 * the file picker and can be set to anything by a caller that is not a file
 * picker at all. An `.svg` announced as `image/png` and stored under that type
 * is served back as an image the browser will happily execute script inside, so
 * the type is sniffed here and the claim is only accepted when the two agree.
 *
 * Three formats, because three are allowed. This is not a general-purpose
 * detector and should not grow into one: every format added is a parser's worth
 * of attack surface, and these files arrive as a client's email attachment.
 */

const SIGNATURES: { mime: string; magic: readonly number[] }[] = [
  // '%PDF'
  { mime: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] },
  // \x89 'PNG' \r \n \x1a \n
  { mime: 'image/png', magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // JPEG start-of-image plus the first marker byte.
  { mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
];

/** The MIME type these bytes really are, or null if it is not one we allow. */
export function sniffMimeType(bytes: Uint8Array): string | null {
  for (const { mime, magic } of SIGNATURES) {
    if (magic.every((byte, index) => bytes[index] === byte)) return mime;
  }
  return null;
}

/**
 * A filename safe to put in a storage path and in a `Content-Disposition`
 * header.
 *
 * Strips control characters and directory separators — the two things that turn
 * a filename into a header injection or a path traversal — and caps the length.
 * Deliberately conservative: a mangled filename is a cosmetic problem, and the
 * alternative is not.
 *
 * Control characters are filtered by code point rather than by a regex range. A
 * literal control character inside a pattern is invisible in a diff and easy to
 * get wrong, and getting it wrong here silently widens what gets through.
 */
export function safeFilename(name: string): string {
  const withoutControls = Array.from(name)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code > 0x1f && code !== 0x7f;
    })
    .join('');

  const cleaned = withoutControls
    .replace(/[/\\]/g, '-')
    .replace(/\.{2,}/g, '.')
    .trim();

  return (cleaned || 'file').slice(0, 120);
}
