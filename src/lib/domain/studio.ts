import { z } from 'zod';
import { addressPartsSchema, type AddressParts } from './address';
import { IFSC_RE } from './bank';

/**
 * The "from:" block, bank details, GST identity, and footer line printed on
 * every document.
 *
 * `STUDIO_INFO` is the seed/default. The live values are editable at
 * `/settings` (stored in the `studio_settings` row), and — this is the part
 * that matters legally — **frozen onto each document at finalize**. A tax
 * invoice must be preserved unaltered for 72 months (CGST s.36) carrying the
 * supplier's address as at issue (Rule 46), so a sheet reads
 * `doc.studioSnapshot ?? STUDIO_INFO` and never the live row for an issued
 * document. Moving office must not rewrite invoices already filed.
 */
export interface StudioInfo {
  brandMark: string;
  legalName: string;
  /** Flat printable address — what documents render. Authoritative. */
  address: string;
  /** Structured parts, for editing; composed into `address` on save. */
  addressParts?: AddressParts;
  phone: string;
  email: string;
  thanksLine: string;
  gstin: string;
  cin: string;
  queryEmailHr: string;
  /** 2-digit GST state code of the studio's registration (09 = Uttar Pradesh). */
  stateCode: string;
  /** Derived from `stateCode` on save — never typed. */
  stateName: string;
  bank: {
    bankName: string;
    accountNo: string;
    ifsc: string;
    /** Filled from the IFSC lookup. Record-keeping only — no document prints it. */
    branch?: string;
    upiId: string;
  };
}

export const STUDIO_INFO: StudioInfo = {
  brandMark: 'qera studio',
  legalName: 'Qera Private Limited',
  /**
   * Ends with 'State, Country' so the "from:" block matches composed client and
   * employee addresses (see `composeAddress`).
   *
   * The state is stated, not left implied by the GSTIN prefix: Rule 46 wants the
   * supplier's address on a tax invoice, and the state is the part that
   * establishes place of supply. Kept in step with `stateName` below.
   */
  address:
    'C-204,\nMGI Gharaunda, Raj Nagar Extension,\nGhaziabad - 201017\nUttar Pradesh, India',
  phone: '+91 72001 24605',
  email: 'sales@qera.studio',
  thanksLine: 'Thank you for partnering with Qera Studio',
  gstin: '09AABCQ2864Q1ZQ',
  cin: 'U62099UW2026PTC254312',
  queryEmailHr: 'admin@qera.studio',
  stateCode: '09',
  stateName: 'Uttar Pradesh',
  bank: {
    bankName: 'Kotak Mahindra Bank',
    accountNo: '4056067000',
    ifsc: 'KKBK0000677',
    upiId: 'qera.studio@kotak',
  },
};

/**
 * The studio details a document should print: its own frozen snapshot if it has
 * one, else the constant.
 *
 * Every sheet goes through this. A finalized document always carries a snapshot,
 * so it reprints identically for ever; a draft carries whichever live settings
 * its editor passed in. The `STUDIO_INFO` tail catches documents issued before
 * snapshots existed — deliberately the same constant those documents were
 * printed with, so nothing about them changes.
 *
 * Deliberately typed on the one field it reads rather than on `AdminDocument`:
 * `types.ts` imports this module, so depending on it here would be circular.
 */
export function studioOf(doc: { studioSnapshot?: StudioInfo }): StudioInfo {
  return doc.studioSnapshot ?? STUDIO_INFO;
}

/**
 * Validates what the settings form submits.
 *
 * Every field is required — this is the identity block on a tax invoice, and a
 * blank GSTIN or legal name would silently produce an invalid document. The
 * lengths are generous; the point is presence and shape, not style.
 *
 * `stateName` is absent on purpose: the server derives it from `stateCode` so
 * the two can never disagree.
 */
export const studioInputSchema = z.object({
  brandMark: z.string().trim().min(1).max(80),
  legalName: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1).max(500),
  addressParts: addressPartsSchema.optional(),
  phone: z.string().trim().min(1).max(30),
  email: z.string().trim().email().max(200),
  thanksLine: z.string().trim().min(1).max(200),
  gstin: z.string().trim().min(1).max(20),
  cin: z.string().trim().min(1).max(30),
  queryEmailHr: z.string().trim().email().max(200),
  stateCode: z.string().regex(/^\d{2}$/, { message: 'Expected a 2-digit GST state code.' }),
  bank: z.object({
    bankName: z.string().trim().min(1).max(120),
    accountNo: z.string().trim().min(1).max(40),
    ifsc: z.string().trim().regex(IFSC_RE, { message: 'Expected an IFSC like KKBK0000677.' }),
    /** Filled from the IFSC lookup. Record-keeping only — no document prints it. */
    branch: z.string().trim().max(120).optional(),
    upiId: z.string().trim().min(1).max(120),
  }),
});
