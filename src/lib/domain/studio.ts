import { z } from 'zod';
import { addressPartsSchema, type AddressParts } from './address';
import { cinSchema, emailSchema, gstinSchema, ifscSchema, phoneSchema, upiSchema } from './fields';
import { codeSchema, multilineSchema, orgNameSchema, textSchema } from './text';

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
  brandMark: textSchema(80, { required: 'A brand mark is required.' }),
  legalName: orgNameSchema(200, { required: 'A legal name is required.' }),
  address: multilineSchema(500, { required: 'An address is required.' }),
  addressParts: addressPartsSchema.optional(),
  phone: phoneSchema({ required: 'A phone number is required.' }),
  email: emailSchema({ required: 'An email is required.' }),
  thanksLine: textSchema(200, { required: 'A thanks line is required.' }),
  /*
    Checked, at last, and by the same rules a *client's* are.

    These two were `z.string().min(1)`, presence and nothing else, while a
    client's GSTIN was held to its mod-36 check character and a client's CIN to
    the MCA ownership triple. That is backwards: this is the supplier's own
    registration, it is frozen onto every invoice by `studioSnapshot`, and CGST
    s.36 requires that copy to be retained unaltered for 72 months. A mistyped
    character here is wrong on every document issued until someone notices.
  */
  gstin: gstinSchema({ required: 'A GSTIN is required.' }),
  cin: cinSchema({ required: 'A CIN is required.' }),
  queryEmailHr: emailSchema({ required: 'An HR email is required.' }),
  stateCode: z.string().regex(/^\d{2}$/, { message: 'Expected a 2-digit GST state code.' }),
  bank: z.object({
    bankName: orgNameSchema(120, { required: 'A bank name is required.' }),
    accountNo: codeSchema(40, { required: 'An account number is required.' }),
    ifsc: ifscSchema({ required: 'An IFSC is required.' }),
    /** Filled from the IFSC lookup. Record-keeping only — no document prints it. */
    branch: textSchema(120).optional(),
    upiId: upiSchema(120, { required: 'A UPI ID is required.' }),
  }),
});
