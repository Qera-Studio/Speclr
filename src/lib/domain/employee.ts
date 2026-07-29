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
import { CURRENCY_CODES, DEFAULT_CURRENCY, type CurrencyCode } from './currency';
import type { EngagementType, PronounKey } from './types';

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
  payAmountPaise: number;
  /** Record-keeping only — documents still print INR. See currency.ts. */
  payCurrency?: CurrencyCode;
  bank: {
    bankName: string;
    accountNo: string;
    ifsc: string;
    upiId?: string;
    /** Compressed data URL of the employee's receiving UPI QR. */
    upiQrDataUrl?: string;
  };
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
  payCurrency: z.enum(CURRENCY_CODES).default(DEFAULT_CURRENCY),
  bank: z.object({
    bankName: z.string().trim().max(120),
    accountNo: z.string().trim().max(40),
    ifsc: z.string().trim().max(20),
    upiId: z.string().trim().max(60).optional(),
    upiQrDataUrl: z
      .string()
      .max(MAX_UPI_QR_BYTES)
      .refine((v) => v === '' || v.startsWith('data:image/'), {
        message: 'Expected an image data URL.',
      })
      .optional(),
  }),
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
