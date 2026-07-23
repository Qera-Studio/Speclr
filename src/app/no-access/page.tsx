import { SignOutButton } from '@clerk/nextjs';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'No access — speclr',
  robots: { index: false, follow: false },
};

/**
 * Shown to a user who is *authenticated* (a valid Clerk session) but *not
 * authorized* — their email is not on the allowlist. A clear dead-end with a
 * sign-out, rather than a confusing redirect back to a sign-in page they're
 * already past. This is the visible half of the fail-closed allowlist.
 */
export default function NoAccessPage() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <h1 className="text-xl font-semibold">No access</h1>
      <p className="text-sm text-muted-foreground">
        Your account is signed in, but it isn&apos;t authorized to use speclr. If you believe this
        is a mistake, contact the administrator to be added.
      </p>
      <SignOutButton>
        <button className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
          Sign out
        </button>
      </SignOutButton>
    </main>
  );
}
