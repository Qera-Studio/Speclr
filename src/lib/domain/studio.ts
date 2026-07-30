/**
 * The "from:" block, bank details, GST identity, and footer line printed on
 * every document. Single editable default — change here, changes everywhere.
 */
export const STUDIO_INFO = {
  brandMark: 'qera studio',
  legalName: 'Qera Private Limited',
  // Ends with the country so the "from:" block matches composed client
  // addresses, which now print a country name — these go to overseas clients.
  address: 'C-204,\nMGI Gharaunda, Raj Nagar Extension,\nGhaziabad - 201017\nIndia',
  phone: '+91 72001 24605',
  email: 'sales@qera.studio',
  thanksLine: 'Thank you for partnering with Qera Studio',
  gstin: '09AABCQ2864Q1ZQ',
  cin: 'U62099UW2026PTC254312',
  queryEmailHr: 'admin@qera.studio',
  /** 2-digit GST state code of the studio's registration (09 = Uttar Pradesh). */
  stateCode: '09',
  stateName: 'Uttar Pradesh',
  bank: {
    bankName: 'Kotak Mahindra Bank',
    accountNo: '4056067000',
    ifsc: 'KKBK0000677',
    upiId: 'qera.studio@kotak',
  },
};
