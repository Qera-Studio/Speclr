import { ICON_SPECS } from '../iconSpecData';

describe('ICON_SPECS', () => {
  it('has exactly 11 entries', () => {
    expect(ICON_SPECS).toHaveLength(11);
  });

  it('every entry has a unique id', () => {
    const ids = ICON_SPECS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has non-empty required text fields', () => {
    for (const spec of ICON_SPECS) {
      expect(spec.name.length).toBeGreaterThan(0);
      expect(spec.filename.length).toBeGreaterThan(0);
      expect(spec.usedIn.length).toBeGreaterThan(0);
      expect(spec.whyItMatters.length).toBeGreaterThan(0);
      expect(spec.industryStandard.length).toBeGreaterThan(0);
    }
  });

  it('every entry has a valid priority tier', () => {
    for (const spec of ICON_SPECS) {
      expect(['required', 'nice-to-have']).toContain(spec.priority);
    }
  });

  it('every entry has a valid format', () => {
    for (const spec of ICON_SPECS) {
      expect(['ico', 'png', 'svg', 'jpeg']).toContain(spec.format);
    }
  });

  it('includes at least one entry for each preview mockup kind that is used', () => {
    const kinds = new Set(ICON_SPECS.map((s) => s.previewMockup));
    expect(kinds.has('maskableSafeZone')).toBe(true);
    expect(kinds.has('browserTab')).toBe(true);
    expect(kinds.has('iosHomeScreen')).toBe(true);
    expect(kinds.has('googleSerp')).toBe(true);
    expect(kinds.has('socialCard')).toBe(true);
  });

  it('includes both required and nice-to-have priority tiers', () => {
    const priorities = new Set(ICON_SPECS.map((s) => s.priority));
    expect(priorities.has('required')).toBe(true);
    expect(priorities.has('nice-to-have')).toBe(true);
  });

  it('includes the maskable icon spec with a safe-zone note in its industry standard', () => {
    const maskable = ICON_SPECS.find((s) => s.id === 'manifest-icon-maskable');
    expect(maskable).toBeDefined();
    expect(maskable?.industryStandard.toLowerCase()).toContain('safe zone');
  });
});
