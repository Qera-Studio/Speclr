import { MSA_CLAUSES, clauseInputSchema, msaClauseSchema } from '../msa';
import { contentOf } from '../../docContent';
import { DOC_TYPES } from '../../registry';
import type { ContractDocument } from '../../types';

/**
 * The clauses moved out of code and into the `clauses` table so they can be
 * edited at `/client/clauses`. These tests guard the two things that move made
 * risky: that a malformed clause cannot reach a contract, and that editing the
 * library cannot reach a contract that already exists.
 */

const doc = (content?: ContractDocument['content']): ContractDocument =>
  ({
    id: 'd1',
    type: 'CON',
    status: 'draft',
    clientId: 'c1',
    clientSnapshot: { name: 'Acme', address: '', email: '', phone: '' },
    issueDate: '2026-08-13',
    contract: { parts: [], terms: {} },
    content,
    createdAt: 0,
    updatedAt: 0,
  }) as unknown as ContractDocument;

describe('msaClauseSchema', () => {
  it('accepts every clause the seed ships', () => {
    for (const clause of MSA_CLAUSES) {
      expect(msaClauseSchema.safeParse(clause).success).toBe(true);
    }
  });

  /**
   * A numbered clause with no text prints as a bare heading in a signed
   * agreement, which reads as something having gone missing rather than as a
   * clause that says nothing.
   */
  it('refuses a clause with no body', () => {
    expect(msaClauseSchema.safeParse({ number: 1, heading: 'X', body: [] }).success).toBe(false);
    expect(msaClauseSchema.safeParse({ number: 1, heading: 'X', body: [''] }).success).toBe(false);
  });

  it('refuses a clause with no heading', () => {
    expect(msaClauseSchema.safeParse({ number: 1, heading: '  ', body: ['a'] }).success).toBe(
      false,
    );
  });

  it('refuses a number that is not a positive integer', () => {
    for (const number of [0, -1, 1.5]) {
      expect(msaClauseSchema.safeParse({ number, heading: 'X', body: ['a'] }).success).toBe(false);
    }
  });

  it('carries the archive flag on the library input', () => {
    const input = { number: 1, heading: 'X', body: ['a'], archived: false };
    expect(clauseInputSchema.safeParse(input).success).toBe(true);
    expect(clauseInputSchema.safeParse({ number: 1, heading: 'X', body: ['a'] }).success).toBe(
      false,
    );
  });
});

/**
 * The compliance seam, and the reason the library is safe to edit.
 *
 * `contentOf` is pure and client-safe — every sheet calls it on every render —
 * so it does not and must not read the database. A contract copies the library
 * onto itself when its draft is created; from then on it prints its own copy,
 * and finalize freezes the lot (`materialiseContent`).
 */
describe('contentOf, clauses', () => {
  it('prints the document’s own clauses when it carries them', () => {
    const own = [{ number: 1, heading: 'As agreed in June', body: ['The original wording.'] }];

    expect(contentOf(doc({ clauses: own }), DOC_TYPES.CON).clauses).toEqual(own);
  });

  /**
   * The fallback, unchanged: documents written before the library existed have
   * no `clauses` override, and must keep resolving exactly what they always
   * did. Removing this would silently rewrite every contract in the database.
   */
  it('falls back to the code copy for a document written before the library', () => {
    expect(contentOf(doc({}), DOC_TYPES.CON).clauses).toEqual(MSA_CLAUSES);
    expect(contentOf(doc(undefined), DOC_TYPES.CON).clauses).toEqual(MSA_CLAUSES);
  });

  /**
   * A document's copy is not merged with anything. If the library later adds a
   * 29th clause, a contract that froze 28 still prints 28 — which is the whole
   * point of freezing it.
   */
  it('never adds a clause the document does not carry', () => {
    const two = MSA_CLAUSES.slice(0, 2);

    expect(contentOf(doc({ clauses: two }), DOC_TYPES.CON).clauses).toHaveLength(2);
  });
});

/**
 * Numbers are identity: clause bodies cite each other ('has the meaning given
 * at clause 11.2'), so the seed must never renumber. If this fails, a
 * cross-reference somewhere in the text now points at the wrong clause.
 */
describe('MSA_CLAUSES numbering', () => {
  it('is consecutive from 1, with no gaps or repeats', () => {
    expect(MSA_CLAUSES.map((c) => c.number)).toEqual(
      MSA_CLAUSES.map((_, i) => i + 1),
    );
  });
});
