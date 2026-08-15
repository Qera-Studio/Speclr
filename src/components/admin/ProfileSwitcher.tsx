'use client';

import { useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { tabPillSurface } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSidebar } from '@/components/ui/sidebar';
import { PROFILES, type Profile } from '@/lib/profile';
import { useProfileEntries } from '@/lib/useProfile';
import { NAV_BY_PROFILE } from './nav';

/**
 * The Client / Admin switcher, at the top of the nav.
 *
 * speclr is two applications sharing one shell, and this is the only control
 * that crosses between them. It sits directly under the wordmark because it
 * scopes everything below it — the nav, the home, ⌘D and ⌘K all belong to
 * whichever half is selected.
 *
 * **Two links, not a tablist.** `ui/tabs.tsx` would have been the closer visual
 * match, but `role="tablist"` promises a screen reader that activating a tab
 * swaps a panel in place. These navigate to a different page. Links that look
 * like tabs are honest; tabs that are secretly links are not.
 *
 * **Collapsed, it is one square button, not two stacked halves.** Stacking a
 * pair into the icon rail made a tall oval that lined up with nothing: the rows
 * below are 32px squares, and a two-row control cannot be one. So the rail gets
 * the same affordance `ThemeToggle` uses one group down — the *current* value,
 * clickable to change — in exactly the box `sidebarMenuButtonVariants` gives a
 * nav row, so the two icons share an edge.
 */

/**
 * Step to the profile `direction` places along `PROFILES`, or nowhere if that
 * falls off the end.
 *
 * Deliberately does not wrap. With two profiles a wrapping step would make
 * every swipe switch regardless of direction, which turns the gesture into a
 * toggle and loses the spatial sense — Client is on the left, and swiping left
 * from it should do nothing.
 *
 * Nothing is remembered here: `AdminShell` records whichever profile you land
 * on, so every route into a profile is remembered the same way.
 */
export function useStepProfile(current: Profile) {
  const router = useRouter();
  const entries = useProfileEntries();

  /**
   * Warm the other profile's home before it is asked for.
   *
   * There are only ever two, one of them is where you are, and the switch is
   * one gesture away at all times — so this is a prefetch with an unusually
   * good hit rate rather than a speculative one. It buys back the Clerk and
   * Neon round trips the swipe would otherwise pay for in front of you.
   *
   * The visible switcher is a `<Link>`, which Next prefetches on its own, but
   * only in production and only once it decides to. The gesture can fire
   * without the pointer ever touching that link, so it asks explicitly.
   */
  useEffect(() => {
    for (const profile of PROFILES) {
      if (profile !== current) router.prefetch(entryHref(profile, entries));
    }
  }, [current, entries, router]);

  return useCallback(
    (direction: -1 | 1) => {
      const next = PROFILES[PROFILES.indexOf(current) + direction];
      if (!next) return;
      router.push(entryHref(next, entries));
    },
    [current, entries, router],
  );
}

/**
 * Where a profile reopens: the last page seen there, else its home.
 *
 * Shared by the swipe, the collapsed square and the expanded pair so all three
 * land in the same place. A switch that resumed from one control and reset from
 * another would be worse than one that always reset.
 */
function entryHref(profile: Profile, entries: Partial<Record<Profile, string>>): string {
  return entries[profile] ?? NAV_BY_PROFILE[profile].home.href;
}

/** The other one. With two profiles this is total — no fallback to reason about. */
export function otherProfile(profile: Profile): Profile {
  return profile === 'client' ? 'admin' : 'client';
}

export default function ProfileSwitcher({
  profile,
  /**
   * How far through a drag between the two profiles, −1…1, from
   * `useProfileDrag`. The pill rides it so the control moves with the nav
   * rather than snapping after it.
   */
  offset = 0,
  /** True only while fingers are down — see `ProfileDrag`. */
  dragging = false,
}: {
  profile: Profile;
  offset?: number;
  dragging?: boolean;
}) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;
  const entries = useProfileEntries();

  const other = otherProfile(profile);
  const otherNav = NAV_BY_PROFILE[other];
  const currentNav = NAV_BY_PROFILE[profile];
  const CurrentIcon = currentNav.icon;

  // Collapsed: one square showing where you are, linking to the other side.
  // A Link, not ThemeToggle's button — a profile *is* a URL, so ⌘-click, middle
  // click and the browser's own status-bar preview all keep working for free.
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={entryHref(other, entries)}
              aria-label={`Profile: ${currentNav.label}. Switch to ${otherNav.label}`}
              // Not `self-center`: the rows below start at the header's left
              // padding, so centring this one in the rail put it a few pixels
              // off their shared centre line.
              className="flex size-8 items-center justify-center rounded-[calc(var(--radius-sm)+2px)] text-sidebar-foreground transition-colors hover:bg-sidebar-hover hover:text-sidebar-accent-foreground"
            >
              <CurrentIcon className="size-4" aria-hidden="true" />
            </Link>
          }
        />
        <TooltipContent side="right">
          {currentNav.label} — tap to change
        </TooltipContent>
      </Tooltip>
    );
  }

  const index = PROFILES.indexOf(profile);

  return (
    // No tooltips expanded: the labels are right there, and a tooltip repeating
    // a visible word is noise the pointer has to wait out.
    <nav
      aria-label="Profile"
      className="relative flex items-center rounded-lg bg-muted p-[3px]"
    >
      {/*
        The raised surface, drawn once and translated, rather than painted on
        whichever link is active. `tabPillSurface` is `ui/tabs.tsx`'s export for
        exactly this — it exists because the hand-rolled pills had drifted, and
        this was a fourth one that had: `bg-sidebar` on `bg-sidebar-accent/50` is
        a 0.7% lightness difference in the light theme, which is to say none.
      */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-[3px] left-[3px] z-0 w-[calc(50%-3px)] rounded-md',
          tabPillSurface,
          // Untransitioned while dragging — the offset is already per-frame, and
          // a transition on top of it lags the fingers. Everything else,
          // including the committed hold that outlasts the gesture, animates.
          !dragging && 'transition-transform duration-300 ease-out',
        )}
        style={{ transform: `translateX(${(index + offset) * 100}%)` }}
      />
      {PROFILES.map((value) => {
        const nav = NAV_BY_PROFILE[value];
        const Icon = nav.icon;
        const active = value === profile;
        return (
          <Link
            key={value}
            // The side you are on links to its home, which is the ordinary
            // "take me back to the top" affordance. The side you are not on
            // links to where you left it.
            href={active ? nav.home.href : entryHref(value, entries)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative z-10 flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors',
              active
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{nav.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
