'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A horizontal drag over the nav rail, for moving between profiles — the
 * gesture Arc uses to move between spaces.
 *
 * **The gesture holds where it landed until the navigation catches up.** This
 * is the whole shape of the hook and the thing an earlier version got wrong: it
 * zeroed the offset on release and *then* pushed the route, so the rail sprang
 * back to where it started, waited out the RSC round trip, and slid across a
 * second time. It read as a decorative animation covering for a slow toggle,
 * which is exactly what it was. A committing release now latches the offset at
 * the full committed direction instead, and because the caller's transform is
 * `(-index - offset)`, the frame where `index` advances and the latch clears is
 * arithmetically identical to the frame before it. One gesture, one movement,
 * no snap-back.
 *
 * **The browser must not answer instead of the rail.** macOS turns a horizontal
 * wheel over a non-scrollable area into history back/forward, and once it has
 * claimed a gesture no later `preventDefault` can take it back — so the axis is
 * decided once per stream and every event in a horizontal one is cancelled,
 * rather than each event being judged on its own deltas. See `axis` below.
 * Touch stays passive: it does not trigger history navigation, and cancelling it
 * would cost the compositor the rail's own vertical scroll.
 *
 * **The switcher, not this, is the accessible control.** A gesture cannot be
 * tabbed to, described, or discovered, so this is strictly an accelerator on
 * top of two real links. Nothing here is the only way to reach anything.
 */

/** Travel that counts as a full profile's width. Roughly the rail. */
const SPAN = 220;

/** Release past this fraction commits; short of it, springs back. */
const COMMIT_AT = 0.4;

/**
 * A wheel gesture is a stream with no end event, so the end is inferred: this
 * long without a wheel event and the fingers have left the trackpad.
 *
 * Long enough to outlast the gaps inside one slow drag, short enough that a
 * deliberate flick resolves immediately.
 */
const WHEEL_IDLE_MS = 90;

/**
 * How long a latched gesture waits for its navigation before giving up.
 *
 * The latch is normally cleared by the profile actually changing. If that push
 * never lands — a failed fetch, a route error — the rail would otherwise sit
 * showing a profile the page is not on, which is worse than a snap-back because
 * it is silently wrong rather than merely ugly. Generous enough that a slow but
 * working navigation is never interrupted.
 */
const LATCH_TIMEOUT_MS = 2000;

/**
 * Deltas below this are noise and decide nothing. A trackpad swipe opens with
 * near-zero values on both axes, and letting one of those pick the axis is how
 * a horizontal gesture ends up classified as vertical.
 */
const AXIS_DEADZONE = 0.5;

/**
 * The rail, in either of the forms `ui/sidebar` renders it: a fixed panel on
 * desktop, an off-canvas sheet on mobile. Both carry this attribute.
 *
 * Matched off the event target rather than held as a ref, because `Sidebar`
 * spreads its props — `ref` included — onto a Base UI `Sheet` root in the
 * mobile branch, where a DOM ref does not belong. Reading the target keeps the
 * gesture working on the surface that actually needs touch support, and adds no
 * wrapper element to a layout jsdom cannot check.
 */
const RAIL_SELECTOR = '[data-slot="sidebar"]';

function insideRail(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(RAIL_SELECTOR) !== null;
}

export interface ProfileDrag {
  /** −1…1. Negative drags towards the previous profile, positive the next. */
  offset: number;
  /**
   * True while fingers are down (or a wheel stream is live) — and false through
   * the settle, including while latched. Callers gate their CSS transition on
   * this rather than on `offset === 0`: a latch is a non-zero offset that very
   * much wants to animate.
   */
  dragging: boolean;
  /**
   * The direction of a committed gesture whose navigation has not landed yet,
   * or 0. The caller needs this to know which profile is actually *on screen*
   * during the hold — the one it is still being told it is on is the one that
   * has scrolled away.
   */
  committed: -1 | 0 | 1;
}

/** A committed gesture, waiting for its navigation to land. */
interface Latch {
  direction: -1 | 1;
  /** The `settleKey` at commit time. When it changes, the navigation arrived. */
  from: unknown;
}

/**
 * @param onCommit  Called with the direction to step, once, on release.
 * @param canStep   Whether a step in that direction exists — the drag is
 *                  clamped to 0 in a direction that leads nowhere, so pulling
 *                  left from the leftmost profile is inert rather than
 *                  rubber-banding towards a page that will not open.
 * @param settleKey Whatever `onCommit` ultimately changes — the current profile.
 *                  The hook holds the committed offset until this differs from
 *                  what it was at commit time, which is how the rail stays put
 *                  instead of springing back while the route loads.
 */
export function useProfileDrag(
  onCommit: (direction: -1 | 1) => void,
  canStep: (direction: -1 | 1) => boolean,
  settleKey?: unknown,
): ProfileDrag {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [latch, setLatch] = useState<Latch | null>(null);

  // Held in refs so the listeners attach once. Re-subscribing on every render
  // would drop a gesture mid-swipe whenever the parent re-rendered.
  const commit = useRef(onCommit);
  commit.current = onCommit;
  const allowed = useRef(canStep);
  allowed.current = canStep;
  const keyRef = useRef(settleKey);
  keyRef.current = settleKey;

  const clamp = useCallback((raw: number) => {
    if (raw === 0) return 0;
    const direction = raw > 0 ? 1 : -1;
    if (!allowed.current(direction)) return 0;
    return Math.max(-1, Math.min(1, raw));
  }, []);

  useEffect(() => {
    // Someone who has asked not to be shown motion still gets the gesture —
    // it just resolves instantly instead of tracking the fingers.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    let travel = 0;
    let idle: ReturnType<typeof setTimeout> | null = null;
    let touchStart: { x: number; y: number } | null = null;

    /**
     * The axis of the wheel stream currently in flight, decided once.
     *
     * Judging each event on its own `|deltaX| > |deltaY|` was the bug: a
     * trackpad swipe opens with near-zero deltas and carries stray vertical
     * noise throughout, so the opening event of a perfectly horizontal gesture
     * regularly failed the test and went uncancelled — at which point macOS had
     * already claimed it for history back/forward, and every `preventDefault`
     * after that was ignored. Deciding once and holding until the idle timeout
     * means a horizontal stream is cancelled end to end, and a vertical one is
     * never touched, so the rail still scrolls.
     */
    let axis: 'x' | 'y' | null = null;

    const release = () => {
      const settled = clamp(travel / SPAN);
      travel = 0;
      axis = null;
      setDragging(false);

      if (Math.abs(settled) < COMMIT_AT) {
        setOffset(0);
        return;
      }

      // Latched, NOT reset. Zeroing here and then navigating is what made the
      // rail spring home, sit through the round trip and slide across a second
      // time. Held at the full width, the track is already where the navigation
      // is about to put it.
      const direction = settled > 0 ? 1 : -1;
      setOffset(0);
      setLatch({ direction, from: keyRef.current });
      commit.current(direction);
    };

    const onWheel = (event: WheelEvent) => {
      if (!insideRail(event.target)) return;

      if (!axis) {
        const x = Math.abs(event.deltaX);
        const y = Math.abs(event.deltaY);
        // Too small to mean anything yet — wait for an event that does, rather
        // than letting noise pick the axis for the whole gesture.
        if (x < AXIS_DEADZONE && y < AXIS_DEADZONE) return;
        axis = x > y ? 'x' : 'y';
      }

      // Vertical intent wins: the rail's own content scrolls, and a scroll down
      // a long nav must not drag the profile sideways. Re-armed on idle.
      if (axis === 'y') {
        if (idle) clearTimeout(idle);
        idle = setTimeout(release, WHEEL_IDLE_MS);
        return;
      }

      // The whole point. Without this macOS treats the gesture as history
      // back/forward and the rail never sees it as a drag at all.
      event.preventDefault();

      travel += event.deltaX;
      setLatch(null);
      setDragging(true);
      if (!reduced?.matches) setOffset(clamp(travel / SPAN));

      if (idle) clearTimeout(idle);
      idle = setTimeout(release, WHEEL_IDLE_MS);
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      // Anchored to where the finger went *down*. Checking the rail on touchend
      // instead would miss a swipe that started on the rail and lifted off it,
      // which is most of them.
      touchStart =
        touch && insideRail(event.target) ? { x: touch.clientX, y: touch.clientY } : null;
    };

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touchStart || !touch) return;
      const dx = touch.clientX - touchStart.x;
      const dy = touch.clientY - touchStart.y;
      if (Math.abs(dx) <= Math.abs(dy)) return;

      // Sign flips against the wheel: dragging a finger right-to-left gives a
      // negative dx and is the same intent as a positive trackpad `deltaX`.
      travel = -dx;
      setLatch(null);
      setDragging(true);
      if (!reduced?.matches) setOffset(clamp(travel / SPAN));
    };

    const onTouchEnd = () => {
      if (!touchStart) return;
      touchStart = null;
      release();
    };

    // The wheel listener must be non-passive to cancel the browser gesture;
    // everything else stays passive so scrolling keeps to the compositor.
    document.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      if (idle) clearTimeout(idle);
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [clamp]);

  /**
   * A latch whose navigation arrived is spent. Clearing it is invisible: the
   * caller's transform reads `(-index - offset)`, so index+1 with offset 0 and
   * index with offset 1 are the same position — which is the entire reason the
   * effective value below is computed during render rather than in an effect.
   * Zeroing it here *after* a paint would leave one frame with the new index and
   * the old latch still applied, and that frame is two rails wide.
   */
  useEffect(() => {
    if (!latch) return;
    if (latch.from !== settleKey) {
      setLatch(null);
      return;
    }
    // The navigation never landed. Rather than leave the rail showing a profile
    // the page is not on, give up and spring back.
    const failsafe = setTimeout(() => setLatch(null), LATCH_TIMEOUT_MS);
    return () => clearTimeout(failsafe);
  }, [latch, settleKey]);

  const committed: -1 | 0 | 1 = latch && latch.from === settleKey ? latch.direction : 0;

  return { offset: latch ? committed : offset, dragging, committed };
}
