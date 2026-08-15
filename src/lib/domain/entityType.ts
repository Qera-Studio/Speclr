/**
 * What kind of legal entity a client is.
 *
 * A fact about *who someone is*, so it lives on the party record rather than on
 * whichever document happened to need it (`PRINCIPLES.md` rule 2). It earns a
 * real column for the same reason, and because it is the one identity field
 * that validates another: an Indian entity's PAN encodes its own kind in the
 * 4th character, so knowing the entity type turns a shape check into a real
 * one. See `panKindOfEntityType` in `taxIds/india.ts`.
 *
 * Client-safe: no framework imports, shared by the form and the Server Action.
 */

export type EntityJurisdiction = 'in' | 'foreign';

export interface EntityTypeSpec {
  value: string;
  /**
   * What the dropdown row says — spelled out in full, never as an acronym. It
   * is the only place the form is named, and "HUF" is only obvious to someone
   * who already knows.
   */
  label: string;
  /**
   * The 4th character of this entity's PAN. Absent where there is no Indian
   * PAN to check against, which is every foreign form until one registers here.
   */
  panKind?: string;
  jurisdiction: EntityJurisdiction;
}

/**
 * Indian forms first and in rough order of how often a design studio bills
 * them, because the dropdown lists them in this order and the first row should
 * be the answer most of the time.
 */
export const ENTITY_TYPES: readonly EntityTypeSpec[] = [
  // ── India ──
  { value: 'pvt_ltd', label: 'Private Limited Company', panKind: 'C', jurisdiction: 'in' },
  { value: 'llp', label: 'Limited Liability Partnership', panKind: 'F', jurisdiction: 'in' },
  { value: 'proprietorship', label: 'Sole Proprietorship', panKind: 'P', jurisdiction: 'in' },
  { value: 'partnership', label: 'Partnership Firm', panKind: 'F', jurisdiction: 'in' },
  { value: 'public_ltd', label: 'Public Limited Company', panKind: 'C', jurisdiction: 'in' },
  { value: 'opc', label: 'One Person Company', panKind: 'C', jurisdiction: 'in' },
  { value: 'individual', label: 'Individual', panKind: 'P', jurisdiction: 'in' },
  { value: 'huf', label: 'Hindu Undivided Family', panKind: 'H', jurisdiction: 'in' },
  { value: 'trust', label: 'Trust', panKind: 'T', jurisdiction: 'in' },
  { value: 'society', label: 'Registered Society', panKind: 'A', jurisdiction: 'in' },
  { value: 'aop', label: 'Association of Persons', panKind: 'A', jurisdiction: 'in' },
  { value: 'boi', label: 'Body of Individuals', panKind: 'B', jurisdiction: 'in' },
  { value: 'govt', label: 'Government Body', panKind: 'G', jurisdiction: 'in' },
  { value: 'local_authority', label: 'Local Authority', panKind: 'L', jurisdiction: 'in' },

  // ── Outside India ──
  // The country belongs in the label out here: with the acronyms gone, half of
  // these read as the same words and only the jurisdiction separates them.
  { value: 'corporation', label: 'Corporation (United States)', jurisdiction: 'foreign' },
  { value: 'llc', label: 'Limited Liability Company', jurisdiction: 'foreign' },
  { value: 'ltd_plc', label: 'Limited Company (United Kingdom)', jurisdiction: 'foreign' },
  { value: 'gmbh', label: 'Limited Company (Europe)', jurisdiction: 'foreign' },
  { value: 'pte_ltd', label: 'Private Limited Company (Singapore)', jurisdiction: 'foreign' },
  { value: 'free_zone', label: 'Free Zone Entity', jurisdiction: 'foreign' },
  { value: 'sole_trader', label: 'Sole Trader', jurisdiction: 'foreign' },
  { value: 'foreign_other', label: 'Other', jurisdiction: 'foreign' },
] as const;

export const ENTITY_TYPE_VALUES = ENTITY_TYPES.map((e) => e.value);

export function entityTypeSpec(value: string | undefined): EntityTypeSpec | null {
  if (!value) return null;
  return ENTITY_TYPES.find((e) => e.value === value) ?? null;
}

export function entityTypeLabel(value: string | undefined): string | null {
  return entityTypeSpec(value)?.label ?? null;
}

/**
 * The forms offered for a country.
 *
 * Driven by the address rather than a separate country field, because
 * `addressParts.country` already holds the answer and two places to say where a
 * client is means two places for them to disagree (`PRINCIPLES.md` rule 3).
 */
export function entityTypesForCountry(iso2: string | undefined): EntityTypeSpec[] {
  const jurisdiction: EntityJurisdiction = !iso2 || iso2.toUpperCase() === 'IN' ? 'in' : 'foreign';
  return ENTITY_TYPES.filter((e) => e.jurisdiction === jurisdiction);
}
