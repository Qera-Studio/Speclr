import { checkAspectRatio, checkFileWeight } from '../qualityChecks';
import { ICON_SPECS } from '../iconSpecData';

const spec = (id: string) => ICON_SPECS.find((s) => s.id === id)!;

describe('checkAspectRatio', () => {
  it('returns no warning for a perfectly square icon', () => {
    expect(checkAspectRatio(512, 512, spec('favicon-512'))).toBeNull();
  });

  it('warns when a square-expecting icon is not square', () => {
    const w = checkAspectRatio(512, 480, spec('favicon-512'));
    expect(w?.kind).toBe('aspect-ratio');
    expect(w?.message).toMatch(/not square/i);
    expect(w?.message).toMatch(/512×480/);
  });

  it('does not warn for the intentionally non-square OG landscape image', () => {
    // og-image is 1200×630 by design — not square is correct, not a defect.
    expect(checkAspectRatio(1200, 630, spec('og-image'))).toBeNull();
  });
});

describe('checkFileWeight', () => {
  it('returns no warning for a reasonably-sized apple-touch icon', () => {
    expect(checkFileWeight(40 * 1024, spec('apple-touch-icon'))).toBeNull();
  });

  it('warns when an apple-touch icon is heavier than its budget', () => {
    const w = checkFileWeight(800 * 1024, spec('apple-touch-icon'));
    expect(w?.kind).toBe('file-weight');
    expect(w?.message).toMatch(/KB|MB/);
  });

  it('allows a larger budget for the full OG design asset than for a favicon', () => {
    // A 400 KB OG image is fine; a 400 KB favicon.ico is not.
    expect(checkFileWeight(400 * 1024, spec('og-image'))).toBeNull();
    expect(checkFileWeight(400 * 1024, spec('favicon-ico'))).not.toBeNull();
  });
});
