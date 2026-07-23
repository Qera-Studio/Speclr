import 'server-only';

/**
 * The email allowlist — the gate on *who* may use speclr.
 *
 * speclr is an internal tool for the founder + a few trusted people, all with
 * full access (no roles). Authentication (Clerk) proves *who* you are; this
 * allowlist decides whether that identity is permitted at all. A valid Clerk
 * session for an email NOT on this list is treated as unauthorized.
 *
 * Configured via SPECLR_ALLOWED_EMAILS (comma-separated, case-insensitive).
 * Kept out of code so people can be added/removed without a deploy. If the var
 * is unset the allowlist is empty and nobody is admitted — fail closed, never
 * open. This is a Security-checklist floor item: authorization is enforced
 * server-side, never assumed from a valid session alone.
 */

function parseAllowlist(): Set<string> {
  const raw = process.env.SPECLR_ALLOWED_EMAILS ?? '';
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0),
  );
}

/** True if the given email is explicitly allowed. Empty allowlist → false (fail closed). */
export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAllowlist().has(email.trim().toLowerCase());
}
