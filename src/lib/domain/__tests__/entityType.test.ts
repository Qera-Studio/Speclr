import {
  clientKindOf,
  entityTypesForClient,
  entityTypesForCountry,
  isNaturalPerson,
} from '../entityType';

describe('isNaturalPerson', () => {
  it('is true for the three forms that are one human being', () => {
    expect(isNaturalPerson('individual')).toBe(true);
    expect(isNaturalPerson('proprietorship')).toBe(true);
    expect(isNaturalPerson('sole_trader')).toBe(true);
  });

  it('is false for every incorporated form', () => {
    for (const value of ['pvt_ltd', 'llp', 'partnership', 'trust', 'llc', 'ltd_plc']) {
      expect(isNaturalPerson(value)).toBe(false);
    }
  });

  // Every client written before onboarding existed has no entity type, and a
  // record that is merely unfinished must not read as a person.
  it('is false for an unset entity type', () => {
    expect(isNaturalPerson(undefined)).toBe(false);
    expect(isNaturalPerson('')).toBe(false);
    expect(clientKindOf(undefined)).toBe('company');
  });
});

describe('entityTypesForClient', () => {
  it('offers an Indian individual only the two forms that are one person', () => {
    expect(entityTypesForClient('IN', 'individual').map((e) => e.value)).toEqual([
      'proprietorship',
      'individual',
    ]);
  });

  it('offers a foreign individual only the sole trader', () => {
    expect(entityTypesForClient('GB', 'individual').map((e) => e.value)).toEqual(['sole_trader']);
  });

  it('leaves no form unreachable: the two kinds partition the country', () => {
    for (const country of ['IN', 'GB']) {
      const all = entityTypesForCountry(country).map((e) => e.value).sort();
      const split = [
        ...entityTypesForClient(country, 'individual'),
        ...entityTypesForClient(country, 'company'),
      ]
        .map((e) => e.value)
        .sort();
      expect(split).toEqual(all);
    }
  });
});
