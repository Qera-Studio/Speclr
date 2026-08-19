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
  /**
   * The MCA ownership triple this entity's CIN must carry (characters 13–15),
   * and implicitly whether it has a CIN at all. Absent for the forms the MCA
   * does not register: an LLP holds an LLPIN in a different format entirely, a
   * proprietorship or a trust holds nothing.
   */
  cinOwnership?: string;
  jurisdiction: EntityJurisdiction;
  /**
   * This form *is* a person rather than an organisation.
   *
   * The second axis onboarding branches on, and it lives here because it is
   * already implied by the legal form: an Individual and a Sole Proprietorship
   * are one human being with a PAN of kind `P` and no registrar, and everything
   * else in this table is an entity somebody incorporated. A `client_kind`
   * column would be a second place for a record to say what it is, and a second
   * place for it to disagree (`PRINCIPLES.md` rule 3, the same reason there is
   * no `country` column).
   *
   * A proprietorship is on this side deliberately. It has no separate legal
   * personality: the proprietor is the taxpayer, the PAN is theirs, and there
   * is no certificate of incorporation to ask for. What it has that a plain
   * individual does not is a trading name, which is a field, not a category.
   */
  naturalPerson?: true;
  /**
   * This person trades under a business name that is not their own.
   *
   * The one thing a proprietorship or a sole trader has that a plain individual
   * does not, and it is a field rather than a category: the proprietor is still
   * the taxpayer, but "Studio Kalpa" is what the invoice is addressed to.
   */
  tradingName?: true;
}

/** Which of the two onboarding flows a client goes through. */
export type ClientKind = 'individual' | 'company';

/**
 * Indian forms first and in rough order of how often a design studio bills
 * them, because the dropdown lists them in this order and the first row should
 * be the answer most of the time.
 */
export const ENTITY_TYPES: readonly EntityTypeSpec[] = [
  // ── India ──
  { value: 'pvt_ltd', label: 'Private Limited Company', panKind: 'C', cinOwnership: 'PTC', jurisdiction: 'in' },
  { value: 'llp', label: 'Limited Liability Partnership', panKind: 'F', jurisdiction: 'in' },
  { value: 'proprietorship', label: 'Sole Proprietorship', panKind: 'P', jurisdiction: 'in', naturalPerson: true, tradingName: true },
  { value: 'partnership', label: 'Partnership Firm', panKind: 'F', jurisdiction: 'in' },
  { value: 'public_ltd', label: 'Public Limited Company', panKind: 'C', cinOwnership: 'PLC', jurisdiction: 'in' },
  { value: 'opc', label: 'One Person Company', panKind: 'C', cinOwnership: 'OPC', jurisdiction: 'in' },
  { value: 'individual', label: 'Individual', panKind: 'P', jurisdiction: 'in', naturalPerson: true },
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
  { value: 'sole_trader', label: 'Sole Trader', jurisdiction: 'foreign', naturalPerson: true, tradingName: true },
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
 * The entity type an MCA ownership triple names, if it names exactly one.
 *
 * `cinOwnership` read backwards. It resolves for `PTC`, `PLC` and `OPC` and for
 * nothing else — the other eleven triples the MCA issues (`FTC`, `GOI`, `NPL`
 * …) are real codes with no row here, and returning null for them is the
 * correct answer rather than a gap: a CIN this app cannot place must not be
 * used to overwrite an entity type a person chose.
 *
 * This is the direction that makes the CIN authoritative. The forward direction
 * only ever says "these two disagree"; this one says which of the two the
 * document itself supports.
 */
export function entityTypeForCinOwnership(ownership: string | undefined): EntityTypeSpec | null {
  if (!ownership) return null;
  return ENTITY_TYPES.find((e) => e.cinOwnership === ownership) ?? null;
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

/**
 * Whether this client is a person rather than an organisation.
 *
 * Derived, never stored. An entity type nobody has chosen yet reads as a
 * company, which is what an unfinished record means here and what every client
 * written before this existed is.
 */
export function isNaturalPerson(entityType: string | undefined): boolean {
  return entityTypeSpec(entityType)?.naturalPerson === true;
}

/** Which flow an entity type puts a client in. */
export function clientKindOf(entityType: string | undefined): ClientKind {
  return isNaturalPerson(entityType) ? 'individual' : 'company';
}

/**
 * The forms offered, on both axes at once.
 *
 * The two compose here rather than at each call site, so a form can never be
 * offered on one axis and rejected on the other — which is what
 * `IdentityStep`'s resolver checks the submitted value against.
 */
export function entityTypesForClient(iso2: string | undefined, kind: ClientKind): EntityTypeSpec[] {
  const wanted = kind === 'individual';
  return entityTypesForCountry(iso2).filter((e) => (e.naturalPerson === true) === wanted);
}
