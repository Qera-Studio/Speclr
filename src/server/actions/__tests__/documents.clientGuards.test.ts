import type { AdminDocument, ClientRecord } from '@/lib/domain/types';

/**
 * The finalize guards the client record made possible.
 *
 * Both live in the action rather than in a Zod schema for the same reason the
 * intern/pay-slip refusal does: the answer comes from the *client record*,
 * which the submitted payload cannot see.
 *
 * They refuse rather than warn because finalizing claims a number and a
 * finalized document is immutable — the correction is a fresh document and a
 * burnt number, not an edit.
 */

const requireAuthorizedUser = jest.fn();
const getDocument = jest.fn();
const saveDocument = jest.fn((_doc: AdminDocument) => Promise.resolve());
const getClient = jest.fn();
const claimSerial = jest.fn();
const getStudioSettings = jest.fn();
const listFinalizedCreditNotesAgainst = jest.fn();

jest.mock('@/lib/auth/session', () => ({
  requireAuthorizedUser: () => requireAuthorizedUser(),
}));
jest.mock('@/db/store', () => ({
  getDocument: (...a: unknown[]) => getDocument(...a),
  saveDocument: (...a: unknown[]) => saveDocument(a[0] as AdminDocument),
  // Finalize issues in one statement; it records through the same spy, so a
  // test reads what was issued exactly as it reads what was saved.
  finalizeStoredDocument: async (doc: AdminDocument, numbering: { fixed?: object } | null) => {
    const fixed = numbering?.fixed ?? {};
    await saveDocument({ ...doc, ...fixed } as AdminDocument);
    return fixed;
  },
  getClient: (...a: unknown[]) => getClient(...a),
  getEmployee: () => Promise.resolve(null),
  getStudioSettings: () => getStudioSettings(),
  deleteDraft: () => Promise.resolve(),
  listFinalizedInvoicesForClient: () => Promise.resolve([]),
  listFinalizedCreditNotesAgainst: (...a: unknown[]) => listFinalizedCreditNotesAgainst(...a),
}));
jest.mock('@/db/counter', () => ({ claimSerial: (...a: unknown[]) => claimSerial(...a) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
// The PDF is rendered at finalize and stored (`server/pdf/store.ts`). Mocked
// here rather than exercised: these tests are about what finalize records, and
// `storePdfQuietly` deliberately cannot fail a finalize, so a real render would
// prove nothing about them and would need a browser to do it.
jest.mock('@/server/pdf/store', () => ({ storePdfQuietly: jest.fn() }));
jest.mock('@/server/pdf/url', () => ({
  printUrlFor: () => Promise.resolve('http://localhost/print'),
}));

import { finalizeDocument } from '../documents';
import { STUDIO_INFO } from '@/lib/domain/studio';
import { SEZ_ENDORSEMENT } from '@/lib/domain/placeOfSupply';
import { PARTS } from '@/lib/domain/seed/parts';
import { contractComplete } from '@/lib/domain/contract/completeness';

const ACTOR = { userId: 'user_issuer', email: 'ops@qera.studio' };

function client(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return {
    id: 'client-1',
    name: 'Clayora',
    companyName: 'Clayora Private Limited',
    address: 'C-204, Ghaziabad',
    addressParts: {
      line1: 'C-204',
      city: 'Ghaziabad',
      state: 'Uttar Pradesh',
      pincode: '201017',
      country: 'IN',
    },
    email: 'a@clayora.test',
    phone: '+919876543210',
    entityType: 'pvt_ltd',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  } as ClientRecord;
}

function invoice(overrides: Partial<AdminDocument> = {}): AdminDocument {
  return {
    id: 'doc-1',
    type: 'INV',
    status: 'draft',
    clientId: 'client-1',
    issueDate: '2026-06-10',
    lineItems: [{ description: 'Brand system', ratePaise: 150_000, qty: 1 }],
    gstRatePercent: 18,
    placeOfSupplyStateCode: '09',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  } as AdminDocument;
}

beforeEach(() => {
  jest.clearAllMocks();
  requireAuthorizedUser.mockResolvedValue(ACTOR);
  claimSerial.mockResolvedValue(1);
  getClient.mockResolvedValue(client());
  getDocument.mockResolvedValue(invoice());
  getStudioSettings.mockResolvedValue(STUDIO_INFO);
  listFinalizedCreditNotesAgainst.mockResolvedValue([]);
});

/**
 * A zero-rated invoice rests on the studio's LUT, which lapses every 31 March.
 * Checked against the studio snapshot about to be frozen, and before the number
 * is claimed, so a refusal burns nothing.
 */
describe('the LUT guard on a zero-rated invoice', () => {
  const abroad = client({
    address: '2 Crab Apple Lane, Rouse Hill NSW 2155, Australia',
    addressParts: { line1: '2 Crab Apple Lane', city: 'Rouse Hill', state: 'NSW', pincode: '2155', country: 'AU' },
  });
  const exportInvoice = invoice({ gstRatePercent: 0, placeOfSupplyStateCode: '96' });

  beforeEach(() => {
    getClient.mockResolvedValue(abroad);
    getDocument.mockResolvedValue(exportInvoice);
  });

  it('finalizes under a live LUT', async () => {
    getStudioSettings.mockResolvedValue({ ...STUDIO_INFO, lutValidTo: '2027-03-31' });
    expect((await finalizeDocument('doc-1')).success).toBe(true);
  });

  /**
   * The Rule 46 statements are defaulted from the place of supply, and
   * finalize freezes them. Resolved without it, an export froze the domestic
   * wording: no export endorsement and the reverse-charge line without its
   * export sentence, on a document that may never change again.
   */
  it('freezes the export wording, not the domestic', async () => {
    getStudioSettings.mockResolvedValue(STUDIO_INFO);
    await finalizeDocument('doc-1');
    const frozen = saveDocument.mock.calls[0][0];
    expect(frozen.content?.exportEndorsement).toMatch(/SUPPLY MEANT FOR EXPORT/);
    expect(frozen.content?.reverseChargeLine).toMatch(/own jurisdiction/);
  });

  it('refuses an export whose endorsement was cleared, and claims no number', async () => {
    getStudioSettings.mockResolvedValue({ ...STUDIO_INFO, lutValidTo: '2027-03-31' });
    getDocument.mockResolvedValue({ ...exportInvoice, content: { exportEndorsement: '' } });
    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/endorsement/);
    expect(claimSerial).not.toHaveBeenCalled();
  });

  it('refuses with no LUT recorded, and claims no number', async () => {
    getStudioSettings.mockResolvedValue({ ...STUDIO_INFO, lutArn: undefined });
    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/LUT/);
    expect(claimSerial).not.toHaveBeenCalled();
  });

  it('refuses an invoice dated after the LUT lapsed', async () => {
    getStudioSettings.mockResolvedValue({ ...STUDIO_INFO, lutValidTo: '2026-03-31' });
    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/lapsed on 2026-03-31/);
  });

  it('does not ask a taxed domestic invoice for one', async () => {
    getClient.mockResolvedValue(client());
    getDocument.mockResolvedValue(invoice());
    getStudioSettings.mockResolvedValue({ ...STUDIO_INFO, lutArn: undefined });
    expect((await finalizeDocument('doc-1')).success).toBe(true);
  });
});

describe('the place-of-supply override guard', () => {
  it('finalizes when the stored code is the one derived from the client', async () => {
    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(true);
  });

  it('refuses a code that departs from the client with no reason recorded', async () => {
    // Karnataka on a client whose address and derivation both say Uttar Pradesh.
    getDocument.mockResolvedValue(invoice({ placeOfSupplyStateCode: '29' }));

    const result = await finalizeDocument('doc-1');

    expect(result.success).toBe(false);
    // Both codes named, and a way out. A refusal that says only "record why"
    // leaves the reader knowing they are blocked and not which figure is wrong
    // or where it is changed.
    expect(result.error).toMatch(/29/);
    expect(result.error).toMatch(/09/);
    expect(result.error).toMatch(/record a reason/i);
    expect(saveDocument).not.toHaveBeenCalled();
  });

  it('allows the departure once it says why', async () => {
    getDocument.mockResolvedValue(
      invoice({
        placeOfSupplyStateCode: '29',
        placeOfSupplyOverrideReason: 'Services relate to immovable property in Karnataka (CGST s.12(3)).',
      }),
    );

    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(true);
  });

  /**
   * This used to say the guard did not apply without GST, and pinned an export
   * finalizing under a domestic code. That export printed as domestic: no
   * place of supply, no endorsement, a UPI QR. The format freeze audit
   * (19 October 2026) found it.
   */
  it('refuses an export stored under a domestic code, at a nil rate too', async () => {
    getClient.mockResolvedValue(client({ addressParts: { ...client().addressParts!, country: 'GB' } }));
    getDocument.mockResolvedValue(
      invoice({ gstRatePercent: 0, placeOfSupplyStateCode: '29', gstLabel: 'Export of services' }),
    );

    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/96/);
    expect(claimSerial).not.toHaveBeenCalled();
  });

  it('refuses an export with no place of supply stored at all', async () => {
    getClient.mockResolvedValue(client({ addressParts: { ...client().addressParts!, country: 'GB' } }));
    getDocument.mockResolvedValue(
      invoice({ gstRatePercent: 0, placeOfSupplyStateCode: undefined }),
    );

    const result = await finalizeDocument('doc-1');
    expect(result.error).toMatch(/not set/);
  });

  it('does not fire when the client establishes no state to derive from', async () => {
    // No GSTIN and no recognisable state — there is nothing to disagree with,
    // and refusing here would strand a legacy client's invoice.
    getClient.mockResolvedValue(
      client({ addressParts: { line1: 'x', city: '', state: '', pincode: '', country: 'IN' } }),
    );
    getDocument.mockResolvedValue(invoice({ placeOfSupplyStateCode: '29' }));

    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(true);
  });
});

describe('the purchase-order guard', () => {
  it('refuses an invoice for a client who requires a PO and has none recorded', async () => {
    getClient.mockResolvedValue(client({ commercial: { poRequired: true } }));

    const result = await finalizeDocument('doc-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/requires a PO number before invoicing/i);
    expect(saveDocument).not.toHaveBeenCalled();
  });

  it('finalizes once the PO number is on the client record', async () => {
    getClient.mockResolvedValue(
      client({ commercial: { poRequired: true, poNumber: 'PO-2026-0042' } }),
    );

    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(true);
  });

  it('leaves clients who do not require a PO alone', async () => {
    getClient.mockResolvedValue(client({ commercial: { paymentTermsDays: 15 } }));

    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(true);
  });

  /** A receipt records money already received; there is nothing left to gate. */
  it('does not apply to a receipt', async () => {
    getClient.mockResolvedValue(client({ commercial: { poRequired: true } }));
    getDocument.mockResolvedValue(
      invoice({
        type: 'REC',
        payment: { date: '2026-06-10', method: 'Bank Transfer', againstInvoiceNumber: 'QS-INV-2627-001' },
      } as Partial<AdminDocument>),
    );

    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(true);
  });
});

/**
 * The third guard, and the same rule as the first applied to the rate.
 *
 * Whether GST applies and at what rate were editable fields on every invoice.
 * For a domestic recipient neither is a choice: the tax is charged under CGST
 * s.9 whatever the invoice says, and the rate follows how the service is
 * classified. So a departure is either a genuine exemption, which can be
 * stated, or a mistake, and this is where the two are told apart.
 */
describe('the tax-treatment guard', () => {
  it('finalizes a domestic invoice charging the derived rate', async () => {
    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(true);
  });

  it('refuses a domestic invoice that drops the tax with no reason recorded', async () => {
    getDocument.mockResolvedValue(invoice({ gstRatePercent: 0 }));

    const result = await finalizeDocument('doc-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/taxed at 18%/i);
    expect(saveDocument).not.toHaveBeenCalled();
  });

  /**
   * The refusal has to be actionable, and this pins the three parts of that.
   *
   * What was there before said: "This client's supply is taxed at 18% (the
   * client is unregistered, so this comes from the state on their address) and
   * the document says 0%. Record why before finalizing." The parenthetical is
   * `placeOfSupplyOf`'s explanation of *where* the supply is, interpolated into
   * a sentence about the *rate*, so it answered a question nobody asked and
   * left the reader with no idea which control to touch.
   */
  it('names both figures, why, and where to fix it', async () => {
    getDocument.mockResolvedValue(invoice({ gstRatePercent: 0 }));

    const { error } = await finalizeDocument('doc-1');

    // What is wrong: both rates, so the reader knows which is which.
    expect(error).toMatch(/charges 0% GST/i);
    expect(error).toMatch(/taxed at 18%/i);
    // Why the derived figure is what it is. About the *rate*, not the place of
    // supply: the old message explained the wrong one of the two.
    expect(error).toMatch(/9983/);
    expect(error).not.toMatch(/state on their address/i);
    // And the way out.
    expect(error).toMatch(/rate in the editing rail/i);
  });

  it('refuses a rate that is neither the derived one nor explained', async () => {
    getDocument.mockResolvedValue(invoice({ gstRatePercent: 5 }));

    const result = await finalizeDocument('doc-1');

    expect(result.success).toBe(false);
    // The document's own figure, named so the reader can see which is which.
    expect(result.error).toMatch(/charges 5% GST/i);
  });

  it('allows the departure once it says why', async () => {
    getDocument.mockResolvedValue(
      invoice({
        gstRatePercent: 0,
        gstOverrideReason: 'Exempt under Notification 12/2017, entry 66.',
      }),
    );

    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(true);
  });

  it('says nothing about an export, whatever it charges', async () => {
    // Nothing in Indian law fixes what a foreign invoice charges, and the
    // recipient's own regime may want a line this derivation cannot know about.
    getClient.mockResolvedValue(client({ addressParts: { ...client().addressParts!, country: 'AE' } }));
    getDocument.mockResolvedValue(invoice({ gstRatePercent: 0, placeOfSupplyStateCode: '96' }));

    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(true);
  });

  it('does not fire for an SEZ unit, whose nil rate is itself derived', async () => {
    getClient.mockResolvedValue(client({ tax: { sez: true } }));
    // The editor seeds the SEZ endorsement on picking the client; finalize
    // refuses a zero-rated invoice without one.
    getDocument.mockResolvedValue(
      invoice({ gstRatePercent: 0, content: { exportEndorsement: SEZ_ENDORSEMENT } }),
    );

    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(true);
  });

  /**
   * **It only runs on a document that charges tax at all.**
   *
   * This guard used to run on every type carrying a client, and a contract
   * carries `gstRatePercent: 0` by definition (`registry.ts`, `CON`): an
   * agreement is not a tax invoice and computes no tax anywhere. So every
   * contract for an Indian client was refused at finalize, against a figure the
   * document is defined to hold, with a message naming a rate control that does
   * not exist on that screen. Nothing the reader could do would clear it.
   *
   * Reported from the browser on 18 September 2026, finalizing a Master Service
   * Agreement. The place-of-supply guard above was already gated on
   * `gstRatePercent > 0` and so never had the bug; this one had no equivalent.
   *
   * **It carries a real Part**, and that is what makes the test mean anything.
   *
   * `contractFinalizeSchema` runs first and wants at least one Part with every
   * blank filled, so a contract with `parts: []` is refused before this guard
   * is ever reached. A first draft of this test asserted on the message with an
   * empty contract and passed with the gate removed: the schema's refusal was
   * what it was reading, and the guard under test never ran. A seeded Service
   * is used rather than a hand-built one because it satisfies the schema by
   * construction and cannot drift from it.
   */
  it('does not fire on a contract, which charges no tax by definition', async () => {
    const part = PARTS.find((s) => !s.archived)!;
    // Its one blank is the fee. Filled from `contractComplete` rather than
    // written out, so a clause edit that adds a blank fails loudly here instead
    // of silently returning this test to asserting nothing.
    const blanks = Object.fromEntries(
      contractComplete({ parts: [part], blanks: {} }).map(({ blank }) => [blank.key, '₹1,50,000']),
    );
    getClient.mockResolvedValue(client({ contacts: SIGNS }));
    getDocument.mockResolvedValue(contract(part, blanks));

    const result = await finalizeDocument('doc-1');

    expect(result.success).toBe(true);
    expect(saveDocument).toHaveBeenCalled();
  });

  it('refuses a contract whose client names nobody to sign', async () => {
    const part = PARTS.find((s) => !s.archived)!;
    const blanks = Object.fromEntries(
      contractComplete({ parts: [part], blanks: {} }).map(({ blank }) => [blank.key, '₹1,50,000']),
    );
    getDocument.mockResolvedValue(contract(part, blanks));

    const result = await finalizeDocument('doc-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/who signs/);
    expect(claimSerial).not.toHaveBeenCalled();
  });
});

const SIGNS = {
  primary: { name: 'Asha Rao', designation: 'Director' },
  roles: { signing: 'primary' },
} as ClientRecord['contacts'];

function contract(part: (typeof PARTS)[number], blanks: Record<string, string>): AdminDocument {
  return invoice({
    type: 'CON',
    gstRatePercent: 0,
    lineItems: [],
    contract: { parts: [part], blanks, library: {} },
  } as Partial<AdminDocument>);
}

/** Rule 46(g) with Notification 78/2020-CT: a registered recipient gets a SAC on every line. */
describe('the SAC guard', () => {
  const registered = client({ gstin: '09AAACC1206D1ZM' });

  it('refuses a line without a SAC for a GST-registered client', async () => {
    getClient.mockResolvedValue(registered);
    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/SAC/);
    expect(claimSerial).not.toHaveBeenCalled();
  });

  it('finalizes once every line carries one', async () => {
    getClient.mockResolvedValue(registered);
    getDocument.mockResolvedValue(
      invoice({ lineItems: [{ description: 'Brand system', ratePaise: 150_000, qty: 1, sacCode: '998391' }] }),
    );
    const result = await finalizeDocument('doc-1');
    expect(result.error).toBeUndefined();
  });
});

/** CGST s.34 with s.15: a credit note is held to the invoice it names (19 October 2026). */
describe('the credit note guards', () => {
  const issued = invoice({ id: 'inv-1', status: 'finalized', number: 'QS-INV-2627-005' });
  const note = (overrides: Record<string, unknown> = {}) =>
    invoice({
      id: 'doc-1',
      type: 'CRN',
      against: { invoiceNumber: 'QS-INV-2627-005', invoiceDate: '2026-06-10', invoiceId: 'inv-1' },
      reason: 'Post-supply discount agreed',
      lineItems: [{ description: 'Brand system', ratePaise: 50_000, qty: 1 }],
      ...overrides,
    } as Partial<AdminDocument>);
  const byId = (doc: AdminDocument) => (id: string) => Promise.resolve(id === 'inv-1' ? issued : doc);

  it('issues a note within what the invoice charged', async () => {
    getDocument.mockImplementation(byId(note()));
    expect((await finalizeDocument('doc-1')).error).toBeUndefined();
  });

  it('refuses one with no reason', async () => {
    getDocument.mockImplementation(byId(note({ reason: '' })));
    expect((await finalizeDocument('doc-1')).error).toMatch(/reason/);
  });

  it('refuses a different GST rate from the invoice', async () => {
    getDocument.mockImplementation(byId(note({ gstRatePercent: 12 })));
    expect((await finalizeDocument('doc-1')).error).toMatch(/18%/);
  });

  it('refuses an invoice issued to another client', async () => {
    getDocument.mockImplementation(byId(note({ clientId: 'client-2' })));
    expect((await finalizeDocument('doc-1')).error).toMatch(/another client/);
  });

  it('refuses crediting more than was charged, counting earlier notes, before claiming a number', async () => {
    getDocument.mockImplementation(byId(note()));
    listFinalizedCreditNotesAgainst.mockResolvedValue([note({ id: 'crn-0', status: 'finalized', lineItems: [{ description: 'x', ratePaise: 120_000, qty: 1 }] })]);
    const result = await finalizeDocument('doc-1');
    expect(result.error).toMatch(/more than QS-INV-2627-005 charged/);
    expect(claimSerial).not.toHaveBeenCalled();
  });
});
