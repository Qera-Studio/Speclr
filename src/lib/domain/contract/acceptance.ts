import { z } from 'zod';
import { isISODate } from '../dates';
import { personNameSchema, textSchema } from '../text';

/**
 * How a client accepted a contract (founder's decision, 19 October 2026).
 *
 * An issued contract is immutable, and acceptance happens after it is issued,
 * so acceptance is a record of its own beside the contract rather than a
 * change to it. The contract's execution statement names these three ways.
 */
export const ACCEPTANCE_METHODS = ['email', 'link', 'signature'] as const;
export type AcceptanceMethod = (typeof ACCEPTANCE_METHODS)[number];

export const ACCEPTANCE_METHOD_LABELS: Record<AcceptanceMethod, string> = {
  email: 'By email',
  link: 'Through the approval link',
  signature: 'Signed copy',
};

export const acceptanceInputSchema = z.object({
  acceptedOn: z.string().refine(isISODate, { message: 'Choose the date they accepted.' }),
  method: z.enum(ACCEPTANCE_METHODS),
  acceptedByName: personNameSchema(200, { required: 'Who accepted it?' }),
  acceptedByDesignation: textSchema(120).optional(),
  /** Where the evidence is: the email's date and sender, or the file name. */
  reference: textSchema(300).optional(),
});
export type AcceptanceInput = z.infer<typeof acceptanceInputSchema>;

export interface ContractAcceptance extends AcceptanceInput {
  documentId: string;
  recordedAt: number;
}

/**
 * Why an acceptance date cannot stand, or null. Not before the contract was
 * issued, since nothing existed to accept, and not in the future.
 */
export function acceptanceDateError(acceptedOn: string, issueDate: string, today: string): string | null {
  if (acceptedOn < issueDate) return 'A contract cannot be accepted before it was issued.';
  if (acceptedOn > today) return 'That date has not happened yet.';
  return null;
}
