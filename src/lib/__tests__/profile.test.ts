import { DOC_TYPE_LIST } from '@/lib/domain/registry';
import {
  DEFAULT_PROFILE,
  PROFILES,
  docHref,
  docTypesForProfile,
  isProfile,
  newDocHref,
  profileFromPath,
  profileOfDocType,
} from '../profile';

describe('profileOfDocType', () => {
  /**
   * Written out rather than derived from `isHrDocType`, on purpose: this is the
   * one place the mapping is asserted against a list a human read, so a change
   * to the registry that silently moved a document type between profiles has
   * something to fail against.
   */
  it('files the client documents on the client side', () => {
    for (const code of ['INV', 'REC', 'CON'] as const) {
      expect(profileOfDocType(code)).toBe('client');
    }
  });

  it('files the slips and HR letters on the admin side', () => {
    for (const code of ['STP', 'PAY', 'OFR', 'EXP', 'EXIT'] as const) {
      expect(profileOfDocType(code)).toBe('admin');
    }
  });

  it('gives every registered document type a side, and only one', () => {
    const filed = PROFILES.flatMap(docTypesForProfile);
    expect([...filed].sort()).toEqual(DOC_TYPE_LIST.map((s) => s.code).sort());
    expect(new Set(filed).size).toBe(filed.length);
  });
});

describe('profileFromPath', () => {
  it('reads the profile off the first segment', () => {
    expect(profileFromPath('/client')).toBe('client');
    expect(profileFromPath('/client/docs/invoice')).toBe('client');
    expect(profileFromPath('/admin/tools/ctc')).toBe('admin');
  });

  /**
   * Null rather than a default: the shell needs to tell "no profile here" apart
   * from "the client profile", or `/sign-in` would render the client nav.
   */
  it('returns null for a path outside both profiles', () => {
    expect(profileFromPath('/')).toBeNull();
    expect(profileFromPath('/sign-in')).toBeNull();
    expect(profileFromPath('/docs/abc')).toBeNull();
    expect(profileFromPath('/clients')).toBeNull();
  });

  /** `usePathname()` is typed to return null, and does outside a router. */
  it('tolerates a missing pathname instead of throwing', () => {
    expect(profileFromPath(null)).toBeNull();
    expect(profileFromPath(undefined)).toBeNull();
  });
});

describe('isProfile', () => {
  it('accepts only the two profiles', () => {
    expect(isProfile('client')).toBe(true);
    expect(isProfile('admin')).toBe(true);
    for (const value of ['Client', 'clients', '', null, undefined, 0, {}]) {
      expect(isProfile(value)).toBe(false);
    }
  });
});

describe('hrefs', () => {
  it('builds a document href from the document’s own type, not the page it is on', () => {
    expect(docHref({ id: 'd1', type: 'INV' })).toBe('/client/docs/d1');
    expect(docHref({ id: 'd2', type: 'PAY' })).toBe('/admin/docs/d2');
  });

  it('appends a suffix for print and its query', () => {
    expect(docHref({ id: 'd1', type: 'REC' }, '/print')).toBe('/client/docs/d1/print');
    expect(docHref({ id: 'd3', type: 'EXIT' }, '/print?auto=1')).toBe(
      '/admin/docs/d3/print?auto=1',
    );
  });

  it('builds a create href on the type’s own side', () => {
    expect(newDocHref('CON', 'contract')).toBe('/client/docs/new/contract');
    expect(newDocHref('STP', 'stipend')).toBe('/admin/docs/new/stipend');
  });
});

describe('stepping between profiles', () => {
  it('lists them left to right, client first', () => {
    expect(PROFILES).toEqual(['client', 'admin']);
    expect(DEFAULT_PROFILE).toBe('client');
  });
});
