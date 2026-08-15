/**
 * Indian tax and registration identifiers — GSTIN, PAN, TAN, CIN.
 *
 * These are not opaque strings. Each encodes structure that can be checked
 * without calling anybody, and two of them carry a real check digit, so a
 * transposed pair of characters is catchable rather than merely plausible.
 * That matters more here than it looks: a GSTIN's first two digits *are* the
 * place of supply, and a place of supply typed from memory is what produced a
 * wrong invoice once already.
 *
 * **We deliberately verify nothing over the network.** The reasoning is the
 * same one recorded for PAN in `employee.ts`: official access is restricted to
 * entity categories a design studio is not in, resellers want business KYC and
 * per-call billing, and none of them return anything the structure doesn't.
 *
 * Client-safe: pure functions, no framework imports, shared by the onboarding
 * form's resolver and the Server Action so the two can never disagree.
 */

import { GST_STATES, gstStateCodeByName } from '../gstStates';
import { entityTypeSpec } from '../entityType';

// ─── PAN ──────────────────────────────────────────────────────────────────────
// Lives here rather than in `employee.ts` because a client has one too, and it
// is a tax identifier before it is an employment one. `employee.ts` re-exports
// these so every existing import and test keeps working unchanged.

/** Five characters, four digits, one check letter — e.g. ABCDE1234F. */
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/**
 * A PAN's 4th character encodes what kind of holder it belongs to, and its 5th
 * is the first letter of the holder's surname (or of a company's name).
 */
export const PAN_HOLDER_TYPES: Record<string, string> = {
  P: 'an individual',
  C: 'a company',
  H: 'a Hindu Undivided Family',
  F: 'a firm or LLP',
  A: 'an association of persons',
  T: 'a trust',
  B: 'a body of individuals',
  L: 'a local authority',
  J: 'an artificial juridical person',
  G: 'a government body',
};

/**
 * Why this PAN cannot belong to a holder of the allowed kinds, or null if it
 * might. Assumes `PAN_RE` has already passed.
 *
 * Blocking, because both failures are unambiguous: a company's PAN on a person
 * is the wrong document entirely, and an unknown holder-type character is not a
 * PAN at all.
 *
 * `allowed` defaults to `['P']` so every existing employee call site keeps its
 * exact previous meaning. A client passes its own entity's kind instead — a
 * Private Limited's PAN is a `C`, and an individual's on that record is as
 * wrong as a company's on a person.
 */
export function panHolderTypeError(pan: string, allowed: readonly string[] = ['P']): string | null {
  const kind = pan.toUpperCase()[3];
  if (allowed.includes(kind)) return null;
  const held = PAN_HOLDER_TYPES[kind];
  if (!held) return 'This is not a recognisable PAN.';
  const wanted = allowed.map((k) => PAN_HOLDER_TYPES[k]).filter(Boolean);
  return wanted.length
    ? `This PAN belongs to ${held}, not ${wanted.join(' or ')}.`
    : `This PAN belongs to ${held}.`;
}

/**
 * True when the PAN's 5th character does not match the surname's initial.
 *
 * A *hint*, never a block. There are too many honest reasons for it to differ
 * from what is typed — a name recorded surname-first, a married name, a
 * single-word name, a transliteration. Worth pointing at; never worth refusing.
 */
export function panSurnameMismatch(pan: string, name: string): boolean {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const surname = words.at(-1);
  if (!surname || words.length < 2) return false;
  return pan.toUpperCase()[4] !== surname[0].toUpperCase();
}

/** The PAN holder-type character an entity of this type should have, if known. */
export function panKindOfEntityType(entityType: string | undefined): string | null {
  return entityTypeSpec(entityType)?.panKind ?? null;
}

// ─── GSTIN ────────────────────────────────────────────────────────────────────

/**
 * 15 characters: 2-digit state code, the holder's 10-character PAN, a 1-char
 * entity number (their nth registration in that state), a literal `Z`, and a
 * check character.
 *
 * The state code is checked for *membership* rather than a digit range — the
 * range 01–38 has holes (25 and 28 were merged away), so membership is both
 * stricter and the same amount of code.
 */
export const GSTIN_RE = /^\d{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const CHECKSUM_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * The GSTIN check character, computed the way the GSTN does it: a mod-36
 * weighted sum over the first 14 characters, weights alternating 1 and 2, each
 * product folded as `floor(p / 36) + p % 36`.
 *
 * This is the part a regex cannot do. A regex accepts `09AABCQ2864Q1ZQ` with
 * any two of its characters swapped; this does not.
 */
export function gstinCheckCharacter(first14: string): string | null {
  if (first14.length < 14) return null;
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const p = CHECKSUM_ALPHABET.indexOf(first14[i].toUpperCase());
    if (p < 0) return null;
    const product = p * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHECKSUM_ALPHABET[(36 - (sum % 36)) % 36];
}

/** The 2-digit state code a GSTIN begins with — the place of supply. */
export function gstinStateCode(gstin: string): string {
  return gstin.trim().slice(0, 2);
}

/** The PAN embedded at characters 3–12 of a GSTIN. */
export function gstinPan(gstin: string): string {
  return gstin.trim().toUpperCase().slice(2, 12);
}

export interface GstinContext {
  /** The state named on the client's address, so the two can be cross-checked. */
  addressState?: string;
  /** The PAN entered separately on the same record. */
  pan?: string;
}

/**
 * Why this GSTIN is wrong, or null if it holds up.
 *
 * Ordered cheapest-first, and each check is one the operator can act on. The
 * address cross-check is the one that matters most: it is the check that makes
 * deriving place of supply from the GSTIN trustworthy, which is the whole point
 * of deriving it at all.
 */
export function gstinError(gstin: string, context: GstinContext = {}): string | null {
  const value = gstin.trim().toUpperCase();
  if (!value) return null;

  if (!GSTIN_RE.test(value)) {
    return 'Expected a 15-character GSTIN like 09AABCQ2864Q1ZQ.';
  }

  const stateCode = gstinStateCode(value);
  const state = GST_STATES.find((s) => s.code === stateCode);
  if (!state) return `${stateCode} is not a GST state code.`;

  if (gstinCheckCharacter(value) !== value[14]) {
    return 'This GSTIN’s check character does not match — one of the other 14 is mistyped.';
  }

  const addressStateCode = gstStateCodeByName(context.addressState);
  if (addressStateCode && addressStateCode !== stateCode) {
    return `This GSTIN is registered in ${state.name}, but the address says ${context.addressState}.`;
  }

  const pan = context.pan?.trim().toUpperCase();
  if (pan && PAN_RE.test(pan) && gstinPan(value) !== pan) {
    return `This GSTIN contains PAN ${gstinPan(value)}, which is not the PAN on this record.`;
  }

  return null;
}

// ─── TAN ──────────────────────────────────────────────────────────────────────

/**
 * 10 characters: 4 letters (the first three a city code, the fourth the
 * deductor's initial), 5 digits, 1 letter. No published check digit.
 *
 * Only relevant for a client who deducts TDS — which is most of them, for
 * professional services under s.194J.
 */
export const TAN_RE = /^[A-Z]{4}[0-9]{5}[A-Z]$/;

export function tanError(tan: string): string | null {
  const value = tan.trim().toUpperCase();
  if (!value) return null;
  return TAN_RE.test(value) ? null : 'Expected a TAN like DELQ12345F.';
}

// ─── CIN ──────────────────────────────────────────────────────────────────────

/**
 * 21 characters: listing status (L listed / U unlisted), a 5-digit NIC industry
 * code, a 2-letter ROC state, the 4-digit year of incorporation, a 3-letter
 * ownership code, and a 6-digit registration number.
 */
export const CIN_RE = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

/** The ownership triples the MCA issues. */
export const CIN_OWNERSHIP_CODES: Record<string, string> = {
  PTC: 'a private limited company',
  PLC: 'a public limited company',
  OPC: 'a one person company',
  FTC: 'a subsidiary of a foreign company',
  GOI: 'a government of India company',
  SGC: 'a state government company',
  NPL: 'a not-for-profit company',
  ULL: 'an unlimited liability company',
  ULT: 'an unlimited liability public company',
  GAP: 'a general association public company',
  GAT: 'a general association private company',
  FLC: 'a financial lease company',
  SAP: 'a special association public company',
  NPT: 'a not-for-profit private company',
};

/**
 * Why this CIN is wrong, or null.
 *
 * Structure and the ownership triple are blocking, because both are closed
 * sets. **The ROC state pair deliberately is not** — see `cinStateHint`.
 */
export function cinError(cin: string): string | null {
  const value = cin.trim().toUpperCase();
  if (!value) return null;

  if (!CIN_RE.test(value)) {
    return 'Expected a 21-character CIN like U62099UP2026PTC254312.';
  }

  // U | 62099 | UW | 2026 | PTC | 254312  →  1, 5, 2, 4, 3, 6 characters.
  const ownership = value.slice(12, 15);
  if (!CIN_OWNERSHIP_CODES[ownership]) {
    return `${ownership} is not an MCA ownership code.`;
  }

  const year = Number(value.slice(8, 12));
  const thisYear = new Date().getFullYear();
  if (year < 1857 || year > thisYear) {
    return `${year} is not a plausible year of incorporation.`;
  }

  return null;
}

/**
 * A *hint* when the CIN's ROC state letters don't look like the address state,
 * never a block.
 *
 * Deliberately non-blocking, and this is not caution for its own sake: Qera's
 * own CIN is `U62099UW2026PTC254312`, whose `UW` is not a pair any published
 * ROC list explains, and a strict check would refuse the studio's own
 * registration. A company can also legitimately be incorporated in one state
 * and operate from another, at which point the CIN and the address disagree
 * forever and correctly.
 */
export function cinStateHint(cin: string, addressState: string | undefined): string | null {
  const value = cin.trim().toUpperCase();
  if (!CIN_RE.test(value) || !addressState) return null;
  const cinState = value.slice(6, 8);
  const addressStateCode = gstStateCodeByName(addressState);
  if (!addressStateCode) return null;
  const expected = ROC_STATE_LETTERS[addressStateCode];
  if (!expected || expected === cinState) return null;
  // One line, because it prints in a bar tucked under the field. The longer
  // version ("worth a second look if the company was incorporated in X") said
  // no more than this does: the address is on the screen directly above it.
  return `Registered with the ${cinState} registrar, not ${expected}.`;
}

/** ROC state letters, keyed by the GST state code so the two tables can meet. */
const ROC_STATE_LETTERS: Record<string, string> = {
  '01': 'JK', '02': 'HP', '03': 'PB', '04': 'CH', '05': 'UR', '06': 'HR',
  '07': 'DL', '08': 'RJ', '09': 'UP', '10': 'BR', '11': 'SK', '12': 'AR',
  '13': 'NL', '14': 'MN', '15': 'MZ', '16': 'TR', '17': 'ML', '18': 'AS',
  '19': 'WB', '20': 'JH', '21': 'OR', '22': 'CT', '23': 'MP', '24': 'GJ',
  '26': 'DD', '27': 'MH', '29': 'KA', '30': 'GA', '31': 'LD', '32': 'KL',
  '33': 'TN', '34': 'PY', '35': 'AN', '36': 'TG', '37': 'AP', '38': 'LA',
};
