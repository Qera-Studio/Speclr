import { COUNTRIES_BY_CONTINENT, searchCountries } from '../countries';

/**
 * The one filter both country pickers share. Small, and worth pinning because
 * a search that quietly stops matching codes turns "AE" into a scroll through
 * two hundred rows.
 */
describe('searchCountries', () => {
  const codes = (query: string) =>
    searchCountries(query).flatMap((g) => g.countries.map((c) => c.iso2));

  it('is the whole grouped list, by identity, for a blank query', () => {
    expect(searchCountries('')).toBe(COUNTRIES_BY_CONTINENT);
    expect(searchCountries('   ')).toBe(COUNTRIES_BY_CONTINENT);
  });

  it('matches the name anywhere in it, whatever the case', () => {
    expect(codes('ARAB')).toEqual(expect.arrayContaining(['AE', 'SA']));
  });

  it('matches a code exactly, so two letters find one country', () => {
    expect(codes('zw')).toEqual(['ZW']);
  });

  it('never returns a continent with nothing under it', () => {
    for (const group of searchCountries('land')) {
      expect(group.countries.length).toBeGreaterThan(0);
    }
    expect(searchCountries('zzzz')).toEqual([]);
  });
});
