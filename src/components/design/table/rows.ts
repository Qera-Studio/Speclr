/**
 * The rows the template table is drawn over.
 *
 * **None of this is anybody's data**, and none of it comes from a table. It is
 * a record shaped to exercise every column kind at once, which is the one thing
 * a real list cannot do: `clients` has no money column, `documents` has no
 * person column, and neither has a value long enough to prove that truncation
 * works. A specimen over real rows would be a specimen of whichever table
 * happened to be lent to it.
 *
 * It sits under `library/table/` rather than in `experiment/`, and the
 * difference is what each is for. `experiment/sampleColumns.ts` invents columns
 * the **clients** table might grow, so its warning is that a stub must never
 * reach the production clients list. This invents a record that is not a client
 * at all and never will be, so there is nothing here to leak: the file's job is
 * to be copied *from*, not imported.
 *
 * **Every value is chosen for a case, not for plausibility.** The awkward ones
 * are the point, and each is noted where it sits:
 *
 * - a name longer than any sensible column, so truncation is visible at rest;
 * - a row with no owner, no team and no amount, so `NIL` is on the page rather
 *   than described;
 * - amounts three orders of magnitude apart, so `tabular-nums` has something to
 *   align and a lakh-grouped figure sits beside a four-digit one;
 * - one row of each status, so the badge is never shown in only one state;
 * - a country that is not India, so the flag chip and the blank-reads-as-India
 *   rule are both exercised.
 *
 * Twelve rows, deliberately: `PAGE_SIZE` is ten, so the pager has two pages to
 * be. A specimen that fits on one page hides the one control every table has.
 */

export type TemplateStatus = 'draft' | 'finalized' | 'void';

export interface TemplateRow {
  /** Stable identity. `RecordTable` keys and selects on this. */
  id: string;
  /** The row's name: the frozen first column, and what a row announces as. */
  name: string;
  /** An identifier somebody retypes elsewhere, so the cell offers a copy. */
  reference: string;
  status: TemplateStatus;
  /** Integer minor units, as every amount in this app is (`CONTEXT.md` §1). */
  amountMinor?: number;
  /** A category with no ordering, drawn as an accent badge. */
  category: string;
  /** One person. Absent on one row, so the empty case is on the page. */
  owner?: string;
  /** Several people, stacked. Empty on one row, for the same reason. */
  team: string[];
  /** ISO 3166-1 alpha-2. Blank reads as India, as everywhere in this app. */
  country?: string;
  city?: string;
  /** An ISO date, formatted on the way out and never printed as stored. */
  issuedOn: string;
  /** Free prose, which is the column that has to truncate. */
  note: string;
}

export const TEMPLATE_ROWS: TemplateRow[] = [
  {
    id: 't1',
    name: 'Clayora',
    reference: 'QS-INV-2627-001',
    status: 'finalized',
    amountMinor: 14_20_000_00,
    category: 'Ceramics',
    owner: 'Shivanshu',
    team: ['Shivanshu', 'Ria'],
    country: 'IN',
    city: 'Ghaziabad',
    issuedOn: '2026-06-10',
    note: 'Retainer, second quarter.',
  },
  {
    // The long name, and it is the first thing to look at on this table. Under
    // `table-layout: fixed` a value longer than its column is clipped, so the
    // frozen Name column is where truncation has to be proven: if this row
    // reads 'Northbank Studio and Work…' with an ellipsis, the rule holds.
    id: 't2',
    name: 'Northbank Studio and Workshop Limited',
    reference: 'QS-SQ-2627-014',
    status: 'draft',
    amountMinor: 62_000_00,
    category: 'Hospitality',
    owner: 'Ria',
    team: ['Ria', 'Aarav', 'Meera', 'Kabir'],
    country: 'GB',
    city: 'Bridge of Earn',
    issuedOn: '2026-07-02',
    note: 'Awaiting the signed schedule before the deposit invoice goes out.',
  },
  {
    // The empty row. No amount, no owner, no team, and it is here because every
    // one of those cells has a different way of saying nothing: `NIL` for the
    // person, `NIL` for the stack, and a right-aligned `NIL` for the money,
    // which must not be a zero. A zero is a figure; an absence is not.
    id: 't3',
    name: 'Ashwell',
    reference: 'QS-CON-2627-003',
    status: 'draft',
    category: 'SaaS',
    team: [],
    country: 'IN',
    city: 'Pune',
    issuedOn: '2026-07-19',
    note: '',
  },
  {
    id: 't4',
    name: 'Fernlea Health',
    reference: 'QS-INV-2627-002',
    status: 'finalized',
    amountMinor: 3_45_000_00,
    category: 'Healthcare',
    owner: 'Meera',
    team: ['Meera'],
    country: 'IN',
    city: 'Bengaluru',
    issuedOn: '2026-07-24',
    note: 'Paid in full.',
  },
  {
    // The void row, and the only one. A status column drawn with two of its
    // three states is a status column that has not been looked at.
    id: 't5',
    name: 'Portside Retail',
    reference: 'QS-INV-2627-003',
    status: 'void',
    amountMinor: 9_800_00,
    category: 'Retail',
    owner: 'Kabir',
    team: ['Kabir', 'Nisha'],
    country: 'AU',
    city: 'Rouse Hill',
    issuedOn: '2026-08-01',
    note: 'Cancelled before issue; replaced by 004.',
  },
  {
    // The small amount, three orders of magnitude under the largest. It is what
    // makes right alignment worth having: the two figures line up on their last
    // digit and the difference in magnitude is readable as a shape.
    id: 't6',
    name: 'Halden',
    reference: 'QS-STP-2627-009',
    status: 'finalized',
    amountMinor: 1_200_00,
    category: 'Education',
    owner: 'Nisha',
    team: ['Nisha', 'Shivanshu'],
    // No country at all, which reads as India. The one row that proves the
    // blank-is-India rule rather than describing it.
    city: 'Jaipur',
    issuedOn: '2026-08-06',
    note: 'Stipend, July.',
  },
  {
    id: 't7',
    name: 'Merrow Fintech',
    reference: 'QS-SQ-2627-021',
    status: 'draft',
    amountMinor: 28_75_000_00,
    category: 'Fintech',
    owner: 'Aarav',
    team: ['Aarav', 'Ria', 'Meera'],
    country: 'SG',
    city: 'Singapore',
    issuedOn: '2026-08-11',
    note: 'Three phases, the last on handover.',
  },
  {
    id: 't8',
    name: 'Stonebridge Estates',
    reference: 'QS-CON-2627-004',
    status: 'finalized',
    amountMinor: 6_40_000_00,
    category: 'Real Estate',
    owner: 'Shivanshu',
    team: ['Shivanshu', 'Kabir'],
    country: 'AE',
    city: 'Dubai',
    issuedOn: '2026-08-18',
    note: 'Annual agreement, renews in April.',
  },
  {
    id: 't9',
    name: 'Verity Labs',
    reference: 'QS-INV-2627-004',
    status: 'finalized',
    amountMinor: 88_000_00,
    category: 'SaaS',
    owner: 'Ria',
    team: ['Ria'],
    country: 'US',
    city: 'Austin',
    issuedOn: '2026-08-25',
    note: 'Export invoice, zero-rated under LUT.',
  },
  {
    id: 't10',
    name: 'Kestrel Hospitality',
    reference: 'QS-SQ-2627-030',
    status: 'draft',
    amountMinor: 1_95_000_00,
    category: 'Hospitality',
    owner: 'Meera',
    team: ['Meera', 'Nisha'],
    country: 'IN',
    city: 'Goa',
    issuedOn: '2026-09-01',
    note: 'Quote sent; chasing.',
  },
  {
    // Rows eleven and twelve exist only to put the table on two pages. There is
    // nothing special about either, which is itself worth saying: a specimen
    // that made every row remarkable would not look like a list.
    id: 't11',
    name: 'Ardan Ceramics',
    reference: 'QS-INV-2627-005',
    status: 'finalized',
    amountMinor: 52_000_00,
    category: 'Ceramics',
    owner: 'Kabir',
    team: ['Kabir'],
    country: 'IN',
    city: 'Kolkata',
    issuedOn: '2026-09-08',
    note: 'Second of three.',
  },
  {
    id: 't12',
    name: 'Lowfield Education',
    reference: 'QS-CON-2627-005',
    status: 'draft',
    amountMinor: 4_10_000_00,
    category: 'Education',
    owner: 'Aarav',
    team: ['Aarav', 'Shivanshu', 'Ria', 'Nisha'],
    country: 'IN',
    city: 'Chennai',
    issuedOn: '2026-09-15',
    note: 'Awaiting the clause review.',
  },
];
