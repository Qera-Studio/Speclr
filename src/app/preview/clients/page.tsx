'use client';

import { notFound } from 'next/navigation';
import ClientsTable from '@/components/admin/clients/ClientsTable';
import { PageBody, PageHeader } from '@/components/admin/Page';
import type { ClientRecord } from '@/lib/domain/types';

/**
 * `/preview/clients`: the clients table with no session and no database.
 *
 * The real one is on `/client/clients`, which is behind Clerk and reads Neon.
 * This is the same component over fixed rows, so the *layout* can be looked at
 * and measured without an account: the flag chip, the dividers, the frozen
 * columns and the three-dot menu all render from props alone, and
 * `e2e/record-table.spec.ts` measures the Location column here.
 *
 * **It does not exist in production**, like its siblings, and none of this is
 * anybody's data. The names are invented.
 *
 * Rows deliberately span several countries, one with no `addressParts` at all,
 * because a blank country reads as India everywhere in this app and the flag
 * chip is the newest place that has to be true.
 */
const CLIENTS: ClientRecord[] = [
  {
    id: 'p1',
    name: 'Clayora',
    companyName: 'Clayora Private Limited',
    address: 'Ghaziabad',
    addressParts: {
      line1: 'C-204',
      city: 'Ghaziabad',
      state: 'Uttar Pradesh',
      pincode: '201017',
      country: 'IN',
    },
    email: 'accounts@clayora.test',
    phone: '+919876543210',
    createdAt: new Date(2026, 5, 10).getTime(),
    updatedAt: new Date(2026, 5, 10).getTime(),
  },
  {
    id: 'p2',
    name: 'Northbank',
    companyName: 'Northbank Studio Ltd',
    // A long city on purpose, and a real one. 'Bridge of Earn, United Kingdom'
    // is wider than the Location column's declared `size`, which is the case
    // that showed the starting width was never clamped: the drag floor only
    // protects a column the reader narrowed, and this one arrived narrow.
    address: 'Bridge of Earn',
    addressParts: {
      line1: '14 Old Street',
      city: 'Bridge of Earn',
      state: 'Perth and Kinross',
      pincode: 'EC1V 9BX',
      country: 'GB',
    },
    email: 'hello@northbank.test',
    phone: '+442079460958',
    createdAt: new Date(2026, 4, 2).getTime(),
    updatedAt: new Date(2026, 4, 2).getTime(),
  },
  {
    id: 'p3',
    name: 'Rouse Hill Dental',
    companyName: 'Rouse Hill Dental Pty Ltd',
    address: 'Rouse Hill',
    addressParts: {
      line1: '3 Windsor Road',
      city: 'Rouse Hill',
      state: 'New South Wales',
      pincode: '2155',
      country: 'AU',
    },
    email: 'admin@rousehilldental.test',
    phone: '+61285551234',
    createdAt: new Date(2026, 3, 21).getTime(),
    updatedAt: new Date(2026, 3, 21).getTime(),
  },
  {
    id: 'p4',
    name: 'Kessler',
    companyName: 'Kessler GmbH',
    address: 'Berlin',
    addressParts: {
      line1: 'Torstrasse 1',
      city: 'Berlin',
      state: 'Berlin',
      pincode: '10119',
      country: 'DE',
    },
    email: 'buchhaltung@kessler.test',
    phone: '+493012345678',
    createdAt: new Date(2026, 2, 14).getTime(),
    updatedAt: new Date(2026, 2, 14).getTime(),
  },
  {
    id: 'p5',
    name: 'Meridian Labs',
    companyName: 'Meridian Labs Inc.',
    address: 'Austin',
    addressParts: {
      line1: '500 Congress Avenue',
      city: 'Austin',
      state: 'Texas',
      pincode: '78701',
      country: 'US',
    },
    email: 'ap@meridianlabs.test',
    phone: '+15125550110',
    createdAt: new Date(2026, 1, 8).getTime(),
    updatedAt: new Date(2026, 1, 8).getTime(),
  },
  {
    // No `addressParts` at all, which is what a row written before structured
    // addresses looks like. The flag has to read as India and the city has to be
    // absent without printing a stray comma.
    id: 'p6',
    name: 'Old Record',
    address: '9 Legacy Lane, Pune',
    email: 'legacy@old.test',
    phone: '+919812345678',
    createdAt: new Date(2025, 11, 1).getTime(),
    updatedAt: new Date(2025, 11, 1).getTime(),
  },
] as ClientRecord[];

export default function ClientsPreview() {
  if (process.env.NODE_ENV === 'production') notFound();

  const noop = () => undefined;

  return (
    <PageBody>
      <PageHeader title="Clients" />
      {/* No `onSortChange`: sorting travels with a `SortToggle`, which lives in
          `ClientManager` on the real page. This fixture is for looking at the
          layout, so it renders the headings in their unsortable form rather
          than offering arrows with no way to turn them off. */}
      <ClientsTable clients={CLIENTS} onDelete={noop} onArchive={noop} />
    </PageBody>
  );
}
