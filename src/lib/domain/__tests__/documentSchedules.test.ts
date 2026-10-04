import { documentSchedules } from '../documentSchedules';
import { contractDoc } from '../contract/__tests__/fixture';
import type { ContractService } from '../service';
import type { AdminDocument } from '../types';

const catalogue = [
  { code: 'SOC', scheduleKey: 'retainer' },
  { code: 'WEB', scheduleKey: 'build' },
  { code: 'DNS', scheduleKey: 'setup' },
] as ContractService[];

const line = (serviceCode?: string) => ({
  description: 'Work',
  ratePaise: 100000,
  qty: 1,
  serviceCode,
});

const doc = (over: Record<string, unknown>): AdminDocument =>
  ({ id: 'x', type: 'INV', status: 'draft', issueDate: '2026-06-10', lineItems: [], ...over }) as unknown as AdminDocument;

const keys = (schedules: ReturnType<typeof documentSchedules>) => schedules.map((s) => s.key);

describe('documentSchedules', () => {
  it("reads a contract's Parts, each Schedule once, in canonical order", () => {
    // 15 is a Retainer Part, 05 Build, 01 Setup; the order they came in is not the order they print.
    const contract = contractDoc({ codes: ['15', '05', '01', '05'] });
    expect(keys(documentSchedules(contract))).toEqual(['setup', 'build', 'retainer']);
    expect(documentSchedules(contractDoc({ codes: [] }))).toEqual([]);
  });

  it("reads an invoice's lines through the catalogue", () => {
    const invoice = doc({ lineItems: [line('SOC'), line('WEB'), line('SOC')] });
    expect(keys(documentSchedules(invoice, catalogue))).toEqual(['build', 'retainer']);
  });

  /** A typed line names no Service; a code the catalogue no longer carries is skipped, not guessed. */
  it('counts nothing for a typed line or a retired code', () => {
    const invoice = doc({ lineItems: [line(), line('GONE')] });
    expect(documentSchedules(invoice, catalogue)).toEqual([]);
    expect(documentSchedules(doc({ lineItems: [line('SOC')] }))).toEqual([]);
  });

  it("reads a quotation's deliverables and add-ons", () => {
    const quote = doc({
      type: 'SQ',
      services: [{ name: 'Web', lines: [line('WEB')], addOns: [line('DNS')] }],
      recurring: [],
    });
    expect(keys(documentSchedules(quote, catalogue))).toEqual(['setup', 'build']);
  });
});
