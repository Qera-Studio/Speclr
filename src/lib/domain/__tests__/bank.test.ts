import { IFSC_RE, isIfsc, normalizeIfscInput } from '../bank';

describe('isIfsc', () => {
  it('accepts a real IFSC', () => {
    expect(isIfsc('KKBK0000677')).toBe(true);
    expect(isIfsc('SBIN0001234')).toBe(true);
    // Branch codes may be alphanumeric.
    expect(isIfsc('HDFC0CAGRSB')).toBe(true);
  });

  it('tolerates surrounding whitespace', () => {
    expect(isIfsc('  KKBK0000677 ')).toBe(true);
  });

  it('rejects lowercase — the stored value must be uppercase', () => {
    expect(isIfsc('kkbk0000677')).toBe(false);
  });

  it('rejects a 5th character that is not the reserved 0', () => {
    expect(isIfsc('KKBK1000677')).toBe(false);
  });

  it('rejects the wrong length', () => {
    expect(isIfsc('KKBK0')).toBe(false);
    expect(isIfsc('KKBK00006777')).toBe(false);
  });

  it('rejects a non-letter bank code and stray punctuation', () => {
    expect(isIfsc('KK1K0000677')).toBe(false);
    expect(isIfsc('KKBK-000677')).toBe(false);
  });

  it('rejects empty', () => {
    expect(isIfsc('')).toBe(false);
  });
});

describe('normalizeIfscInput', () => {
  it('uppercases', () => {
    expect(normalizeIfscInput('kkbk0000677')).toBe('KKBK0000677');
  });

  it('strips anything that is not alphanumeric', () => {
    expect(normalizeIfscInput('kkbk-0000 677')).toBe('KKBK0000677');
    expect(normalizeIfscInput('!@#$')).toBe('');
  });

  it('caps at the IFSC length', () => {
    expect(normalizeIfscInput('KKBK0000677999')).toBe('KKBK0000677');
  });

  it('always produces something the regex can accept once complete', () => {
    expect(IFSC_RE.test(normalizeIfscInput('  kkbk 0000-677  '))).toBe(true);
  });
});
