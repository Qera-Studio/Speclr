import { evaluateIcoDimensions } from '../evaluateIco';
import type { IcoLayer } from '../parseIco';

const layer = (width: number): IcoLayer => ({ width, height: width, hasAlpha: false, format: 'png' });
const accepted = [
  { width: 16, height: 16 },
  { width: 32, height: 32 },
  { width: 48, height: 48 },
];

describe('evaluateIcoDimensions', () => {
  it('fully passes when all accepted sizes are embedded, with no shortfall note', () => {
    const r = evaluateIcoDimensions([layer(16), layer(32), layer(48)], accepted);
    expect(r.dimensionsOk).toBe(true);
    expect(r.note).toBeUndefined();
  });

  it('passes but notes the shortfall when only some accepted sizes are present', () => {
    const r = evaluateIcoDimensions([layer(16), layer(32)], accepted);
    expect(r.dimensionsOk).toBe(true);
    expect(r.note).toMatch(/16.*32/); // present
    expect(r.note).toMatch(/48/); // missing
    expect(r.note?.toLowerCase()).toContain('missing');
  });

  it('passes on a single accepted size, noting the two missing', () => {
    const r = evaluateIcoDimensions([layer(32)], accepted);
    expect(r.dimensionsOk).toBe(true);
    expect(r.note).toMatch(/16/);
    expect(r.note).toMatch(/48/);
  });

  it('fails when none of the accepted sizes are embedded', () => {
    const r = evaluateIcoDimensions([layer(64), layer(128)], accepted);
    expect(r.dimensionsOk).toBe(false);
    expect(r.note?.toLowerCase()).toContain('none');
  });
});
