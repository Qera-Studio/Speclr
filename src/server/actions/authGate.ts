import 'server-only';

import { requireAuthorizedUser, type AuthorizedUser } from '@/lib/auth/session';

/**
 * Shared auth gate for Server Actions: a valid Clerk session AND an allowlisted
 * email. Every action calls this first — the server-side authorization boundary.
 *
 * Returns the authorized user, or `null` on any failure. `null` is falsy, so the
 * uniform `if (!(await authorized())) return { success:false, error:'Unauthorized.' }`
 * guard is unchanged at every call site; actions that need to *record who acted*
 * capture the return value instead of discarding it.
 */
export async function authorized(): Promise<AuthorizedUser | null> {
  try {
    return await requireAuthorizedUser();
  } catch {
    return null;
  }
}
