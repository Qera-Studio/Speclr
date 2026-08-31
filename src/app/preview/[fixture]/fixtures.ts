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
 * The Colorist quote, the one actually sent: two services, add-ons on the
 * first, five recurring rows covering all three shapes an amount can take
 * (a figure, a range, and '2% + GST', which is not money).
 *
 * Its density is the point. `e2e/quotation.spec.ts` measures this fixture,
 * and five deliverables against a blurb is what a real page carries.
 */
const quotation = (): QuotationDocument => ({
  id: "sq-1",
  type: "SQ",
  status: "finalized",
  number: "QS-SQ-2627-001",
  issueDate: "2026-08-30",
  lineItems: [],
  gstRatePercent: 0,
  salutation: "Miss",
  recipientName: "Mehak",
  companyName: "The Colorist",
  city: "Coimbatore",
  services: [
    {
      name: "Custom Website",
      blurb:
        "The website is designed as an experience to explore, built around your hand-drawn visual language, so every interaction feels human and yours, never templated or AI-generated. A dedicated booking flow connects directly to a secure token, removing the friction and no-show risk of your current manual process, while a self-editable content system means you are never dependent on a developer for future changes.",
      lines: [
        {
          description: "Infrastructure Set-up",
          detail:
            "Getting the technical foundation of your site ready and configured before any design or build work starts.",
          ratePaise: 2000000,
          qty: 1,
        },
        {
          description: "Web design",
          detail:
            "The full visual design of your website, built around your brand and mascot.",
          ratePaise: 1500000,
          qty: 1,
        },
        {
          description: "SEO/AEO/GEO",
          detail:
            "Structuring your site so it shows up when people search for you or your services online.",
          ratePaise: 1500000,
          qty: 1,
        },
        {
          description: "Data Privacy Enhancement (cookies)",
          detail:
            "Standard privacy/cookie notices so your site meets data protection requirements.",
          ratePaise: 500000,
          qty: 1,
        },
        {
          description: "Domain Services",
          detail:
            "Setting up and connecting your website address (yourdomain.com) to the site.",
          ratePaise: 500000,
          qty: 1,
        },
      ],
      addOns: [
        {
          description: "Content Management System (scalable)",
          detail:
            "A simple dashboard so you can update text, images, and blog posts yourself, no developer needed.",
          ratePaise: 2500000,
          qty: 1,
        },
        {
          description: "Custom booking section",
          detail:
            "A built-in booking calendar for clients to schedule in-person or virtual sessions.",
          ratePaise: 2000000,
          qty: 1,
        },
        {
          description: "Payment Portal Integration (Razorpay)",
          detail:
            "Secure online payments and deposit collection, working for both Indian and international clients.",
          ratePaise: 2000000,
          qty: 1,
        },
        {
          description: "Interactivity and motion",
          detail:
            "The signature animations, scroll effects, and touch interactions that make the site feel alive rather than static.",
          ratePaise: 3000000,
          qty: 1,
        },
        {
          description: "Motion design & prototype",
          detail:
            "Designing and testing how those animations and interactions actually move and feel before they are built.",
          ratePaise: 1500000,
          qty: 1,
        },
        {
          description: "WhatsApp Automation",
          detail:
            "Automatic booking confirmations, reminders, questionnaires, and follow-ups sent to clients on WhatsApp.",
          ratePaise: 5000000,
          qty: 1,
        },
        {
          description: "Business Email",
          detail:
            "Professional email addresses on your own domain (e.g. hello@yourname.com).",
          ratePaise: 500000,
          qty: 1,
        },
      ],
    },
    {
      name: "Social Media",
      blurb:
        "A month-by-month content operation: the strategy, the calendar, and the posts themselves, produced in the same visual language as the site so the two read as one brand.",
      lines: [
        {
          description: "Strategy & Content Planning",
          detail:
            "The quarterly plan: what gets posted, when, and why, agreed before anything is made.",
          ratePaise: 2140000,
          qty: 1,
        },
        {
          description: "Content Creation",
          detail:
            "Producing the posts, stories and reels against that plan.",
          ratePaise: 1535000,
          qty: 1,
        },
      ],
      addOns: [],
    },
  ],
  recurring: [
    {
      description: "Business Email (Google Workspace)",
      detail: "Monthly cost to keep your professional email running.",
      frequency: "Monthly",
      amountPaise: 20000,
    },
    {
      description: "Hosting",
      detail: "Monthly cost to keep your website live and running smoothly.",
      frequency: "Monthly",
      amountPaise: 287000,
    },
    {
      description: "WhatsApp BSP platform",
      detail: "Monthly cost for the tool that powers your WhatsApp automation.",
      frequency: "Monthly",
      amountPaise: 150000,
      amountMaxPaise: 500000,
    },
    {
      description: "Razorpay transaction fee",
      detail:
        "A small percentage taken by the payment provider on each transaction, not by us.",
      frequency: "Per transaction",
      amountNote: "2% + GST",
    },
    {
      description: "WhatsApp business-initiated messages",
      detail:
        "A small per-message cost only for messages we send (like reminders), not for messages clients send you.",
      frequency: "Per message",
      amountPaise: 15,
      amountMaxPaise: 20,
    },
  ],
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
  /** Two services, add-ons on the first, five recurring rows: the real thing. */
  quotation,
} as const;

export type FixtureName = keyof typeof FIXTURES;

export const isFixture = (name: string): name is FixtureName =>
  name in FIXTURES;
