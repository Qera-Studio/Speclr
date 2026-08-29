import { docFilename } from '../docFilename';
import type { AdminDocument } from '../types';

/**
 * What a document is called when it leaves the app.
 *
 * The rule that matters: **a finalized document is called by its number.** That
 * number is how it is filed, cited in a GST return and found again in 2032, so
 * a download landing as 'Contract-Clayora-2026-08-29.pdf' loses the one string
 * that identifies it. Contracts got this wrong before this module existed.
 */

const base = {
  id: 'doc_1',
  status: 'finalized' as const,
  issueDate: '2026-08-29',
  createdAt: 0,
  updatedAt: 0,
  lineItems: [],
  gstRatePercent: 18,
};

describe('docFilename', () => {
  it('calls every numbered finalized document by its number', () => {
    const cases: Array<[string, AdminDocument]> = [
      [
        'QS-INV-2627-001',
        { ...base, type: 'INV', number: 'QS-INV-2627-001', clientId: 'c1' } as unknown as AdminDocument,
      ],
      [
        'QS-CON-2627-004',
        {
          ...base,
          type: 'CON',
          number: 'QS-CON-2627-004',
          clientId: 'c1',
          clientSnapshot: { name: 'Clayora' },
        } as unknown as AdminDocument,
      ],
      [
        'QS-STP-2627-009',
        {
          ...base,
          type: 'STP',
          number: 'QS-STP-2627-009',
          employeeId: 'e1',
          employeeSnapshot: { name: 'Asha Rao' },
        } as unknown as AdminDocument,
      ],
    ];

    for (const [expected, doc] of cases) {
      expect(docFilename(doc)).toBe(expected);
    }
  });

  /**
   * The regression. A contract is numbered from the same atomic counter as an
   * invoice, but the print route built its name from the client and the date
   * and never looked at `number`.
   */
  it('does not fall back to the client name once a contract is numbered', () => {
    const contract = {
      ...base,
      type: 'CON',
      number: 'QS-CON-2627-004',
      clientId: 'c1',
      clientSnapshot: { name: 'Clayora' },
    } as unknown as AdminDocument;
    expect(docFilename(contract)).not.toContain('Clayora');
  });

  it('describes an unnumbered draft instead, since it has no number to use', () => {
    const draft = {
      ...base,
      status: 'draft',
      type: 'INV',
      number: undefined,
      clientId: 'c1',
    } as unknown as AdminDocument;
    expect(docFilename(draft)).toBe('INV-draft');
  });

  /** Letters are never numbered: nothing files them by reference. */
  it('names a letter for its type, person and date', () => {
    const letter = {
      ...base,
      type: 'EXIT',
      employeeId: 'e1',
      employeeSnapshot: { name: 'Asha Rao' },
    } as unknown as AdminDocument;
    // Spaces become hyphens, or the name arrives quoted in a header.
    expect(docFilename(letter)).toContain('Asha-Rao');
    expect(docFilename(letter)).toContain('2026-08-29');
    expect(docFilename(letter)).not.toMatch(/\s/);
  });
});
