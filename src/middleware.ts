import { clerkMiddleware } from '@clerk/nextjs/server';

/**
 * Minimal Clerk middleware — it makes Clerk's auth context available to the
 * app (so `auth()` works in Server Components / Actions) but does NOT itself
 * gate routes.
 *
 * Per Clerk's current guidance AND our Security checklist, auth is NOT enforced
 * by path-matching middleware (which "can diverge from how Next.js routes
 * requests and leave protected resources reachable"). Instead, every protected
 * page and Server Action enforces authorization at the resource, server-side,
 * via `requireAuthorizedUser()` (valid Clerk session AND allowlisted email).
 * Middleware is plumbing; the resource is the boundary.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next internals and static files unless referenced in search params.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes.
    '/(api|trpc)(.*)',
  ],
};
