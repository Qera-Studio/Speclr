/**
 * The wage register: every issued pay slip, one row per employee per month.
 *
 * Payment of Wages Act s.13A and the Code on Wages want a register of wages
 * kept. speclr already holds every figure it needs, frozen on each issued pay
 * slip, so the register is derived from them rather than kept as a second
 * record that could disagree (`PRINCIPLES.md` rule 3). Built 19 October 2026
 * on the founder's instruction. The columns follow the usual register form;
 * which state form applies is a question for a lawyer (`ROADMAP.md`).
 */
import { lineAmountPaise, slipTotals } from './money';
import type { CurrencyCode } from './currency';
import type { SlipDocument } from './types';

export interface WageRegisterRow {
  /** The slip's own number, which is what the register cites. */
  number: string;
  name: string;
  employeeCode?: string;
  designation: string;
  /** Monthly, as frozen on the slip. Absent on slips issued before it was. */
  ratePaise?: number;
  daysPaid?: number;
  lopDays?: number;
  grossPaise: number;
  deductions: { description: string; paise: number }[];
  deductionsPaise: number;
  netPaise: number;
  /** The slip's issue date, which is when the payment it records was made. */
  paidOn: string;
  paymentMethod: string;
  currency: CurrencyCode;
}

/** Issued pay slips only: a draft records nothing that was paid. */
function issued(slips: SlipDocument[]): SlipDocument[] {
  return slips.filter((s) => s.type === 'PAY' && s.status === 'finalized');
}

/** The months with at least one issued pay slip, newest first ('YYYY-MM'). */
export function registerMonths(slips: SlipDocument[]): string[] {
  return [...new Set(issued(slips).map((s) => s.stipendMonth))].sort().reverse();
}

/** One month's register, in employee-name order. */
export function wageRegisterRows(slips: SlipDocument[], month: string): WageRegisterRow[] {
  return issued(slips)
    .filter((s) => s.stipendMonth === month)
    .map((s) => {
      const totals = slipTotals(s.lineItems, s.deductions);
      return {
        number: s.number ?? '',
        name: s.employeeSnapshot.name,
        employeeCode: s.employeeSnapshot.payroll?.employeeCode,
        designation: s.employeeSnapshot.role,
        ratePaise: s.employeeSnapshot.payAmountPaise,
        daysPaid: s.daysPaid,
        lopDays: s.lopDays,
        grossPaise: totals.grossPaise,
        deductions: (s.deductions ?? []).map((d) => ({ description: d.description, paise: lineAmountPaise(d) })),
        deductionsPaise: totals.deductionsPaise,
        netPaise: totals.netPaise,
        paidOn: s.issueDate,
        paymentMethod: s.paymentMethod,
        currency: s.currency ?? 'INR',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Plain decimal, two places, no symbol: what a spreadsheet sums. */
const amount = (paise: number | undefined) => (paise === undefined ? '' : (paise / 100).toFixed(2));

function cell(value: string | number | undefined): string {
  const text = value === undefined ? '' : String(value);
  // Quote anything a spreadsheet would split or misread, and neutralise a
  // leading formula character (CSV injection: a name typed as "=HYPERLINK(...)").
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** The register as CSV, one row per slip, deductions itemised in one column. */
export function wageRegisterCsv(rows: WageRegisterRow[]): string {
  const head = [
    'Slip number', 'Employee', 'Employee code', 'Designation', 'Rate of wages (monthly)',
    'Days paid', 'Loss of pay days', 'Gross wages', 'Deductions', 'Total deductions',
    'Net wages', 'Date paid', 'Paid by', 'Currency',
  ];
  const body = rows.map((r) => [
    r.number, r.name, r.employeeCode, r.designation, amount(r.ratePaise),
    r.daysPaid, r.lopDays, amount(r.grossPaise),
    r.deductions.map((d) => `${d.description}: ${amount(d.paise)}`).join('; '),
    amount(r.deductionsPaise), amount(r.netPaise), r.paidOn, r.paymentMethod, r.currency,
  ]);
  return [head, ...body].map((row) => row.map(cell).join(',')).join('\n') + '\n';
}
