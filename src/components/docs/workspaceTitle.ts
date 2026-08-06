/**
 * The workspace bar / edit rail heading.
 *
 * The route can only supply a generic title ("New invoice") because it renders
 * before a client or employee is chosen. Once one is, the editor recomputes the
 * heading from live form state so it reads "Clayora’s invoice" the moment the
 * picker is used — no save required.
 *
 * Uses the short reference `name`, not the printed company name: this is a
 * screen label, and the short name is what you think in.
 */

/** "Clayora" → "Clayora’s"; a name already ending in s takes the bare mark. */
export function possessive(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  return /s$/i.test(trimmed) ? `${trimmed}’` : `${trimmed}’s`;
}

export function workspaceTitle(
  fallback: string,
  label: string,
  partyName?: string | null,
): string {
  const owner = possessive(partyName ?? '');
  return owner ? `${owner} ${label.toLowerCase()}` : fallback;
}
