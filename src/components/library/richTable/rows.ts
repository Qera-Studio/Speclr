import { addMonths, todayISO } from '@/lib/domain/dates';
import type { CurrencyCode } from '@/lib/domain/currency';

/**
 * The rows the rich client table is drawn over.
 *
 * **None of this is anybody's data.** It is the 16 fields chosen for the table,
 * shaped flat so each cell reads one property, and filled to exercise every
 * case a real list will hit: an individual beside companies, clients in four
 * countries, a legal name longer than any column, and one with almost nothing
 * filled in.
 *
 * Flat rather than a `ClientRecord` on purpose. This is a design specimen; the
 * temporary page at `/client/clients-rich` reads real clients into it through
 * `fromClient.ts`, and the cells do not change.
 */
export interface RichClientRow {
  id: string;
  /** #1. The short name the list is scanned by. */
  name: string;
  /** #2. What documents print. Absent for a person trading under their name. */
  legalName?: string;
  /** #48 is derived from this, through `isNaturalPerson`. */
  entityType: string;
  /** #4. A key from `domain/industry.ts`. */
  industry?: string;
  /** #7. */
  city?: string;
  /** #7, #49. ISO 3166-1 alpha-2; blank reads as India, as everywhere. */
  country: string;
  /** #5, #6. The company's own. */
  email?: string;
  phone?: string;
  /** #26. Absent for an individual: they are their own contact. */
  contactName?: string;
  /** #52. Integer paise, INR, as every figure here is stored. */
  valuePaise?: number;
  /** Whether #52 recurs. A retainer is monthly; a project is one figure. */
  monthly?: boolean;
  /** #29. The currency the client is shown in when it is not INR. */
  currency: CurrencyCode;
  /** #10. ISO date. */
  addedAt: string;
  /** #44, #45. Names, as the clients list resolves them from employee ids. */
  lead?: string;
  team: string[];
  /** Where the row opens. Absent on the sample rows, which open nothing. */
  href?: string;
}

const today = todayISO();
const monthsAgo = (n: number) => addMonths(today, -n);

/** Twelve rows, so the pager has a second page to be. */
export const RICH_CLIENT_ROWS: RichClientRow[] = [
  {
    id: 'c1',
    name: 'Clayora',
    legalName: 'Clayora Private Limited',
    entityType: 'pvt_ltd',
    industry: 'ceramics',
    city: 'Pune',
    country: 'IN',
    email: 'accounts@clayora.in',
    phone: '+919820012345',
    contactName: 'Ravi Mehta',
    valuePaise: 1_84_000_00,
    monthly: true,
    currency: 'INR',
    addedAt: monthsAgo(11),
    lead: 'Shivanshu Pareek',
    team: ['Shivanshu Pareek', 'Neha Arora', 'Kabir Shah'],
  },
  {
    id: 'c2',
    name: 'Northwind Analytics',
    legalName: 'Northwind Analytics Ltd',
    entityType: 'ltd_plc',
    industry: 'saas',
    city: 'London',
    country: 'GB',
    email: 'finance@northwind.co.uk',
    phone: '+442071234567',
    contactName: 'Eleanor Price',
    valuePaise: 4_10_000_00,
    monthly: true,
    currency: 'GBP',
    addedAt: monthsAgo(7),
    lead: 'Neha Arora',
    team: ['Neha Arora', 'Kabir Shah'],
  },
  {
    // An individual: round avatar, no legal name, no separate contact.
    id: 'c3',
    name: 'Meera Iyer',
    entityType: 'individual',
    industry: 'photography',
    city: 'Bengaluru',
    country: 'IN',
    email: 'meera@meeraiyer.in',
    phone: '+919845098450',
    valuePaise: 96_500_00,
    currency: 'INR',
    addedAt: monthsAgo(2),
    lead: 'Kabir Shah',
    team: ['Kabir Shah'],
  },
  {
    id: 'c4',
    name: 'Harbor & Pine',
    legalName: 'Harbor & Pine Hospitality Pty Ltd',
    entityType: 'pty_ltd',
    industry: 'hospitality',
    city: 'Sydney',
    country: 'AU',
    email: 'ops@harborpine.com.au',
    phone: '+61291234567',
    contactName: 'Liam O’Connor',
    valuePaise: 2_75_000_00,
    monthly: true,
    currency: 'AUD',
    addedAt: monthsAgo(5),
    lead: 'Shivanshu Pareek',
    team: ['Shivanshu Pareek', 'Riya Kapoor'],
  },
  {
    // The longest legal name the column will meet.
    id: 'c5',
    name: 'Shree Ganesh Infra',
    legalName: 'Shree Ganesh Infrastructure and Realty Developers Private Limited',
    entityType: 'pvt_ltd',
    industry: 'real_estate',
    city: 'Ghaziabad',
    country: 'IN',
    email: 'admin@shreeganeshinfra.com',
    phone: '+919811122233',
    contactName: 'Vikram Singhal',
    valuePaise: 3_12_000_00,
    currency: 'INR',
    addedAt: monthsAgo(14),
    lead: 'Riya Kapoor',
    team: ['Riya Kapoor', 'Neha Arora', 'Kabir Shah', 'Shivanshu Pareek', 'Arjun Das'],
  },
  {
    id: 'c6',
    name: 'Atlas Freight',
    legalName: 'Atlas Freight LLC',
    entityType: 'llc',
    industry: 'logistics',
    city: 'Austin',
    country: 'US',
    email: 'ap@atlasfreight.com',
    phone: '+15125550142',
    contactName: 'Jordan Ellis',
    valuePaise: 6_40_000_00,
    monthly: true,
    currency: 'USD',
    addedAt: monthsAgo(3),
    lead: 'Neha Arora',
    team: ['Neha Arora', 'Arjun Das', 'Riya Kapoor'],
  },
  {
    // A proprietor trading under a business name: a person, so a round
    // avatar, but with a trading name in the legal slot.
    id: 'c7',
    name: 'Kavya Textiles',
    legalName: 'Kavya Textiles (Prop. Kavya Patel)',
    entityType: 'proprietorship',
    industry: 'textiles',
    city: 'Surat',
    country: 'IN',
    email: 'kavyatextiles@gmail.com',
    phone: '+919898012345',
    valuePaise: 58_000_00,
    monthly: true,
    currency: 'INR',
    addedAt: monthsAgo(9),
    lead: 'Kabir Shah',
    team: ['Kabir Shah', 'Riya Kapoor'],
  },
  {
    // Almost nothing filled in: every absence the table has to draw.
    id: 'c8',
    name: 'Brightpath',
    entityType: 'pvt_ltd',
    country: 'IN',
    currency: 'INR',
    addedAt: monthsAgo(0),
    team: [],
  },
  {
    id: 'c9',
    name: 'Fern & Fable',
    legalName: 'Fern & Fable Publishing LLP',
    entityType: 'llp',
    industry: 'publishing',
    city: 'Mumbai',
    country: 'IN',
    email: 'hello@fernandfable.in',
    phone: '+912226001234',
    contactName: 'Tara Menon',
    valuePaise: 1_20_000_00,
    monthly: true,
    currency: 'INR',
    addedAt: monthsAgo(4),
    lead: 'Riya Kapoor',
    team: ['Riya Kapoor'],
  },
  {
    id: 'c10',
    name: 'Kestrel Robotics',
    legalName: 'Kestrel Robotics Pte Ltd',
    entityType: 'pte_ltd',
    industry: 'hardware',
    city: 'Singapore',
    country: 'SG',
    email: 'billing@kestrel.sg',
    phone: '+6561234567',
    contactName: 'Wei Ling Tan',
    valuePaise: 5_25_000_00,
    currency: 'SGD',
    addedAt: monthsAgo(1),
    lead: 'Shivanshu Pareek',
    team: ['Shivanshu Pareek', 'Arjun Das'],
  },
  {
    id: 'c11',
    name: 'Sattva Yoga',
    legalName: 'Sattva Wellness Private Limited',
    entityType: 'pvt_ltd',
    industry: 'yoga',
    city: 'Rishikesh',
    country: 'IN',
    email: 'namaste@sattvayoga.in',
    phone: '+919412345678',
    contactName: 'Ananya Rao',
    valuePaise: 45_000_00,
    monthly: true,
    currency: 'INR',
    addedAt: monthsAgo(16),
    lead: 'Arjun Das',
    team: ['Arjun Das', 'Neha Arora'],
  },
  {
    id: 'c12',
    name: 'Bergmann Studio',
    legalName: 'Bergmann Studio GmbH',
    entityType: 'gmbh',
    industry: 'architecture',
    city: 'Berlin',
    country: 'DE',
    email: 'buero@bergmann-studio.de',
    phone: '+49301234567',
    contactName: 'Jonas Bergmann',
    valuePaise: 2_10_000_00,
    currency: 'EUR',
    addedAt: monthsAgo(6),
    lead: 'Neha Arora',
    team: ['Neha Arora'],
  },
];
