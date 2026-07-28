import { displayDomain } from '../displayDomain';

describe('displayDomain', () => {
  it('prefers an explicit domain over the brand name', () => {
    // The bug this exists to prevent: "Qera Studio" must not become
    // "qerastudio.com" when the real domain is qera.studio.
    expect(displayDomain('Qera Studio', 'qera.studio')).toBe('qera.studio');
  });

  it('normalises a pasted URL down to host + path', () => {
    expect(displayDomain('', 'https://qera.studio')).toBe('qera.studio');
    expect(displayDomain('', 'http://www.acme.co.uk/')).toBe('acme.co.uk');
  });

  it('strips a leading www. and any trailing slash', () => {
    expect(displayDomain('', 'www.acme.com/')).toBe('acme.com');
  });

  it('lowercases and trims whitespace', () => {
    expect(displayDomain('', '  Qera.Studio  ')).toBe('qera.studio');
  });

  it('falls back to a slugged brand name when no domain is given', () => {
    expect(displayDomain('Acme Co', '')).toBe('acmeco.com');
  });

  it('drops punctuation when slugging the brand fallback', () => {
    expect(displayDomain('Acme Co.', undefined)).toBe('acmeco.com');
    expect(displayDomain("Bob's Diner", '')).toBe('bobsdiner.com');
  });

  it('falls back to a placeholder when both are empty', () => {
    expect(displayDomain('', '')).toBe('samplebrand.com');
    expect(displayDomain(undefined, undefined)).toBe('samplebrand.com');
  });

  it('ignores a whitespace-only domain', () => {
    expect(displayDomain('Acme Co', '   ')).toBe('acmeco.com');
  });
});
