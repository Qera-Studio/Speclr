import { contractDoc } from "@/lib/domain/contract/__tests__/fixture";
import { STUDIO_INFO } from "@/lib/domain/studio";
import type {
  AdminDocument,
  LineItem,
  QuotationDocument,
  SlipDocument,
} from "@/lib/domain/types";

/**
 * The documents the browser tests render.
 *
 * Fixed data, not whatever happens to be in Neon: a pagination assertion is
 * only meaningful against a document whose length is known, and a suite that
 * reads live records fails the day somebody edits one. The contract reuses the
 * fixture the Jest tests already build, so paper and jsdom argue about the same
 * document.
 */

const line = (description: string, ratePaise: number): LineItem => ({
  description,
  ratePaise,
  qty: 1,
});

/**
 * A pay slip at the density the sheet was drawn for: 6 earnings against 5
 * deductions, side by side. `SlipSheet`'s own comment names this as the limit,
 * so it is the case that must fit.
 */
const paySlip = (earnings: number, deductions: number): SlipDocument =>
  ({
    id: "pay-1",
    type: "PAY",
    status: "finalized",
    number: "QS-PAY-2627-001",
    issueDate: "2026-06-30",
    gstRatePercent: 0,
    lineItems: [
      line("Basic", 4000000),
      line("House rent allowance", 1600000),
      line("Conveyance allowance", 160000),
      line("Special allowance", 400000),
      line("Medical allowance", 125000),
      line("Performance incentive", 500000),
      line("Leave travel allowance", 200000),
      line("Shift allowance", 100000),
      line("Meal allowance", 100000),
      line("Internet reimbursement", 150000),
      line("Books and training", 100000),
      line("Statutory bonus", 175000),
    ].slice(0, earnings),
    deductions: [
      line("TDS under section 192", 250000),
      line("Professional tax", 20000),
      line("Salary advance recovery", 500000),
      line("Loss of pay", 133300),
      line("Group medical premium", 65000),
      line("Canteen", 24000),
      line("Parking", 15000),
    ].slice(0, deductions),
    employeeId: "emp-1",
    employeeSnapshot: {
      name: "Ananya Rao",
      address: "Sector 12, Ghaziabad, Uttar Pradesh - 201017",
      email: "ananya@example.com",
      phone: "+919000000000",
      role: "Senior Designer",
      engagementType: "employee",
      pronoun: "she",
      joiningDate: "2025-04-01",
      bank: {
        bankName: "HDFC Bank",
        accountNo: "1234567890",
        ifsc: "HDFC0001234",
      },
      payroll: {
        employeeCode: "QS-EMP-004",
        pan: "ABCPR1234F",
        uan: "101234567890",
      },
    },
    stipendMonth: "2026-06",
    stipendPeriodStart: "2026-06-01",
    stipendPeriodEnd: "2026-06-30",
    daysInPeriod: 30,
    daysPaid: 30,
    paymentMethod: "Bank Transfer",
    deductionsNote: "",
  }) as unknown as SlipDocument;

const invoice = (): AdminDocument =>
  ({
    id: "inv-1",
    type: "INV",
    status: "finalized",
    number: "QS-INV-2627-001",
    issueDate: "2026-06-10",
    dueDate: "2026-06-25",
    clientId: "client-1",
    clientSnapshot: {
      name: "Clayora",
      companyName: "Clayora Private Limited",
      address: "Sector 62, Noida, Uttar Pradesh - 201301",
      email: "hello@clayora.example",
      phone: "+919876500000",
      gstin: "09AAACC1206D1ZP",
    },
    lineItems: [
      {
        description: "Brand identity system",
        ratePaise: 18000000,
        qty: 1,
        sacCode: "998391",
      },
      {
        description: "Shopify storefront build",
        ratePaise: 24000000,
        qty: 1,
        sacCode: "998314",
      },
      {
        description: "Photography direction",
        ratePaise: 6000000,
        qty: 1,
        sacCode: "998386",
      },
    ],
    gstRatePercent: 18,
    placeOfSupplyStateCode: "09",
    // A discount, because it adds a row to a band that does not stretch, and
    // the domestic case is the taller of the two: it carries CGST and SGST
    // where the export carries neither.
    discountPercent: 10,
  }) as unknown as AdminDocument;

/**
 * The same invoice to a recipient outside India, which is the case that grew.
 *
 * The wire block prints six rows where the domestic one prints four, one of
 * them a multi-line bank address, and the PAYMENT section sits in the fixed A4
 * frame's bottom band. That is a measurement, so it belongs here and not in
 * jsdom, which renders every box as zero.
 */
const invoiceExport = (): AdminDocument =>
  ({
    ...invoice(),
    id: "inv-2",
    number: "QS-INV-2627-002",
    clientSnapshot: {
      name: "Northwind",
      companyName: "Northwind Trading Ltd",
      address: "14 Ludgate Hill, London EC4M 7AA, United Kingdom",
      email: "accounts@northwind.example",
      phone: "+442079460000",
      taxIdType: "GB_VAT",
      taxId: "GB123456789",
      registrationNumber: "09876543",
    },
    gstRatePercent: 0,
    gstLabel: "Export of services under LUT, IGST not charged.",
    placeOfSupplyStateCode: "96",
    studioSnapshot: {
      ...STUDIO_INFO,
      bank: {
        ...STUDIO_INFO.bank,
        accountName: "Qera Private Limited",
        swift: "KKBKINBBCPC",
        iban: "GB29NWBK60161331926819",
        bankAddress:
          "Kotak Mahindra Bank, Ground Floor,\nRaj Nagar Extension, Ghaziabad 201017, India",
      },
    },
  }) as unknown as AdminDocument;

/**
 * A realistic multi-section quotation: two "Pricing" tables, a recurring line
 * per section, and a milestone schedule — the case `e2e/quotation.spec.ts`
 * checks doesn't clip inside the dark A4 frame.
 */
const quotation = (): QuotationDocument => ({
  id: "qtn-1",
  type: "QTN",
  status: "finalized",
  number: "QS-QTN-2627-001",
  issueDate: "2026-08-27",
  lineItems: [
    { description: "Infrastructure set-up", ratePaise: 3000000, qty: 2, section: "Website(s)" },
    { description: "Web design", ratePaise: 3000000, qty: 2, section: "Website(s)" },
    { description: "SEO/AEO/GEO", ratePaise: 750000, qty: 2, section: "Website(s)" },
    { description: "Content Management System (scalable)", ratePaise: 2250000, qty: 1, section: "Website(s)" },
    { description: "Business Email", ratePaise: 500000, qty: 1, section: "Website(s)" },
    { description: "Data Privacy Enhancement", ratePaise: 450000, qty: 1, section: "Website(s)" },
    { description: "Domain Services", ratePaise: 500000, qty: 2, section: "Website(s)" },
    { description: "Business Email (Google Workspace)", ratePaise: 69000, qty: 1, section: "Website(s)", recurring: true },
    { description: "Hosting", ratePaise: 287000, qty: 1, section: "Website(s)", recurring: true },
    { description: "Strategy & Content Planning", ratePaise: 2140000, qty: 1, section: "Social Media" },
    { description: "Content Creation", ratePaise: 1535000, qty: 1, section: "Social Media" },
    { description: "Media Management", ratePaise: 420000, qty: 1, section: "Social Media", recurring: true },
  ],
  gstRatePercent: 0,
  recipientName: "Clayora Private Limited",
  attentionName: "Priya Shah",
  offerLine:
    "We are pleased to submit our offer for the above mentioned project.",
  subjectLine:
    "This document contains a list of services and respective quotation estimates for web design, development and social media management.",
  validUntil: "2026-09-27",
  gstCountry: "IN",
  milestones: [
    { label: "Advance on signing", percent: 40 },
    { label: "On design approval", percent: 30 },
    { label: "On delivery", percent: 30 },
  ],
  termsNote:
    "Validity of this quotation is 30 days from the date above.\nPrices exclude third-party costs (hosting, domains, licenses) unless stated.\nAll amounts are in Indian Rupees (INR).",
  studioSnapshot: STUDIO_INFO,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

/**
 * Every fixture the preview route serves, and the only ones it will serve: the
 * segment is looked up here rather than parsed, so there is nothing to traverse.
 */
export const FIXTURES = {
  /** The density the pay slip is drawn for. Must fit on one page. */
  "pay-slip": () => paySlip(6, 5),
  /** Past it. The clipping this document type already shipped once. */
  "pay-slip-crowded": () => paySlip(12, 7),
  /** Twenty-odd pages of prose in two columns: the pagination case. */
  contract: () => contractDoc({ codes: ["01", "05"] }) as AdminDocument,
  invoice,
  /** The wire-transfer block, which is two rows taller than the domestic one. */
  "invoice-export": invoiceExport,
  /** Two sections, two recurring lines, a milestone schedule — realistic density. */
  quotation,
} as const;

export type FixtureName = keyof typeof FIXTURES;

export const isFixture = (name: string): name is FixtureName =>
  name in FIXTURES;
