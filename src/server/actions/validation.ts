/**
 * Turning a Zod failure into something the UI can show.
 *
 * Lived in `documents.ts` until the client wizard needed it too: a seven-step
 * form that says only "Invalid input." makes the operator hunt for which of
 * forty fields the server disliked, which is exactly the diagnosability problem
 * this was written to fix in the first place.
 *
 * Not a Server Action file — no `'use server'`, because this is a plain
 * synchronous helper and that directive would forbid exporting one.
 */

import type { z } from 'zod';

/**
 * The first issue, as a sentence.
 *
 * Terse, and it leaks the field path but never a value: an error message is a
 * response to an unauthenticated-shaped request as far as the client knows, and
 * echoing back what was submitted is how a validation message becomes a
 * reflection vector.
 */
export function invalidInput(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Invalid input.';
  const path = issue.path.join('.');
  return path ? `Invalid input: ${path} — ${issue.message}` : `Invalid input: ${issue.message}`;
}
