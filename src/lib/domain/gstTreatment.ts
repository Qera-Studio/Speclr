/**
 * How a supply to this client is taxed: derived from the recipient, and for a
 * domestic one, not the operator's to choose.
 *
 * `placeOfSupply.ts` closed rule 3 for *where* a supply is made. This closes it
 * for the other two halves of the same answer, which were still three editable
 * controls in the rail: a switch that turned GST off, a free number for the
 * rate, and the state. For an Indian recipient none of those is a preference:
 *
 * - Qera is registered, so tax on a domestic supply is charged, not opted into
 *   (CGST s.9: the liability is the supplier's and does not depend on the
 *   invoice saying so).
 * - The rate follows the classification of the service, not the document. Every
 *   Service in the catalogue sits in the 9983 group, which is 18%.
 * - The state follows the recipient's registration, which is what
 *   `placeOfSupplyOf` already reads.
 *
 * Three fields that are each *legally* wrong to change, left changeable, is the
 * same shape of gap that produced the wrong invoice place of supply was derived
 * to fix: a validated wrong answer is still a wrong answer.
 *
 * **The override survives, for the same reason it survives there.** A supply can
 * be genuinely exempt or genuinely rated differently, and the honest way to say
 * so is a recorded reason rather than a blank field. Derived by default,
 * override explicit and recorded. `PRINCIPLES.md` rule 3's stated exception,
 * implemented the same way twice.
 *
 * Client-safe: pure, no framework imports, no database.
 */

import { placeOfSupplyOf, zeroRatingLabel, type PlaceOfSupplyInput } from './placeOfSupply';

/** The standard rate for the 9983 group every catalogue Service falls in. */
export const STANDARD_GST_RATE_PERCENT = 18;

export interface GstTreatment {
  /** Whether GST is charged on the document. */
  applies: boolean;
  /** The rate to charge. Zero whenever `applies` is false. */
  ratePercent: number;
  /** The place-of-supply code, or null when the record establishes none. */
  placeOfSupplyCode: string | null;
  /** The line to print in place of the tax rows when GST is not charged. */
  label: string | null;
  /**
   * Whether this treatment is the record's to state rather than the operator's
   * to choose. True for every Indian recipient, zero-rated or not.
   *
   * A supply to an SEZ unit is zero-rated *because the client record says the
   * client is an SEZ unit*, so it is as derived as a taxed one and needs no
   * unlock. An export is not locked, because nothing in Indian law fixes what a
   * foreign invoice must charge, and the client's own regime may want a line this
   * derivation cannot know about.
   */
  locked: boolean;
  /** One line naming where each part of the answer came from. */
  reason: string;
}

/** The subset of a client this derivation reads. */
export interface GstTreatmentInput extends PlaceOfSupplyInput {
  tax?: { sez?: boolean };
}

/**
 * How a supply to this client is taxed.
 *
 * Zero-rating is checked before the rate, because a zero-rated supply is not an
 * untaxed one: it is a taxable supply carrying a statutory label (IGST Act
 * s.16), and `zeroRatingLabel` is what states that on the document.
 */
export function gstTreatmentOf(client: GstTreatmentInput): GstTreatment {
  const place = placeOfSupplyOf(client);
  const domestic = place.source !== 'export';
  const zeroRated = zeroRatingLabel({
    addressParts: client.addressParts,
    sez: client.tax?.sez,
  });

  if (zeroRated) {
    return {
      applies: false,
      ratePercent: 0,
      placeOfSupplyCode: place.code,
      label: zeroRated,
      locked: domestic,
      reason: place.reason,
    };
  }

  return {
    applies: true,
    ratePercent: STANDARD_GST_RATE_PERCENT,
    placeOfSupplyCode: place.code,
    label: null,
    locked: true,
    reason: place.reason,
  };
}

/**
 * Whether a document's stored tax fields still agree with what the client says.
 *
 * Read by the finalize guard, so the enforcement is server-side and does not
 * depend on the rail having rendered anything read-only. Returns the
 * disagreement as a sentence, or null when there is none.
 *
 * Only a **locked** treatment is checked. An export is the operator's call, so
 * there is nothing here to disagree with.
 */
export function gstTreatmentMismatch(
  doc: { gstRatePercent: number },
  client: GstTreatmentInput,
): string | null {
  const derived = gstTreatmentOf(client);
  if (!derived.locked) return null;

  const expected = derived.applies ? derived.ratePercent : 0;
  if (doc.gstRatePercent === expected) return null;

  return `This client's supply is taxed at ${expected}% (${derived.reason}) and the document says ${doc.gstRatePercent}%.`;
}
