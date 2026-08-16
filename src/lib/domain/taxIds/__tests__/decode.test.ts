import { identifierFact, identifierPasses } from '../decode';

const QERA_GSTIN = '09AABCQ2864Q1ZQ';

describe('identifierFact', () => {
  it('reads a GSTIN’s state', () => {
    expect(identifierFact('gstin', QERA_GSTIN)).toBe('Uttar Pradesh');
  });

  it('reads a PAN’s holder kind', () => {
    expect(identifierFact('pan', 'AABCQ2864Q')).toBe('Company');
    expect(identifierFact('pan', 'AABPQ2864Q')).toBe('Individual');
    expect(identifierFact('pan', 'AABFQ2864Q')).toBe('Firm / LLP');
  });

  /**
   * A PAN's 4th character separates a company from a person and nothing
   * finer. Reading "Private Limited" off a `C` would be echoing back the entity
   * type the operator already chose, which is not a decoding.
   */
  it('does not claim a company is private or public', () => {
    expect(identifierFact('pan', 'AABCQ2864Q')).not.toMatch(/private|public|limited/i);
  });

  it('reads a CIN’s company form and year of incorporation', () => {
    expect(identifierFact('cin', 'U62099UW2026PTC254312')).toBe(
      'Private Limited Company · INC 2026',
    );
    expect(identifierFact('cin', 'U62099UW2026PLC254312')).toBe(
      'Public Limited Company · INC 2026',
    );
  });

  /**
   * The MCA issues eleven other ownership triples with no row in
   * `ENTITY_TYPES`. A CIN this app cannot place still has a valid year, and
   * naming the nearest thing would be exactly the invented fact the file
   * header rules out.
   */
  it('falls back to the year alone for a triple it cannot place', () => {
    expect(identifierFact('cin', 'U62099UW2026NPL254312')).toBe('INC 2026');
  });

  /**
   * The load-bearing case. A half-decoding of a mistyped identifier is a wrong
   * fact displayed with confidence, which is worse than no fact: the state name
   * on a GSTIN whose checksum fails is the state of a number nobody holds.
   */
  it('says nothing at all about a value that does not hold up', () => {
    expect(identifierFact('gstin', '09AABCQ2864Q1ZX')).toBeNull();
    expect(identifierFact('gstin', '09AAB')).toBeNull();
    expect(identifierFact('pan', 'NOPE')).toBeNull();
    expect(identifierFact('cin', 'U62099UP9999PTC254312')).toBeNull();
    expect(identifierFact('pan', '')).toBeNull();
  });

  /**
   * TAN has no check digit and no published city table, so there is nothing
   * true to say about one. Inventing a label for symmetry would be exactly the
   * reassurance-without-substance this whole file exists to avoid.
   */
  it('says nothing about a TAN', () => {
    expect(identifierFact('tan', 'DELQ12345F')).toBeNull();
  });
});

describe('identifierPasses', () => {
  it('passes a complete, well-formed value of each kind', () => {
    expect(identifierPasses('gstin', QERA_GSTIN)).toBe(true);
    expect(identifierPasses('pan', 'AABCQ2864Q')).toBe(true);
    expect(identifierPasses('tan', 'DELQ12345F')).toBe(true);
    expect(identifierPasses('cin', 'U62099UW2026PTC254312')).toBe(true);
  });

  /**
   * The property the in-focus tick rests on: no prefix of a valid identifier is
   * itself valid, so a mark shown the instant the characters pass cannot
   * flicker on during typing. If a future identifier breaks this, its tick has
   * to go back to waiting for a blur.
   */
  it('fails every prefix on the way to a valid one', () => {
    for (let i = 1; i < QERA_GSTIN.length; i += 1) {
      expect(identifierPasses('gstin', QERA_GSTIN.slice(0, i))).toBe(false);
    }
  });

  it('fails a checksum that does not hold, and an empty field', () => {
    expect(identifierPasses('gstin', '09AABCQ2864Q1ZX')).toBe(false);
    expect(identifierPasses('cin', 'U62099UP9999PTC254312')).toBe(false);
    expect(identifierPasses('pan', '')).toBe(false);
  });
});
