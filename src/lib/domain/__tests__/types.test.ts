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
});
