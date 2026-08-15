/**
 * Where a supply is made — derived from the recipient, not typed by the operator.
 *
 * This closes `PRINCIPLES.md` rule 3's one live violation. `placeOfSupplyStateCode`
 * was a per-document picker the operator filled from memory, when the answer was
 * sitting on the client record the whole time: a registered client's GSTIN
 * *begins* with their state code, and an unregistered one's address names their
 * state. Two sources of truth for one fact is what produced a wrong invoice, and
 * a constrained picker only made a wrong answer look validated.
 *
 * **The override survives, and must.** CGST s.12(3) puts the place of supply
 * where immovable property is, regardless of who the recipient is, and bill-to/
 * ship-to cases diverge the same way. So rule 3's stated exception applies:
 * *derived by default, override explicit and recorded*. What is gone is the
 * blank field — an override now has to say why, and the reason is stored on the
 * document and frozen with it.
 *
 * Client-safe: pure, no framework imports, no database.
 */

import { gstStateCodeByName } from './gstStates';
import { gstinStateCode, GSTIN_RE } from './taxIds/india';

/** Place of supply for an export of services — the recipient is outside India. */
export const PLACE_OF_SUPPLY_EXPORT = '96';

export type PlaceOfSupplySource = 'gstin' | 'address' | 'export' | 'unknown';

export interface DerivedPlaceOfSupply {
  /** The 2-digit code, or null when nothing on the record establishes one. */
  code: string | null;
  source: PlaceOfSupplySource;
  /** One line explaining the derivation, shown beside the read-only field. */
  reason: string;
}

/** The subset of a client this derivation reads. */
export interface PlaceOfSupplyInput {
  gstin?: string;
  addressParts?: { state?: string; country?: string };
}

/**
 * Where a supply to this client is made.
 *
 * Ordered by authority, not convenience. A GSTIN is the recipient's own
 * declaration of where they are registered and outranks an address someone
 * typed; the address is the fallback for an unregistered client; and a
 * recipient outside India is an export, which has no Indian state at all.
 */
export function placeOfSupplyOf(client: PlaceOfSupplyInput): DerivedPlaceOfSupply {
  const country = client.addressParts?.country?.trim().toUpperCase() || 'IN';

  if (country !== 'IN') {
    return {
      code: PLACE_OF_SUPPLY_EXPORT,
      source: 'export',
      reason: 'The recipient is outside India, so this is an export of services.',
    };
  }

  const gstin = client.gstin?.trim().toUpperCase();
  if (gstin && GSTIN_RE.test(gstin)) {
    return {
      code: gstinStateCode(gstin),
      source: 'gstin',
      reason: 'Taken from the first two digits of the client’s GSTIN.',
    };
  }

  const fromAddress = gstStateCodeByName(client.addressParts?.state);
  if (fromAddress) {
    return {
      code: fromAddress,
      source: 'address',
      reason: 'The client is unregistered, so this comes from the state on their address.',
    };
  }

  return {
    code: null,
    source: 'unknown',
    reason: 'This client has neither a GSTIN nor a recognised state on their address.',
  };
}

/**
 * True when a supply to this place is intra-state — CGST + SGST rather than IGST.
 *
 * Deliberately explicit about the null case. `DocumentSheet` compares the codes
 * with a bare `===`, so a *missing* place of supply currently falls through to
 * the IGST branch rather than to an error. That is the wrong default to build
 * more on: an unknown place of supply is unknown, not inter-state.
 */
export function isIntraState(placeCode: string | null | undefined, studioStateCode: string): boolean {
  return Boolean(placeCode) && placeCode === studioStateCode;
}

/**
 * Whether GST applies to this client at all, and the line to print when it
 * doesn't.
 *
 * Both cases are zero-rated supplies under IGST Act s.16, made without payment
 * of tax under a Letter of Undertaking — not "no GST", which is a different
 * thing legally and on the invoice. `gstLabel` already exists on the document
 * for exactly this, so this is a default for that field and nothing more; no
 * sheet learns a new concept.
 */
export function zeroRatingLabel(client: {
  addressParts?: { country?: string };
  sez?: boolean;
}): string | null {
  const country = client.addressParts?.country?.trim().toUpperCase() || 'IN';
  if (country !== 'IN') {
    return 'Export of services under LUT — zero rated, IGST not charged (IGST Act s.16).';
  }
  if (client.sez) {
    return 'Supply to an SEZ unit under LUT — zero rated, IGST not charged (IGST Act s.16).';
  }
  return null;
}
