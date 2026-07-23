import 'server-only';

import { requireAuthorizedUser } from '@/lib/auth/session';

/**
 * Shared auth gate for Server Actions: a valid Clerk session AND an allowlisted
 * email. Returns true when authorized; false on any failure, so callers keep the
 * uniform `if (!(await authorized())) return { success:false, error:'Unauthorized.' }`
 * shape. Every action calls this first — the server-side authorization boundary.
 */
export async function authorized(): Promise<boolean> {
  try {
    await requireAuthorizedUser();
    return true;
  } catch {
    return false;
  }
}
