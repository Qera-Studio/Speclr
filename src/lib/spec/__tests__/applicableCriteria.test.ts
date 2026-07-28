import { applicableCriteria } from '../applicableCriteria';
import { ICON_SPECS } from '../iconSpecData';

const spec = (id: string) => ICON_SPECS.find((s) => s.id === id)!;

describe('applicableCriteria', () => {
  it('checks dimensions and transparency for an opaque raster PNG', () => {
    // apple-touch-icon: fixed 180×180, requires opacity.
    expect(applicableCriteria(spec('apple-touch-icon'))).toEqual({
      dimensions: true,
      format: true,
      transparency: true,
    });
  });

  it('checks dimensions and transparency for a .ico container', () => {
    // .ico embeds fixed sizes and we sample per-layer alpha.
    expect(applicableCriteria(spec('favicon-ico'))).toEqual({
      dimensions: true,
      format: true,
      transparency: true,
    });
  });

  it('checks only format for an SVG vector favicon (no fixed size, no raster alpha)', () => {
    expect(applicableCriteria(spec('svg-favicon'))).toEqual({
      dimensions: false,
      format: true,
      transparency: false,
    });
  });

  it('checks only format for the Safari pinned-tab SVG', () => {
    expect(applicableCriteria(spec('safari-pinned-tab'))).toEqual({
      dimensions: false,
      format: true,
      transparency: false,
    });
  });

  it('checks dimensions but skips transparency for the OG image (raster, transparency informational-only is still sampled)', () => {
    // og-image is a 1200×630 PNG; it has fixed dimensions and is a raster we can
    // sample, so both dimensions and transparency apply (opacity not required).
    expect(applicableCriteria(spec('og-image'))).toEqual({
      dimensions: true,
      format: true,
      transparency: true,
    });
  });

  it('format is always applicable', () => {
    for (const s of ICON_SPECS) {
      expect(applicableCriteria(s).format).toBe(true);
    }
  });
});
