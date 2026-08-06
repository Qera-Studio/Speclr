import {
  clientInputSchema,
  contractFinalizeSchema,
  DOC_TYPE_BY_SLUG,
  DOC_TYPE_LIST,
  DOC_TYPES,
  invoiceDraftSchema,
  invoiceFinalizeSchema,
  letterFinalizeSchema,
  receiptDraftSchema,
  receiptFinalizeSchema,
  stipendFinalizeSchema,
} from '../registry';

const validLineItem = { description: 'Shopify website final (50%)', ratePaise: 2500000, qty: 1 };

const validInvoiceFields = {
  issueDate: '2026-07-21',
  lineItems: [validLineItem],
  gstRatePercent: 0,
  gstLabel: 'not applicable - registration in process',
};

describe('DOC_TYPES registry', () => {
  it('contains the Phase 1 + Phase 2 + Phase 3 types', () => {
    expect(Object.keys(DOC_TYPES).sort()).toEqual([
      'CON', 'EXIT', 'EXP', 'INV', 'OFR', 'REC', 'STP',
    ]);
  });

  it('has unique slugs mapped in DOC_TYPE_BY_SLUG', () => {
    const slugs = DOC_TYPE_LIST.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(DOC_TYPE_BY_SLUG['invoice'].code).toBe('INV');
    expect(DOC_TYPE_BY_SLUG['receipt'].code).toBe('REC');
  });

  it('every entry has a non-empty masthead and label', () => {
    for (const spec of DOC_TYPE_LIST) {
      expect(spec.masthead.length).toBeGreaterThan(0);
      expect(spec.label.length).toBeGreaterThan(0);
    }
  });

  it('every financial entry has fixed terms clauses with titles and bodies', () => {
    for (const spec of DOC_TYPE_LIST.filter((s) => s.kind === 'financial')) {
      expect(spec.fixedTerms.length).toBeGreaterThan(0);
      for (const term of spec.fixedTerms) {
        expect(term.title.length).toBeGreaterThan(0);
        expect(term.body.length).toBeGreaterThan(0);
      }
    }
  });

  it('the invoice carries the 6-clause terms set, the receipt the 3-clause set', () => {
    expect(DOC_TYPES.INV.fixedTerms).toHaveLength(6);
    expect(DOC_TYPES.REC.fixedTerms).toHaveLength(3);
  });

  it('only the receipt carries a PAID badge and payment block', () => {
    expect(DOC_TYPES.REC.badge).toMatchObject({ text: 'PAID', tone: 'paid' });
    expect(DOC_TYPES.REC.hasPayment).toBe(true);
    expect(DOC_TYPES.INV.badge).toBeUndefined();
    expect(DOC_TYPES.INV.hasDueDate).toBe(true);
  });
});

describe('invoice schemas', () => {
  it('finalize accepts a complete invoice', () => {
    expect(invoiceFinalizeSchema.safeParse(validInvoiceFields).success).toBe(true);
  });

  it('finalize rejects an empty line-item list', () => {
    expect(
      invoiceFinalizeSchema.safeParse({ ...validInvoiceFields, lineItems: [] }).success,
    ).toBe(false);
  });

  it('finalize rejects a line item without a description', () => {
    expect(
      invoiceFinalizeSchema.safeParse({
        ...validInvoiceFields,
        lineItems: [{ ...validLineItem, description: '' }],
      }).success,
    ).toBe(false);
  });

  it('draft accepts incomplete line items', () => {
    expect(
      invoiceDraftSchema.safeParse({
        ...validInvoiceFields,
        lineItems: [{ description: '', ratePaise: 0, qty: 0 }],
      }).success,
    ).toBe(true);
  });

  it('rejects GST rates outside 0–28', () => {
    expect(
      invoiceFinalizeSchema.safeParse({ ...validInvoiceFields, gstRatePercent: 29 }).success,
    ).toBe(false);
    expect(
      invoiceFinalizeSchema.safeParse({ ...validInvoiceFields, gstRatePercent: -1 }).success,
    ).toBe(false);
  });

  it('rejects quantities with more than 2 decimal places', () => {
    expect(
      invoiceFinalizeSchema.safeParse({
        ...validInvoiceFields,
        lineItems: [{ ...validLineItem, qty: 1.125 }],
      }).success,
    ).toBe(false);
  });

  it('rejects malformed issue dates', () => {
    expect(
      invoiceFinalizeSchema.safeParse({ ...validInvoiceFields, issueDate: '21/07/2026' }).success,
    ).toBe(false);
  });

  it('finalize requires a place of supply when GST applies', () => {
    expect(
      invoiceFinalizeSchema.safeParse({ ...validInvoiceFields, gstRatePercent: 18 }).success,
    ).toBe(false);
    expect(
      invoiceFinalizeSchema.safeParse({
        ...validInvoiceFields,
        gstRatePercent: 18,
        placeOfSupplyStateCode: '07',
      }).success,
    ).toBe(true);
  });

  it('draft never requires a place of supply', () => {
    expect(
      invoiceDraftSchema.safeParse({ ...validInvoiceFields, gstRatePercent: 18 }).success,
    ).toBe(true);
  });

  it('rejects malformed state codes', () => {
    expect(
      invoiceFinalizeSchema.safeParse({
        ...validInvoiceFields,
        gstRatePercent: 18,
        placeOfSupplyStateCode: 'UP',
      }).success,
    ).toBe(false);
  });
});

describe('receipt schemas', () => {
  const validReceiptFields = {
    ...validInvoiceFields,
    payment: { date: '2026-06-21', method: 'UPI', reference: '126634570908' },
  };

  it('finalize accepts a complete receipt', () => {
    expect(receiptFinalizeSchema.safeParse(validReceiptFields).success).toBe(true);
  });

  it('finalize requires a payment date', () => {
    expect(
      receiptFinalizeSchema.safeParse({
        ...validReceiptFields,
        payment: { ...validReceiptFields.payment, date: '' },
      }).success,
    ).toBe(false);
  });

  it('draft allows an empty payment date', () => {
    expect(
      receiptDraftSchema.safeParse({
        ...validReceiptFields,
        payment: { ...validReceiptFields.payment, date: '' },
      }).success,
    ).toBe(true);
  });

  it('rejects unknown payment methods', () => {
    expect(
      receiptFinalizeSchema.safeParse({
        ...validReceiptFields,
        payment: { ...validReceiptFields.payment, method: 'Cheque' },
      }).success,
    ).toBe(false);
  });
});

describe('clientInputSchema', () => {
  const validClient = {
    name: 'ZaibQ Studioh',
    companyName: 'ZaibQ Studioh Private Limited',
    address: 'F 581 basement, Lado Sarai, New Delhi, Delhi - 110030',
    email: 'client@example.com',
    phone: '+91 98730 10678',
  };

  it('accepts a valid client', () => {
    expect(clientInputSchema.safeParse(validClient).success).toBe(true);
  });

  it('requires name, company name, address, email, and phone', () => {
    // The company name is what prints on the document, so it is as required as
    // the address — an invoice addressed to a pet name is not a tax document.
    for (const key of ['name', 'companyName', 'address', 'email', 'phone'] as const) {
      expect(clientInputSchema.safeParse({ ...validClient, [key]: '' }).success).toBe(false);
    }
  });

  it('rejects invalid email formats', () => {
    expect(clientInputSchema.safeParse({ ...validClient, email: 'not-an-email' }).success).toBe(
      false,
    );
  });

  it('accepts an optional gstin', () => {
    expect(
      clientInputSchema.safeParse({ ...validClient, gstin: '09AAACQ1234A1Z5' }).success,
    ).toBe(true);
  });
});

describe('CON registry entry', () => {
  it('is registered with the contract kind', () => {
    expect(DOC_TYPES.CON.kind).toBe('contract');
    expect(DOC_TYPES.CON.slug).toBe('contract');
    expect(DOC_TYPES.CON.masthead).toBe('CONTRACT AGREEMENT');
    expect(DOC_TYPE_BY_SLUG['contract'].code).toBe('CON');
  });
  it('marks invoice and receipt as financial', () => {
    expect(DOC_TYPES.INV.kind).toBe('financial');
    expect(DOC_TYPES.REC.kind).toBe('financial');
  });
  it('contract finalize requires at least one schedule', () => {
    const oneSchedule = {
      issueDate: '2026-07-21',
      schedules: [{ title: 'Shopify', overview: '', scopeItems: [], exclusionItems: [], priceNote: '', milestones: [], revisionsNote: '', disclaimerNote: '', supportNote: '' }],
    };
    expect(contractFinalizeSchema.safeParse(oneSchedule).success).toBe(true);
    expect(contractFinalizeSchema.safeParse({ ...oneSchedule, schedules: [] }).success).toBe(false);
  });
});

describe('HR registry entries', () => {
  it('registers STP as hr-slip, OFR/EXP/EXIT as hr-letter', () => {
    expect(DOC_TYPES.STP.kind).toBe('hr-slip');
    expect(DOC_TYPES.OFR.kind).toBe('hr-letter');
    expect(DOC_TYPES.EXP.kind).toBe('hr-letter');
    expect(DOC_TYPES.EXIT.kind).toBe('hr-letter');
  });
  it('maps HR slugs', () => {
    expect(DOC_TYPE_BY_SLUG['stipend'].code).toBe('STP');
    expect(DOC_TYPE_BY_SLUG['offer-letter'].code).toBe('OFR');
    expect(DOC_TYPE_BY_SLUG['experience-letter'].code).toBe('EXP');
    expect(DOC_TYPE_BY_SLUG['exit-letter'].code).toBe('EXIT');
  });
  it('stipend finalize requires at least one line item + employeeId', () => {
    const base = { issueDate: '2026-07-21', gstRatePercent: 0, employeeId: 'emp-1', stipendPeriod: '12-31 May', stipendMonth: 'May 2026', paymentMethod: 'Bank transfer', deductionsNote: 'x', lineItems: [{ description: 'Stipend', ratePaise: 250000, qty: 1 }] };
    expect(stipendFinalizeSchema.safeParse(base).success).toBe(true);
    expect(stipendFinalizeSchema.safeParse({ ...base, lineItems: [] }).success).toBe(false);
    expect(stipendFinalizeSchema.safeParse({ ...base, employeeId: '' }).success).toBe(false);
  });
  it('letter finalize requires a non-empty body + employeeId', () => {
    const base = { issueDate: '2026-07-21', employeeId: 'emp-1', bodyParagraphs: ['This certifies…'], bulletSections: [] };
    expect(letterFinalizeSchema.safeParse(base).success).toBe(true);
    expect(letterFinalizeSchema.safeParse({ ...base, bodyParagraphs: [] }).success).toBe(false);
    expect(letterFinalizeSchema.safeParse({ ...base, employeeId: '' }).success).toBe(false);
  });
});
