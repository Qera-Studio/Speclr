import { SignOutButton } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export const metadata: Metadata = {
  title: 'No access — speclr',
  robots: { index: false, follow: false },
};

/**
 * Shown to a user who is *authenticated* (a valid Clerk session) but *not
 * authorized* — their email is not on the allowlist. A clear dead-end with a
 * sign-out, rather than a confusing redirect back to a sign-in page they're
 * already past. This is the visible half of the fail-closed allowlist.
 *
 * Built out of the app's own `Empty` and `Button` rather than the hand-rolled
 * heading and bare `<button>` it used to be. This is a real state, not a stub:
 * it is the only screen a wrongly-invited colleague ever sees, and a page in a
 * different visual language than the product reads as an error page from some
 * other system, which is exactly the wrong impression when the correct next
 * step is "ask to be added", not "something is broken".
 *
 * It deliberately does **not** name the allowlist, the environment variable, or
 * which emails are on it. That is a list of who can reach real financial
 * records, and this page is reachable by anyone who can create a Clerk session.
 */
export default function NoAccessPage() {
  return (
    <main
      id="main-content"
      className="flex min-h-dvh items-center justify-center bg-background p-6"
    >
      <Empty className="max-w-md border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldX />
          </EmptyMedia>
          <EmptyTitle>You are signed in, but not on the list</EmptyTitle>
          <EmptyDescription>
            speclr is invite-only. Your account is valid; it just has not been granted access to
            this tool yet. Ask an administrator to add you, then sign in again.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <SignOutButton>
            <Button type="button" variant="outline">
              Sign out
            </Button>
          </SignOutButton>
        </EmptyContent>
      </Empty>
    </main>
  );
}
