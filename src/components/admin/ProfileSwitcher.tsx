"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PROFILES, type Profile } from "@/lib/profile";
import { useProfileEntries } from "@/lib/useProfile";
import { NAV_BY_PROFILE } from "./nav";

/**
 * The Client / Admin switcher, beside the wordmark in `TopPanel`.
 *
 * speclr is two applications sharing one shell, and this is the only control
 * that crosses between them — the nav, the home, ⌘D and ⌘K all belong to
 * whichever half is selected.
 *
 * **Two links, not a tablist.** `ui/tabs.tsx` would have been the closer visual
 * match, but `role="tablist"` promises a screen reader that activating a tab
 * swaps a panel in place. These navigate to a different page. Links that look
 * like tabs are honest; tabs that are secretly links are not.
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
 * Shared by the swipe and the pill's two links so both land in the same
 * place. A switch that resumed from one control and reset from another would
 * be worse than one that always reset.
 */
function entryHref(
  profile: Profile,
  entries: Partial<Record<Profile, string>>,
): string {
  return entries[profile] ?? NAV_BY_PROFILE[profile].home.href;
}

/** The other one. With two profiles this is total — no fallback to reason about. */
export function otherProfile(profile: Profile): Profile {
  return profile === "client" ? "admin" : "client";
}

/** Release past this fraction of the way across commits; short of it, springs back. */
const COMMIT_AT = 0.4;

/**
 * Travel under this fraction of the way across is a click that wobbled, not a
 * drag. A fraction rather than a pixel count, so it scales with the control
 * instead of meaning one thing in the rail and another in a narrower one.
 */
const DRAG_SLOP = 0.05;

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
  const entries = useProfileEntries();
  const router = useRouter();
  const [drag, setDrag] = useState<{
    startX: number;
    /** Half the control: how far the pill travels for one whole profile. */
    span: number;
    offset: number;
  } | null>(null);
  const [latch, setLatch] = useState<{
    direction: -1 | 1;
    from: Profile;
  } | null>(null);
  /** Whether the pointer travelled far enough that the release was a drag. */
  const moved = useRef(false);
  /** Mirrors `drag.offset`, read synchronously at release — see `beginDrag`. */
  const offsetRef = useRef(0);
  /** Tears down whichever `window` listeners the current drag attached. */
  const cleanup = useRef<(() => void) | null>(null);

  const index = PROFILES.indexOf(profile);

  /**
   * The pill answers a mouse held on it, dragged across, and released past the
   * halfway point — the same gesture as the rail swipe, at the scale of the
   * control itself.
   *
   * Mouse and pen only. Touch already reaches `useProfileDrag` through the
   * rail, and two handlers reading one finger would fight over the offset.
   *
   * Latched on release rather than zeroed, for the reason `useProfileDrag`
   * records at length: zeroing and *then* navigating springs the pill home,
   * sits through the round trip and slides it across a second time. The latch
   * is compared against the profile it was taken at, so the frame where the
   * index advances is the frame it clears, and the two cancel exactly.
   */
  const held = latch && latch.from === profile ? latch.direction : 0;
  const shown = drag ? drag.offset : held || offset;
  const live = drag !== null || dragging;

  const beginDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || event.pointerType === "touch") return;
    // A stray second pointerdown before the first drag's `pointerup` would
    // otherwise stack listeners.
    cleanup.current?.();

    // Zero-width in jsdom, and a zero span divides every drag to Infinity.
    const span = event.currentTarget.getBoundingClientRect().width / 2 || 1;
    const startX = event.clientX;
    moved.current = false;
    offsetRef.current = 0;
    setLatch(null);
    setDrag({ startX, span, offset: 0 });

    /**
     * Tracked on `window`, not through this element's own bubbling handlers
     * — the same fix as `useTabDrag` in `ui/tabs.tsx`, and the same bug it
     * fixes: the pointer capture this used to take on the first move past
     * the slop threshold had a hole. Without capture already active, a
     * pointermove whose *first* sample already lands outside the switcher's
     * own bounds — an ordinary-speed drag on a 212px-wide control clears it
     * easily — never reaches this handler at all, so capture was never
     * taken, every later move suffered the same fate, and the pill sat dead
     * at rest for the whole gesture with no navigation on release. Confirmed
     * with a single un-interpolated jump from inside the control to past its
     * far edge, before this fix, which left the pill at `translateX(0)` and
     * the URL unchanged. `window` sees every pointer event in the document
     * regardless of what is under the cursor, so no capture is needed; a
     * plain, no-movement tap on Admin still reaches the link untouched.
     */
    const handleMove = (moveEvent: PointerEvent) => {
      const raw = (moveEvent.clientX - startX) / span;
      if (Math.abs(raw) > DRAG_SLOP) moved.current = true;
      // Clamped to the ends: pulling left from the leftmost profile is inert
      // rather than rubber-banding towards a page that will not open.
      const offsetNow = Math.max(
        -index,
        Math.min(PROFILES.length - 1 - index, raw),
      );
      offsetRef.current = offsetNow;
      setDrag((current) =>
        current ? { ...current, offset: offsetNow } : current,
      );
    };

    const finish = (commit: boolean) => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
      cleanup.current = null;
      const settled = offsetRef.current;
      setDrag(null);
      if (!commit || Math.abs(settled) < COMMIT_AT) return;
      const direction = settled > 0 ? 1 : -1;
      const next = PROFILES[index + direction];
      if (!next) return;
      setLatch({ direction, from: profile });
      router.push(entryHref(next, entries));
    };

    const handleUp = () => finish(true);
    const handleCancel = () => finish(false);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
    cleanup.current = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
  };

  return (
    // No tooltips expanded: the labels are right there, and a tooltip repeating
    // a visible word is noise the pointer has to wait out.
    <nav
      aria-label="Profile"
      onPointerDown={beginDrag}
      // A release that travelled is a drag, and the link underneath it must not
      // also fire — it would navigate to whichever half the mouse happened to
      // come up over, which is frequently the one being dragged away from.
      onClickCapture={(event) => {
        if (!moved.current) return;
        moved.current = false;
        event.preventDefault();
      }}
      className={cn(
        // No border, no fill, no shadow. The active pill is the whole of the
        // control's visible state, and an outline around it was a second edge
        // saying what the fill already says on a header that is one flat band.
        "relative flex items-center",
        drag ? "cursor-grabbing select-none" : "cursor-grab",
      )}
    >
      {/*
        The fill behind the active half, drawn once and translated rather than
        painted on whichever link is active — which is what lets the drag move
        it per frame.

        No shadow, no border and no container around it: the fill is the whole
        of the state now, which is why `--raised` is a step *down* the slate
        ramp rather than white. `bg-card` and `bg-background` were both tried
        and are the same slate 50 as the header, so the pill came out identical
        to the ground behind it and only a hairline said anything.

        `bg-raised` is the token written for this exact surface: "the pill that
        sits on a track, the active tab, the active profile". Both its values
        are measured by the contrast suite, which a `bg-white` written here
        would have slipped straight past.
      */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2 rounded-md bg-raised",
          // Untransitioned while dragging — the offset is already per-frame, and
          // a transition on top of it lags the fingers. Everything else,
          // including the committed hold that outlasts the gesture, animates.
          !live && "transition-transform duration-200 ease-standard",
        )}
        style={{ transform: `translateX(${(index + shown) * 100}%)` }}
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
            aria-current={active ? "page" : undefined}
            // A link is natively draggable, and holding one and moving starts
            // the browser's own drag with its ghost image, which cancels the
            // pointer stream before the pill ever sees it. This is what made
            // the gesture feel dead over the labels.
            draggable={false}
            className={cn(
              // `px-3`, up from `px-2`. The pill is exactly half the control
              // and the two halves are adjacent by construction, so the air
              // between the labels is the links' own padding: widening it is
              // what separates them without introducing a gap the pill would
              // then have to be short of.
              "relative z-10 flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors",
              // Exactly the rail's own two weights. A nav row below never
              // changes colour to say it is active — `sidebarMenuButtonVariants`
              // moves the *background* and leaves the label on
              // `--sidebar-foreground` — so the selected profile sits on that
              // same 0.44 and the unselected one steps back to the muted ramp.
              // `--foreground` (0.145) and `--sidebar-accent-foreground` (0.205)
              // both read as ink beside it; they are hover and press colours
              // here, not resting ones.
              active
                ? "text-sidebar-foreground"
                : "text-muted-foreground hover:text-sidebar-foreground",
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
