import {
  clientAddedISO,
  matchesClientFilters,
  onboardingStateOf,
  sortClients,
  type ClientFilterRow,
} from '../clientQuery';
import type { ClientRecord } from '@/lib/domain/types';

const client = (over: Partial<ClientRecord>): ClientRecord =>
  ({
    id: 'c',
    name: 'Acme',
    address: '1 Acme Way',
    email: 'a@acme.test',
    phone: '+919000000001',
    createdAt: new Date(2026, 5, 10).getTime(),
    ...over,
  }) as ClientRecord;

const row = (over: Partial<ClientFilterRow>): ClientFilterRow =>
  ({ id: 'r', field: 'country', operator: 'is', value: [], ...over }) as ClientFilterRow;

describe('onboardingStateOf', () => {
  it('reads a bare record as not started', () => {
    expect(onboardingStateOf(client({}))).toBe('notStarted');
  });

  /**
   * The denominator moves with the record — an individual has six steps, not
   * seven — so "complete" is `done >= total`, never a fixed number.
   */
  it('is in progress once a step is filled', () => {
    const partway = client({ companyName: 'Acme Private Limited', entityType: 'private_limited' });
    expect(onboardingStateOf(partway)).toBe('started');
  });
});

describe('matchesClientFilters', () => {
  it('keeps everything while a row has no value yet', () => {
    expect(matchesClientFilters(client({}), [row({ value: [] })])).toBe(true);
  });

  /** No `addressParts.country` reads as India, as it does everywhere else. */
  it('treats a missing country as IN', () => {
    expect(matchesClientFilters(client({}), [row({ value: ['IN'] })])).toBe(true);
    expect(matchesClientFilters(client({}), [row({ value: ['GB'] })])).toBe(false);
  });

  it('inverts on “is not”', () => {
    const rows = [row({ operator: 'isNot', value: ['IN'] })];
    expect(matchesClientFilters(client({}), rows)).toBe(false);
  });

  it('compares the added date inclusively at both ends', () => {
    const added = clientAddedISO(client({}));
    const between = (from: string, to: string) =>
      matchesClientFilters(client({}), [
        row({ field: 'added', operator: 'between', value: [from, to] }),
      ]);
    expect(between(added, added)).toBe(true);
    expect(between('2026-06-11', '2026-06-30')).toBe(false);
  });

  /** Rows AND, which is what makes two conditions narrow rather than widen. */
  it('requires every row to match', () => {
    const rows = [
      row({ id: 'country', value: ['IN'] }),
      row({ id: 'onboarding', field: 'onboarding', value: ['complete'] }),
    ];
    expect(matchesClientFilters(client({}), rows)).toBe(false);
  });
});

describe('sortClients', () => {
  const a = client({ id: 'a', name: 'Zeta', createdAt: 1 });
  const b = client({ id: 'b', name: 'Alpha', createdAt: 2 });

  it('leaves the server’s order alone when unsorted', () => {
    expect(sortClients([a, b], null)).toEqual([a, b]);
  });

  it('sorts by name in both directions', () => {
    expect(sortClients([a, b], { column: 'name', direction: 'asc' })[0]).toBe(b);
    expect(sortClients([a, b], { column: 'name', direction: 'desc' })[0]).toBe(a);
  });

  it('sorts by when the record was added', () => {
    expect(sortClients([a, b], { column: 'added', direction: 'asc' })[0]).toBe(a);
  });

  /** A blank field sinks, rather than sorting as an empty string. */
  it('sends an empty value last whichever way it is sorted', () => {
    const blank = client({ id: 'blank', name: '' });
    expect(sortClients([blank, a], { column: 'name', direction: 'asc' })[1]).toBe(blank);
    expect(sortClients([blank, a], { column: 'name', direction: 'desc' })[1]).toBe(blank);
  });
});
