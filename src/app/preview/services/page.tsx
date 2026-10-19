'use client';

import { notFound } from 'next/navigation';
import AdminShell from '@/components/shell/AdminShell';
import ServiceCatalogue from '@/components/admin/services/ServiceCatalogue';
import { SERVICES } from '@/lib/domain/seed/services';

/**
 * `/preview/services`: the service catalogue with no session and no database.
 *
 * The real one is on `/client/services`, which is behind Clerk and reads Neon.
 * This is the same component over the seeded catalogue, so the *cards* can be
 * looked at and measured without an account: the code badge, the item-count
 * chip, the price block and the corner menu all render from props alone.
 *
 * It renders the seed rather than invented rows because the card's proportions
 * are the thing being checked, and those follow real names and the real spread
 * of how many items a Service carries. A Service with none is what proves the
 * count chip is absent rather than zero.
 *
 * **A rate is put on the first two, and that is a fixture, not a correction.**
 * No seeded Service carries `ratePaise`, for the reason `seed/services.ts`
 * gives: the rate is a figure typed in through the app, and the seed is a first
 * load that never overwrites one. So the whole seeded board reads "Quoted",
 * which is honest and shows nothing about how a *price* sits under a name.
 * Priced here so the layout can be looked at in both states at once.
 *
 * **It does not exist in production**, like its siblings, and the two figures
 * below are invented.
 */
const PRICED = SERVICES.map((service, i) =>
  i === 0
    ? {
        ...service,
        ratePaise: 1_20_000_00,
        /*
          **An overview, for the same reason as the rate.** No seeded Service
          carries one either, so the board renders sixteen cards with no
          description line and the block under the name is a name and a figure.
          The line is real (it is what tells two similar names apart once a
          Service has been edited in the app), and the 16px above the price
          exists to separate the figure from it, so at least one card here has
          to show the pair or that gap is never looked at.
        */
        overview: [
          'A full website build, from structure and copy through to launch.',
        ],
      }
    : i === 1
      ? { ...service, ratePaise: 45_000_00 }
      : // One archived, so the Archived tab has something to show.
        i === SERVICES.length - 1
        ? { ...service, archived: true }
        : service,
);

export default function ServicesPreview() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    // Inside the real shell, so the centred column is judged against the
    // inset frame it really sits in.
    <AdminShell user={{ name: 'Preview', email: 'preview@qera.studio' }}>
      <ServiceCatalogue services={PRICED} />
    </AdminShell>
  );
}
