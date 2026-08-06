import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

/**
 * Services moved into the contract list — a service template exists to be
 * pulled into a contract, so it belongs beside the contracts rather than as a
 * Records entry of its own.
 *
 * Kept as a redirect rather than deleted: this was a nav destination, so it is
 * in browser histories and bookmarks, and a 404 there would read as data loss.
 * The redirect leaks nothing — authorization is enforced at the target, the way
 * every route in this app does it.
 */
export default function ServicesPage() {
  redirect('/docs/contract');
}
