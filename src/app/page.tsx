import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { buttonVariants } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

// Session cookie must be read on every request.
export const dynamic = 'force-dynamic';

/**
 * Home / dashboard root. Enforces authorization AT THE RESOURCE (not in
 * middleware): a valid Clerk session AND an allowlisted email. Anyone else is
 * redirected to sign-in. This placeholder is replaced by the real dashboard in
 * Phase 4.
 */
export default async function HomePage() {
  let user;
  try {
    user = await requireAuthorizedUser();
  } catch (err) {
    // Distinguish the two failures: not signed in → sign-in; signed in but not
    // allowlisted → a clear no-access page (never a redirect they're past).
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  return (
    <main id="main-content" className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">speclr</h1>
      <p className="mt-2 text-muted-foreground">
        Signed in as {user.email}. The dashboard lands in Phase 4.
      </p>
      {/* TEMP: direct link until Phase 4a builds real navigation. */}
      <div className="mt-6">
        <Link href="/spec" className={buttonVariants({ variant: 'outline' })}>
          Open Icon Spec tool
        </Link>
      </div>
      <div className="mt-6">
        <SignOutButton>
          <button className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
            Sign out
          </button>
        </SignOutButton>
      </div>
    </main>
  );
}
