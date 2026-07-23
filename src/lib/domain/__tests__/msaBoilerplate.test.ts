import { MSA_SECTIONS, CONTRACT_INTRO, AGREEMENT_PREAMBLE } from '../msaBoilerplate';

describe('MSA boilerplate', () => {
  it('has a non-empty intro paragraph for the cover page', () => {
    expect(CONTRACT_INTRO.length).toBeGreaterThan(20);
  });

  it('has a preamble sentence for the parties page', () => {
    expect(AGREEMENT_PREAMBLE.length).toBeGreaterThan(10);
  });

  it('contains all 24 numbered MSA sections', () => {
    expect(MSA_SECTIONS.length).toBe(24);
  });

  it('numbers sections 1..24 in order', () => {
    MSA_SECTIONS.forEach((s, i) => expect(s.number).toBe(i + 1));
  });

  it('every section has a heading and at least one non-empty body paragraph', () => {
    for (const s of MSA_SECTIONS) {
      expect(s.heading.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
      for (const p of s.body) expect(p.trim().length).toBeGreaterThan(0);
    }
  });

  it('includes the key sections by heading', () => {
    const headings = MSA_SECTIONS.map((s) => s.heading);
    expect(headings).toContain('PARTIES');
    expect(headings).toContain('DEFINITIONS');
    expect(headings).toContain('INTELLECTUAL PROPERTY');
    expect(headings).toContain('LIMITATIONS OF LIABILITY');
    expect(headings).toContain('GOVERNING LAW & JURISDICTION');
    expect(headings).toContain('SIGNATURES');
  });

  it('places SIGNATURES last as section 24', () => {
    const last = MSA_SECTIONS[MSA_SECTIONS.length - 1];
    expect(last.number).toBe(24);
    expect(last.heading).toBe('SIGNATURES');
  });
});
