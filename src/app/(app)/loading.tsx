import { Skeleton } from '@/components/ui/skeleton';

/**
 * The app's one loading boundary — and it is load-bearing for how the whole
 * shell *feels*, not just for what a slow page shows.
 *
 * Without a `loading.tsx` the App Router has nowhere to put a partial result,
 * so it blocks: it keeps the previous page mounted, and — the part that
 * actually hurts — it does not update `usePathname()` until the new page's
 * server render has completely finished. `AdminShell` derives the profile from
 * the pathname, so the rail could not switch until Clerk had been asked who you
 * are and Neon had been asked for your documents. Roughly 400ms of real work
 * on a warm connection, and every bit of it in front of a nav that already
 * knows both profiles client-side and needs neither answer.
 *
 * With this file the navigation commits immediately, the pathname updates, the
 * rail switches, and only the content area waits. That is the same trade Arc
 * makes when you change space: the chrome moves at once and the contents catch
 * up.
 *
 * It sits at the `(app)` level so it wraps `children` *inside* `AdminShell` —
 * the rail, the header and the editor panel stay put and only the middle
 * changes. A boundary further out would blank the shell on every navigation,
 * which is the opposite of the point.
 */
export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6 p-6" aria-busy="true">
      {/*
        Deliberately not a spinner and not a copy of any one page's layout. A
        spinner says "wait"; this says "something the shape of a page is
        arriving". Aria-hidden because the skeleton itself is decoration — the
        status line below is what assistive tech should hear.
      */}
      <span className="sr-only" role="status">
        Loading
      </span>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
