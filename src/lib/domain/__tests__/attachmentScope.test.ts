import {
  ATTACHMENT_KINDS,
  attachmentExtraKindsFor,
  attachmentSlotsFor,
} from '../client';

/**
 * What a client is asked to send, scoped on both axes.
 *
 * Only ever filters what is *offered*. A document already on a record keeps its
 * label whatever the record later says, which is why nothing here removes a
 * kind from `ATTACHMENT_KINDS`.
 */
describe('attachmentSlotsFor', () => {
  it('asks an Indian company for its registrations', () => {
    expect(attachmentSlotsFor({ country: 'IN' })).toEqual([
      'gst_certificate',
      'pan',
      'incorporation',
    ]);
  });

  it('asks a foreign client for the export paperwork instead', () => {
    expect(attachmentSlotsFor({ country: 'GB' })).toEqual(['tax_form', 'firc']);
  });

  it('drops the incorporation certificate for a person', () => {
    expect(attachmentSlotsFor({ country: 'IN', clientKind: 'individual' })).toEqual([
      'gst_certificate',
      'pan',
    ]);
  });

  // Every client written before onboarding existed, and every half-filled one.
  it('reads an empty context as an Indian company', () => {
    expect(attachmentSlotsFor({})).toEqual(attachmentSlotsFor({ country: 'IN' }));
  });
});

describe('attachmentExtraKindsFor', () => {
  it('never offers a kind twice', () => {
    for (const ctx of [{ country: 'IN' }, { country: 'GB' }, { clientKind: 'individual' as const }]) {
      const both = [...attachmentSlotsFor(ctx), ...attachmentExtraKindsFor(ctx)];
      expect(new Set(both).size).toBe(both.length);
    }
  });

  it('keeps "other" on offer everywhere, since it is the answer for the rest', () => {
    expect(attachmentExtraKindsFor({ country: 'GB', clientKind: 'individual' })).toContain('other');
  });

  it('drops the accounts-payable paperwork for a person', () => {
    const extras = attachmentExtraKindsFor({ country: 'IN', clientKind: 'individual' });
    expect(extras).not.toContain('purchase_order');
    expect(extras).not.toContain('vendor_form');
    // MSME stays: Udyam registration covers proprietorships.
    expect(extras).toContain('msme');
  });

  it('drops the India-only paperwork abroad', () => {
    const extras = attachmentExtraKindsFor({ country: 'US' });
    expect(extras).not.toContain('tds_certificate');
    expect(extras).not.toContain('msme');
    expect(extras).not.toContain('gst_certificate');
  });

  /**
   * Not one context, but all of them together. A kind nobody can ever reach is
   * dead weight in `ATTACHMENT_KINDS` and a label nothing will ever print, so
   * the union across the four contexts has to be the whole list.
   */
  it('leaves no kind unreachable from every context', () => {
    const reachable = new Set<string>();
    for (const country of ['IN', 'GB']) {
      for (const clientKind of ['company', 'individual'] as const) {
        const ctx = { country, clientKind };
        for (const kind of [...attachmentSlotsFor(ctx), ...attachmentExtraKindsFor(ctx)]) {
          reachable.add(kind);
        }
      }
    }
    expect([...reachable].sort()).toEqual([...ATTACHMENT_KINDS].sort());
  });
});
