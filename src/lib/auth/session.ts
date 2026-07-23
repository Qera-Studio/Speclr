import 'server-only';

import { auth, currentUser } from '@clerk/nextjs/server';
import { isEmailAllowed } from './allowlist';

/**
 * The server-side authorization boundary for speclr.
 *
 * A valid Clerk session is necessary but NOT sufficient — the signed-in email
 * must also be on the allowlist. Every Server Action and protected page calls
 * `requireAuthorizedUser()` (or the boolean `isAuthorized()`), never trusting a
 * layout or middleware alone (a layout is not a security boundary — Security
 * checklist, non-negotiable).
 */

export interface AuthorizedUser {
  userId: string;
  email: string;
}

/** Resolve the current user's primary email address, or null if none/signed-out. */
async function currentEmail(): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;
  const primaryId = user.primaryEmailAddressId;
  const primary = user.emailAddresses.find((e) => e.id === primaryId) ?? user.emailAddresses[0];
  return primary?.emailAddress ?? null;
}

/** Boolean gate: is there a signed-in, allowlisted user? Never throws. */
export async function isAuthorized(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;
  return isEmailAllowed(await currentEmail());
}

/**
 * Assert an authorized user and return their identity. Throws on failure —
 * callers in Server Actions should catch and return an unauthorized result;
 * pages should redirect to sign-in. Fails closed for signed-in-but-not-
 * allowlisted users (a real Clerk account that isn't permitted here).
 */
export async function requireAuthorizedUser(): Promise<AuthorizedUser> {
  const { userId } = await auth();
  if (!userId) throw new Error('UNAUTHENTICATED');
  const email = await currentEmail();
  if (!isEmailAllowed(email)) throw new Error('UNAUTHORIZED');
  return { userId, email: email! };
}
