import { contentOf, docContentSchema, materialiseContent, splitTerms } from '../docContent';
import type { ContentSpec, ContentSource } from '../docContent';
import { DOC_TYPES } from '../registry';
import { MSA_SECTIONS } from '../msaBoilerplate';
import { stipendTerms } from '../hrContent';

const invoiceSpec: ContentSpec = DOC_TYPES.INV;
const stipendSpec: ContentSpec = DOC_TYPES.STP;

const invoice: ContentSource = { type: 'INV' };

describe('contentOf defaults', () => {
  /**
   * The guarantee that makes this layer safe to add to issued documents: a
   * document nobody has edited prints exactly what it printed before.
   */
  it('falls back to the type defaults when nothing is overridden', () => {
    const resolved = contentOf(invoice, invoiceSpec);

    expect(resolved.masthead).toBe('INVOICE');
    expect(resolved.terms).toEqual(DOC_TYPES.INV.fixedTerms);
    expect(resolved.qrCaption).toBe('Scan to pay');
  });

  it('uses the letter mastheads, not the registry label', () => {
    // The sheets print 'COMPANY OFFER LETTER'; the registry's spec says
    // 'OFFER LETTER'. The sheet wins — that is the issued wording.
    expect(contentOf({ type: 'OFR' }, DOC_TYPES.OFR).masthead).toBe('COMPANY OFFER LETTER');
  });

  /** Intern vs employee is a legal distinction, not a label (CONTEXT.md §6). */
  it('keeps the exit letter switching on engagement type', () => {
    const intern = contentOf(
      { type: 'EXIT', employeeSnapshot: { engagementType: 'intern' } },
      DOC_TYPES.EXIT,
    );
    const employee = contentOf(
      { type: 'EXIT', employeeSnapshot: { engagementType: 'employee' } },
      DOC_TYPES.EXIT,
    );

    expect(intern.masthead).toBe('INTERNSHIP COMPLETION LETTER');
    expect(employee.masthead).toBe('RELIEVING LETTER');
  });

  it('builds the stipend terms from the engagement, with the deductions note', () => {
    const resolved = contentOf(
      {
        type: 'STP',
        employeeSnapshot: { engagementType: 'intern' },
        deductionsNote: 'No TDS applicable.',
      },
      stipendSpec,
    );

    const { left, right } = stipendTerms('intern', 'No TDS applicable.');
    expect(resolved.terms).toEqual([...left, ...right]);
    expect(resolved.terms.some((t) => t.body.includes('No TDS applicable.'))).toBe(true);
  });

  it('carries the whole MSA for a contract', () => {
    expect(contentOf({ type: 'CON' }, DOC_TYPES.CON).clauses).toEqual(MSA_SECTIONS);
  });
});

describe('contentOf overrides', () => {
  it('prefers the document’s own text', () => {
    const resolved = contentOf(
      { type: 'INV', content: { masthead: 'TAX INVOICE', terms: [{ title: 'A.', body: 'B' }] } },
      invoiceSpec,
    );

    expect(resolved.masthead).toBe('TAX INVOICE');
    expect(resolved.terms).toEqual([{ title: 'A.', body: 'B' }]);
  });

  /** An emptied field is a deliberate edit — it must not silently reappear. */
  it('treats an empty string as an override, not as absent', () => {
    expect(contentOf({ type: 'INV', content: { qrCaption: '' } }, invoiceSpec).qrCaption).toBe('');
  });
});

describe('materialiseContent', () => {
  /**
   * The compliance guarantee. A finalized document carries every word it
   * printed, so revising the defaults in code later cannot rewrite it.
   */
  it('freezes the resolved defaults so later changes cannot reach the document', () => {
    const frozen = materialiseContent(invoice, invoiceSpec);

    // Simulate next year's edit to the shipped defaults.
    const revised: ContentSpec = {
      ...invoiceSpec,
      masthead: 'REVISED',
      fixedTerms: [{ title: 'New.', body: 'Different terms.' }],
    };
    const reprinted = contentOf({ type: 'INV', content: frozen }, revised);

    expect(reprinted.masthead).toBe('INVOICE');
    expect(reprinted.terms).toEqual(DOC_TYPES.INV.fixedTerms);
  });

  it('round-trips through the schema that guards the write', () => {
    // Materialised content goes back through `docContentSchema` on the next
    // save; a field it rejects would make a finalized document unsaveable.
    const parsed = docContentSchema.safeParse(materialiseContent({ type: 'CON' }, DOC_TYPES.CON));
    expect(parsed.success).toBe(true);
  });
});

describe('splitTerms', () => {
  /** The stipend prints 2 terms then 3; the split must not reshuffle them. */
  it('keeps the smaller half on the left, as the slip prints today', () => {
    const { left, right } = stipendTerms('intern', '');
    const split = splitTerms([...left, ...right]);

    expect(split.left).toEqual(left);
    expect(split.right).toEqual(right);
  });
});
