import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in — speclr',
  robots: { index: false, follow: false },
};

/**
 * The only public route. Clerk's <SignIn> renders the hosted sign-in UI
 * (email, per the app's configured methods). After sign-in, Clerk redirects
 * back; the allowlist check in requireAuthorizedUser() then decides whether a
 * signed-in user is actually permitted to use the tool.
 */
export default function SignInPage() {
  return (
    <main
      id="main-content"
      className="flex min-h-dvh items-center justify-center bg-background p-6"
    >
      <SignIn />
    </main>
  );
}
