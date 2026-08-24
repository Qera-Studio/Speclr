import { clientFromRow, clientToRow, type ClientRow } from '../mappers';
import { clientSnapshotOf } from '@/lib/domain/types';
import { placeOfSupplyOf } from '@/lib/domain/placeOfSupply';
import type { ClientRecord } from '@/lib/domain/types';

/**
 * The GSTIN is written by the Tax step into the `tax` group and read by every
 * document from the top-level field. Nothing mirrored the two, so an invoice to
 * a registered client printed their PAN instead of their GSTIN (CGST Rule 46(e))
 * and derived place of supply from the address rather than the registration.
 *
 * These pin the mapper as the one place the two are reconciled.
 */

const GSTIN = '07AAHPQ6359H1ZA';

function row(overrides: Partial<ClientRow> = {}): ClientRow {
  return {
    id: 'client-1',
    name: 'Zaib',
    companyName: 'ZaibQ Studioh',
    address: 'F 581 basement,\nNew Delhi - 110030\nDelhi, India',
    addressParts: { state: 'Delhi', country: 'IN' },
    billingAddressParts: null,
    email: 'zaib@zaibqstudio.com',
    phone: '+919571902169',
    gstin: null,
    entityType: 'proprietorship',
    tax: { gstRegistered: true, gstin: GSTIN },
    contacts: null,
    commercial: null,
    attachments: null,
    access: null,
    archived: false,
    createdAt: new Date(1_750_000_000_000),
    updatedAt: new Date(1_750_000_000_000),
    ...overrides,
  } as ClientRow;
}

describe('a client written by onboarding reads back registered', () => {
  it('resolves the GSTIN from the tax group when the column is empty', () => {
    expect(clientFromRow(row()).gstin).toBe(GSTIN);
  });

  it('prints the GSTIN on a document, not the PAN', () => {
    expect(clientSnapshotOf(clientFromRow(row())).gstin).toBe(GSTIN);
  });

  it('derives place of supply from the registration, not the address', () => {
    const place = placeOfSupplyOf(clientFromRow(row()));
    expect(place.source).toBe('gstin');
    expect(place.code).toBe('07');
  });

  it('writes the tax group GSTIN back into the queryable column', () => {
    const record = clientFromRow(row());
    expect(clientToRow(record).gstin).toBe(GSTIN);
  });

  it('keeps a legacy top-level GSTIN when there is no tax group', () => {
    const legacy = row({ gstin: GSTIN, tax: null });
    expect(clientFromRow(legacy).gstin).toBe(GSTIN);
  });

  it('leaves the GSTIN absent when neither holds one', () => {
    const none = row({ gstin: null, tax: { gstRegistered: false } as ClientRecord['tax'] });
    expect(clientFromRow(none).gstin).toBeUndefined();
    expect(clientToRow(clientFromRow(none)).gstin).toBeNull();
  });
});
