import { redirect } from 'next/navigation';
import { SignOutButton } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';

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
  } catch {
    redirect('/sign-in');
  }

  return (
    <main id="main-content" className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">speclr</h1>
      <p className="mt-2 text-muted-foreground">
        Signed in as {user.email}. The dashboard lands in Phase 4.
      </p>
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
