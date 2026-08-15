/**
 * Indian GST state/UT codes — the 2-digit prefix of every GSTIN, used as the
 * "place of supply" on tax invoices. Same state as the studio → CGST + SGST;
 * different state → IGST.
 */

export interface GstState {
  code: string;
  name: string;
}

export const GST_STATES: GstState[] = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
];

/**
 * Two codes that are a *place of supply* but never a place of registration.
 *
 * `96` is where an export of services lands — the recipient is outside India, so
 * there is no Indian state to name — and `97` covers the offshore areas. Kept
 * out of `GST_STATES` deliberately: that list is what `/settings` offers as the
 * studio's own registered state, and Qera cannot be registered in Other Country.
 */
export const GST_NON_STATE_PLACES: GstState[] = [
  { code: '96', name: 'Other Country' },
  { code: '97', name: 'Other Territory' },
];

/** Everything a place of supply may legitimately be. */
export const GST_PLACES: GstState[] = [...GST_STATES, ...GST_NON_STATE_PLACES];

/**
 * Searches `GST_PLACES`, not `GST_STATES`: a sheet printing "Place of supply"
 * for an export invoice must say "Other Country", not fall through to nothing.
 */
export function gstStateName(code: string | undefined): string | null {
  if (!code) return null;
  return GST_PLACES.find((s) => s.code === code)?.name ?? null;
}

/**
 * The code for a state named in an address, or null.
 *
 * The reverse of `gstStateName`, and the reason it exists: an unregistered
 * client has no GSTIN to take a prefix from, so the only thing left to derive
 * their place of supply from is the state on their address. Matching is
 * case- and punctuation-insensitive because `AddressFields` fills the state
 * from the India Post pincode lookup, which spells "Jammu and Kashmir" where
 * this table says "Jammu & Kashmir".
 */
export function gstStateCodeByName(name: string | undefined): string | null {
  if (!name) return null;
  const key = normaliseStateName(name);
  if (!key) return null;
  return GST_STATES.find((s) => normaliseStateName(s.name) === key)?.code ?? null;
}

function normaliseStateName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z]+/g, '');
}
