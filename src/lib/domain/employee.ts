/**
 * Reusable employee/intern records for HR documents (stipend slips, offer,
 * experience, and exit letters). Mirrors the ServiceTemplate/ClientRecord
 * entity pattern: an interface, a zod input schema, an empty-input helper,
 * and a pronoun resolver used by letter boilerplate.
 *
 * Client-safe: zod schemas are shared by client forms and Server Actions.
 */

import { z } from 'zod';
import { isISODate } from './dates';
import { addressPartsSchema, type AddressParts } from './address';
import { IFSC_RE } from './bank';
import { CURRENCY_CODES, DEFAULT_CURRENCY, type CurrencyCode } from './currency';
import type { EngagementType, PayrollIds, PronounKey } from './types';

export interface EmployeeRecord {
  id: string;
  name: string;
  /** Flat printable address — what HR documents render. */
  address: string;
  /** Structured parts for editing; absent on records that predate them. */
  addressParts?: AddressParts;
  email: string;
  /** E.164, e.g. '+919876543210'. Legacy rows may hold arbitrary text. */
  phone: string;
  role: string;
  engagementType: EngagementType;
  pronoun: PronounKey;
  joiningDate: string;
  endDate?: string;
  /**
   * What this person is paid **each month**. Every document reads this: the
   * slips seed their earnings from it, and the offer letter states it.
   *
   * Derived from `annualSalaryPaise` when there is one (see the employees
   * action) so the two can never disagree; entered directly for an intern,
   * whose stipend is a monthly figure and nothing else.
   */
  payAmountPaise: number;
  /**
   * An employee's salary as quoted — the figure an offer letter names and the
   * one a raise is discussed in. **Employees only**: an intern is offered a
   * monthly stipend, not an annual package, and saying otherwise on their offer
   * letter would frame the internship as employment.
   *
   * "Salary" here means what the employee is actually paid, not a cost-to-
   * company inflated by employer contributions — Qera has none to add (PF needs
   * 20+ employees, gratuity five years' service), so gross and CTC are the same
   * number today. Revisit that if the studio ever crosses either threshold.
   */
  annualSalaryPaise?: number;
  /** Record-keeping only — documents still print INR. See currency.ts. */
  payCurrency?: CurrencyCode;
  bank: {
    bankName: string;
    accountNo: string;
    ifsc: string;
    /** Filled from the IFSC lookup. Record-keeping only — no document prints it. */
    branch?: string;
    upiId?: string;
    /** Compressed data URL of the employee's receiving UPI QR. */
    upiQrDataUrl?: string;
  };
  /**
   * Statutory payroll identifiers, printed on a pay slip.
   *
   * One optional group rather than five columns because nothing queries them
   * and a group keeps the next identifier (LWF, say) migration-free — the same
   * reasoning as `bank`. Every field is optional: an employee record is often
   * created before PF/ESI registration exists, and an intern has none of them.
   */
  payroll?: PayrollIds;
  createdAt: number;
  updatedAt: number;
}

/**
 * Cap for the stored QR image. It rides along in the employee row *and* in the
 * snapshot of every stipend slip issued to them, so it has to stay small — the
 * uploader compresses to fit well under this.
 */
export const MAX_UPI_QR_BYTES = 120_000;

const isoDate = z.string().refine(isISODate, { message: "Expected 'YYYY-MM-DD'." });

/**
 * PAN moved to `taxIds/india.ts` when clients gained one — it is a tax
 * identifier before it is an employment one, and a client's PAN needs the same
 * three helpers with a different expected holder type.
 *
 * Re-exported rather than relocated at the call sites: every import of
 * `PAN_RE` / `panHolderTypeError` / `panSurnameMismatch` from here keeps
 * working, and `panHolderTypeError`'s new second argument defaults to `['P']`,
 * so the meaning of each existing call is unchanged.
 */
export { PAN_RE, panHolderTypeError, panSurnameMismatch } from './taxIds/india';

// Imported as well as re-exported: `export … from` does not bind the names
// locally, and `payrollIdsSchema` below needs them.
import { PAN_RE, panHolderTypeError } from './taxIds/india';

/**
 * Statutory identifiers. Every field optional and blank-tolerant: these are
 * filled in over time, and a record must stay saveable before PF/ESI
 * registration exists. PAN is shape-checked when given for the same reason the
 * IFSC is — a malformed PAN is never a legacy quirk, it is simply wrong, and it
 * prints on a statutory wage slip.
 */
export const payrollIdsSchema = z.object({
  employeeCode: z.string().trim().max(40).optional(),
  pan: z
    .string()
    .trim()
    .refine((v) => v === '' || PAN_RE.test(v.toUpperCase()), {
      message: 'Expected a PAN like ABCDE1234F.',
    })
    .refine((v) => v === '' || !PAN_RE.test(v.toUpperCase()) || !panHolderTypeError(v), {
      message: 'This PAN does not belong to an individual.',
    })
    .optional(),
  uan: z.string().trim().max(20).optional(),
  pfNumber: z.string().trim().max(40).optional(),
  esicNumber: z.string().trim().max(20).optional(),
});

export const employeeInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1).max(500),
  addressParts: addressPartsSchema.optional(),
  email: z.string().trim().email().max(200),
  /**
   * Intentionally lenient — a length check, not an E.164 regex. This schema
   * re-validates the whole record on every edit, and records written before
   * phones were structured hold arbitrary text. A strict rule here would make
   * those rows permanently un-editable. Strict per-country validation lives in
   * the form layer (see lib/domain/phone.ts), where it can be corrected.
   */
  phone: z.string().trim().min(1).max(30),
  role: z.string().trim().min(1).max(200),
  engagementType: z.enum(['intern', 'employee']),
  pronoun: z.enum(['he', 'she', 'they']),
  joiningDate: isoDate,
  endDate: isoDate.optional(),
  payAmountPaise: z.number().int().min(0).max(1e13),
  // Optional: interns have none, and so do records written before it existed.
  // The action derives `payAmountPaise` from it when present, so a payload
  // sending an inconsistent pair cannot produce an inconsistent record.
  annualSalaryPaise: z.number().int().min(0).max(1e13).optional(),
  payCurrency: z.enum(CURRENCY_CODES).default(DEFAULT_CURRENCY),
  bank: z.object({
    bankName: z.string().trim().max(120),
    accountNo: z.string().trim().max(40),
    /**
     * Optional (an employee record can be saved before bank details are known),
     * but if given it must be a real IFSC. Unlike `phone` above, a malformed
     * IFSC is never a legacy-formatting quirk — it is simply wrong, and it is
     * what a stipend gets paid against.
     */
    ifsc: z
      .string()
      .trim()
      .refine((v) => v === '' || IFSC_RE.test(v), { message: 'Expected an IFSC like KKBK0000677.' }),
    /** Filled from the IFSC lookup. Record-keeping only — no document prints it. */
    branch: z.string().trim().max(120).optional(),
    upiId: z.string().trim().max(60).optional(),
    upiQrDataUrl: z
      .string()
      .max(MAX_UPI_QR_BYTES)
      .refine((v) => v === '' || v.startsWith('data:image/'), {
        message: 'Expected an image data URL.',
      })
      .optional(),
  }),
  payroll: payrollIdsSchema.optional(),
});

export type EmployeeInput = z.infer<typeof employeeInputSchema>;

export function emptyEmployeeInput(todayIso: string): EmployeeInput {
  return {
    name: '', address: '', email: '', phone: '', role: '',
    engagementType: 'intern', pronoun: 'he',
    joiningDate: todayIso, payAmountPaise: 0,
    payCurrency: DEFAULT_CURRENCY,
    bank: { bankName: '', accountNo: '', ifsc: '', upiId: '' },
  };
}

const PRONOUNS: Record<PronounKey, { subject: string; object: string; possessive: string }> = {
  he: { subject: 'he', object: 'him', possessive: 'his' },
  she: { subject: 'she', object: 'her', possessive: 'her' },
  they: { subject: 'they', object: 'them', possessive: 'their' },
};
export function pronounSet(p: PronounKey) {
  return PRONOUNS[p];
}
