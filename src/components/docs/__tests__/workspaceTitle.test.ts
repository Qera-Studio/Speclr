import { possessive, workspaceTitle } from '../workspaceTitle';

describe('possessive', () => {
  it('adds an apostrophe-s to an ordinary name', () => {
    expect(possessive('Clayora')).toBe('Clayora’s');
  });

  it('adds only the mark to a name already ending in s', () => {
    expect(possessive('Qera Textiles')).toBe('Qera Textiles’');
  });

  it('returns nothing for a blank name', () => {
    expect(possessive('   ')).toBe('');
  });
});

describe('workspaceTitle', () => {
  it('names the party once one is chosen', () => {
    expect(workspaceTitle('New invoice', 'Invoice', 'Clayora')).toBe('Clayora’s invoice');
  });

  it('keeps the route’s title until a party is chosen', () => {
    // The editor renders before the picker is used, so the generic heading has
    // to survive both an absent and an empty selection.
    expect(workspaceTitle('New invoice', 'Invoice', undefined)).toBe('New invoice');
    expect(workspaceTitle('New invoice', 'Invoice', '')).toBe('New invoice');
  });

  it('lower-cases a multi-word doc label', () => {
    expect(workspaceTitle('New stipend slip', 'Stipend slip', 'Priya')).toBe(
      'Priya’s stipend slip',
    );
  });
});
