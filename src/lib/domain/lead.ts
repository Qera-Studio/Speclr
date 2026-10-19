import { z } from 'zod';
import { emailSchema, phoneSchema } from './fields';
import { multilineSchema, orgNameSchema, personNameSchema } from './text';
import { serviceCodeSchema } from './service';

/**
 * A lead: somebody who might become a client, with only what a first
 * conversation yields. Deliberately not a client record. A client is onboarded
 * once and documents derive from it (CONTEXT.md §5d); a lead has no tax
 * identity, no address and no legal name, and asking for them here would be
 * the onboarding flow's weight on a contact that may never buy anything.
 */

/**
 * The pipeline, in order. A fixed list, so the groups always read the same.
 *
 * There is no "won": a lead whose contract is signed stops being a lead and
 * becomes a client (17 October 2026). "Lost" stays, because a conversation
 * that goes nowhere still needs somewhere to end that is not deletion.
 *
 * Today every stage is chosen by hand. The quotation and contract stages are
 * meant to become derived from the documents themselves (`ROADMAP.md` §12),
 * at which point they stop being editable here.
 */
export const LEAD_STAGES = [
  { key: 'new', label: 'New' },
  { key: 'reached_out', label: 'Reached out' },
  { key: 'discovery', label: 'Discovery session' },
  { key: 'quote_sent', label: 'Quotation sent' },
  { key: 'quote_approved', label: 'Quotation approved' },
  { key: 'contract_sent', label: 'Contract sent' },
  { key: 'lost', label: 'Lost' },
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number]['key'];

/**
 * Where a lead came from. A fixed list rather than free text for the reason
 * `industry.ts` gives: five spellings of "Instagram" is a field with no value.
 */
export const LEAD_SOURCES = ['Referral', 'Website', 'Instagram', 'LinkedIn', 'Outreach', 'Other'] as const;

export const leadInputSchema = z.object({
  name: personNameSchema(200, { required: 'A name is required.' }),
  company: orgNameSchema(200),
  email: emailSchema(),
  phone: phoneSchema(),
  source: z.union([z.literal(''), z.enum(LEAD_SOURCES)]),
  stage: z.enum(LEAD_STAGES.map((s) => s.key) as [LeadStage, ...LeadStage[]]),
  /** Which services they asked about, by code. */
  serviceCodes: z.array(serviceCodeSchema).max(30),
  notes: multilineSchema(2000),
});

export type LeadInput = z.infer<typeof leadInputSchema>;

export interface Lead extends LeadInput {
  id: string;
  /** ISO date the lead was added, local to the studio. */
  createdAt: string;
}

/** Everything but the two columns the list groups and sorts on. */
export type LeadDetails = Omit<LeadInput, 'name' | 'stage'>;
