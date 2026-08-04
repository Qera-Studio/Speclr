/**
 * Indian bank identifiers.
 *
 * Scope is deliberately India-only: the studio and everyone it pays are Indian,
 * and an IFSC is an RBI construct with no overseas equivalent. If that ever
 * changes, the fields stay free-text strings — only this validation would need
 * relaxing per country.
 *
 * Client-safe: shared by the forms and the Server Actions.
 */

/**
 * RBI IFSC: 4 letters (the bank code), a reserved `0`, then 6 alphanumerics
 * (the branch code). Always uppercase — the forms normalise as you type, so a
 * lowercase value never reaches the schema.
 */
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Length of a well-formed IFSC — the input's `maxLength`. */
export const IFSC_LENGTH = 11;

export function isIfsc(value: string): boolean {
  return IFSC_RE.test(value.trim());
}

/**
 * What an IFSC field should hold after a keystroke: alphanumerics only,
 * uppercased, never longer than an IFSC.
 *
 * Done on change rather than with CSS `text-transform`, which would only *look*
 * uppercase while storing whatever was typed — an account credited from a
 * lowercase IFSC is a real-world failure, not a display bug.
 */
export function normalizeIfscInput(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, IFSC_LENGTH);
}
