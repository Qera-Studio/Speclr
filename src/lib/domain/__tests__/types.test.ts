import { clientContact } from '../client';
import { clientSnapshotOf } from '../types';
import type { ClientRecord } from '../types';

const client: ClientRecord = {
  id: 'c1',
  name: 'Clayora',
  companyName: 'Clayora Private Limited',
  address: 'Level 3\nSydney NSW 2000\nAustralia',
  addressParts: {
    line1: 'Level 3',
    city: 'Sydney',
    state: 'NSW',
    pincode: '2000',
    country: 'AU',
  },
  email: 'hi@clayora.test',
  phone: '+61400000000',
  gstin: '',
  createdAt: 0,
  updatedAt: 0,
};

describe('clientSnapshotOf', () => {
  it('freezes the fields a document prints', () => {
    expect(clientSnapshotOf(client)).toEqual({
      name: 'Clayora',
      companyName: 'Clayora Private Limited',
      address: 'Level 3\nSydney NSW 2000\nAustralia',
      email: 'hi@clayora.test',
      phone: '+61400000000',
      gstin: '',
    });
  });

  it("freezes a foreign company's register number", () => {
    const snapshot = clientSnapshotOf({
      ...client,
      tax: { registrationNumber: '09876543', taxIdType: 'GB_VAT', taxId: 'GB123456789' },
    });
    expect(snapshot.registrationNumber).toBe('09876543');
  });

  /**
   * The regression the foreign withholding branch would otherwise have shipped:
   * `tds` used to require a section, and a client outside India has none to
   * give. The memo explaining why their remittance landed short would have
   * frozen as `undefined` and never printed.
   */
  it('freezes withholding stated as a rate alone', () => {
    const snapshot = clientSnapshotOf({
      ...client,
      tax: { tdsApplicable: true, tdsRatePercent: 15 },
    });
    expect(snapshot.tds).toEqual({ section: undefined, ratePercent: 15 });
  });

  it('freezes nothing when the client does not withhold at all', () => {
    expect(clientSnapshotOf({ ...client, tax: { tdsApplicable: false, tdsRatePercent: 15 } }).tds)
      .toBeUndefined();
  });

  it('leaves the structured address parts out', () => {
    // Documents print the flat `address` string and must reprint byte-identically
    // years later; the parts are only an editing aid.
    expect(clientSnapshotOf(client)).not.toHaveProperty('addressParts');
  });

  it('carries no company name for a client that has none', () => {
    // Clients created before the field existed. The snapshot stays valid and the
    // sheets fall back to `name`.
    const { companyName: _omitted, ...legacy } = client;
    expect(clientSnapshotOf(legacy).companyName).toBeUndefined();
  });

  /**
   * The regression `clientContact` exists to stop: an individual has no
   * Contacts step, so nothing is stored under `signing`, and a snapshot that
   * read the group directly would freeze a contract's signature block blank.
   */
  it('signs an individual with their own name', () => {
    const person: ClientRecord = {
      ...client,
      name: 'Rahul Menon',
      companyName: 'Rahul Menon',
      entityType: 'individual',
      contacts: { primary: { designation: 'Consultant' }, roles: { signing: 'primary' } },
    };
    expect(clientSnapshotOf(person).signatory).toEqual({
      name: 'Rahul Menon',
      designation: 'Consultant',
    });
  });

  it('signs an individual even with no contacts group at all', () => {
    const person: ClientRecord = { ...client, name: 'Rahul Menon', entityType: 'proprietorship' };
    expect(clientSnapshotOf(person).signatory).toEqual({
      name: 'Rahul Menon',
      designation: undefined,
    });
  });
});

describe('clientContact', () => {
  const person: ClientRecord = {
    ...client,
    name: 'Rahul Menon',
    email: 'rahul@example.test',
    phone: '+919000000000',
    entityType: 'individual',
  };

  it('resolves an individual to themselves, not to a stored copy', () => {
    expect(clientContact(person, 'primary')).toEqual({
      name: 'Rahul Menon',
      designation: undefined,
      email: 'rahul@example.test',
      phone: '+919000000000',
    });
  });

  it('keeps a billing contact who was actually named', () => {
    const withBilling: ClientRecord = {
      ...person,
      contacts: { billing: { name: 'Asha Rao', email: 'accounts@example.test' } },
    };
    expect(clientContact(withBilling, 'billing')?.name).toBe('Asha Rao');
  });

  it('leaves a company client to resolveContact unchanged', () => {
    const company: ClientRecord = {
      ...client,
      entityType: 'pvt_ltd',
      contacts: { primary: { name: 'Ira Shah' }, roles: { billing: 'company', signing: 'primary' } },
    };
    // A company billing role means the entity, so nobody — and the individual
    // fallback must not put the client's own details there instead.
    expect(clientContact(company, 'billing')).toBeUndefined();
    expect(clientContact(company, 'signing')?.name).toBe('Ira Shah');
  });
});
