import { gstTreatmentOf, gstTreatmentMismatch } from '../gstTreatment';

/**
 * The tax treatment of a domestic supply is a fact about the recipient, not a
 * setting on the document. These pin which cases are the record's to state and
 * which remain the operator's to choose.
 */

const registered = { gstin: '07AAHPQ6359H1ZA', addressParts: { state: 'Delhi', country: 'IN' } };
const unregistered = { addressParts: { state: 'Karnataka', country: 'IN' } };
const sez = { ...unregistered, tax: { sez: true } };
const foreign = { addressParts: { state: 'Greater London', country: 'GB' } };

describe('gstTreatmentOf', () => {
  it('charges 18% to a registered Indian client, at their registered state', () => {
    const t = gstTreatmentOf(registered);
    expect(t).toMatchObject({ applies: true, ratePercent: 18, placeOfSupplyCode: '07', locked: true });
    expect(t.label).toBeNull();
  });

  it('charges an unregistered Indian client too', () => {
    // GST is the supplier's liability under CGST s.9. Whether the recipient is
    // registered changes who can claim credit, not whether tax is charged.
    expect(gstTreatmentOf(unregistered)).toMatchObject({
      applies: true,
      ratePercent: 18,
      placeOfSupplyCode: '29',
      locked: true,
    });
  });

  it('zero-rates an SEZ unit and still locks it', () => {
    const t = gstTreatmentOf(sez);
    expect(t.applies).toBe(false);
    expect(t.ratePercent).toBe(0);
    // Zero-rated because the *record* says SEZ, so it is as derived as a taxed
    // supply is. Nothing here needs an operator's permission.
    expect(t.locked).toBe(true);
    expect(t.label).toMatch(/SEZ/);
  });

  it('zero-rates an export and leaves it unlocked', () => {
    const t = gstTreatmentOf(foreign);
    expect(t.applies).toBe(false);
    expect(t.placeOfSupplyCode).toBe('96');
    expect(t.label).toMatch(/Export of services under LUT/);
    // Nothing in Indian law fixes what a foreign invoice charges, and the
    // recipient's own regime may want something this cannot know about.
    expect(t.locked).toBe(false);
  });
});

describe('gstTreatmentMismatch', () => {
  it('names the disagreement when a domestic invoice drops the tax', () => {
    expect(gstTreatmentMismatch({ gstRatePercent: 0 }, registered)).toMatch(
      /charges 0% GST.*taxed at 18%/,
    );
  });

  it('names it when the rate has been changed', () => {
    expect(gstTreatmentMismatch({ gstRatePercent: 5 }, registered)).toMatch(
      /charges 5% GST.*taxed at 18%/,
    );
  });

  /**
   * **It explains the rate, not the place of supply.**
   *
   * The message used to interpolate `derived.reason`, which comes from
   * `placeOfSupplyOf` and says where the supply is: "the client is
   * unregistered, so this comes from the state on their address". Dropped into
   * a sentence about the *rate* it answered a question nobody asked, and left
   * the reader no way to tell which control to touch. The two facts are derived
   * together, which is how they came to be conflated.
   */
  it('explains the rate rather than the place of supply, and says where to fix it', () => {
    const message = gstTreatmentMismatch({ gstRatePercent: 0 }, registered)!;

    expect(message).toMatch(/9983/);
    expect(message).not.toMatch(/state on their address/i);
    expect(message).toMatch(/rate in the editing rail/i);
  });

  it('passes a domestic invoice that agrees', () => {
    expect(gstTreatmentMismatch({ gstRatePercent: 18 }, registered)).toBeNull();
  });

  it('passes a zero-rated SEZ invoice', () => {
    expect(gstTreatmentMismatch({ gstRatePercent: 0 }, sez)).toBeNull();
  });

  it('says nothing about an export, whatever it charges', () => {
    expect(gstTreatmentMismatch({ gstRatePercent: 0 }, foreign)).toBeNull();
    expect(gstTreatmentMismatch({ gstRatePercent: 18 }, foreign)).toBeNull();
  });
});
