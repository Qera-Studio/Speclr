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

  // The bug this closed: every foreign form was offered in every foreign
  // country, so a London client's dropdown listed a US corporation, a UAE free
  // zone and a Singapore private limited.
  it('offers a foreign company only its own register, plus Other', () => {
    expect(entityTypesForClient('GB', 'company').map((e) => e.value)).toEqual([
      'ltd_plc',
      'foreign_other',
    ]);
    expect(entityTypesForClient('US', 'company').map((e) => e.value)).toEqual([
      'corporation',
      'llc',
      'foreign_other',
    ]);
    expect(entityTypesForClient('AE', 'company').map((e) => e.value)).toEqual([
      'llc',
      'free_zone',
      'foreign_other',
    ]);
  });

  // A truer record than a form from the wrong register, and the reason this
  // table is not allowed to grow a row per country.
  it('falls back to Other for a country with no register listed', () => {
    expect(entityTypesForClient('JP', 'company').map((e) => e.value)).toEqual(['foreign_other']);
  });

  it('keeps a saved form on offer when the address no longer issues it', () => {
    // A Delaware corporation really can be addressed in London. Without this
    // the picker opens blank and the next save drops the entity type.
    expect(entityTypesForClient('GB', 'company', 'corporation').map((e) => e.value)).toContain(
      'corporation',
    );
    expect(entityTypesForClient('GB', 'company').map((e) => e.value)).not.toContain('corporation');
  });

  it('does not keep a saved form across the kind axis or the jurisdiction', () => {
    // Both of these are wrong records rather than narrow ones, and keeping
    // them would be keeping the mistake.
    expect(entityTypesForClient('GB', 'company', 'sole_trader').map((e) => e.value)).not.toContain(
      'sole_trader',
    );
    expect(entityTypesForClient('GB', 'company', 'pvt_ltd').map((e) => e.value)).not.toContain(
      'pvt_ltd',
    );
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
