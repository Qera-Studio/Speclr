import { cn } from "@/lib/utils";

/**
 * A Lucide-native Download / Upload icon whose arrow "cycles" once per hover:
 * the resting arrow accelerates in its travel direction and clips behind the
 * tray bar, while a fresh arrow slides in from the opposite edge to the rest
 * position. The tray (the static U-shaped bar) never moves.
 *
 * Driven purely by CSS: give the icon's hoverable container the `group/tray`
 * class and the arrow animates on that container's hover (once per hover,
 * re-arming on leave). No Motion / JS. This is the one animated up/down icon —
 * use it everywhere instead of the raw Lucide Upload/Download, and add
 * `group/tray` to whatever wraps it.
 *
 * Geometry is lifted verbatim from lucide-react's `download` / `upload` icons
 * (24×24 viewBox, 2px stroke) so it renders identically to the Lucide set;
 * split into layers here so the arrow can animate independently of the tray.
 */
export type TrayArrowDirection = "down" | "up";

// The tray bar, identical for both directions.
const TRAY_PATH = "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4";

// Arrow = vertical stem + chevron, taken from the matching Lucide icon.
const ARROW = {
  down: { stem: "M12 15V3", chevron: "m7 10 5 5 5-5" },
  up: { stem: "M12 3v12", chevron: "m17 8-5-5-5 5" },
} as const;

export interface TrayArrowIconProps {
  direction?: TrayArrowDirection;
  className?: string;
}

export function TrayArrowIcon({
  direction = "down",
  className,
}: TrayArrowIconProps) {
  const { stem, chevron } = ARROW[direction];

  // At rest, both arrows sit lifted ~2px AWAY from the tray so the tip never
  // looks cropped against the clip line; on hover the resting arrow travels
  // ~18px past the tray (clipped behind it) while the incoming arrow lands at
  // the lifted rest position. Keyed to the parent `.group/button:hover` so the
  // transition runs once per hover.
  //
  // Class strings are fully spelled out (not composed at runtime) so Tailwind's
  // JIT scanner generates them — dynamic `translate-y-[${x}px]` would be purged.
  const arrows =
    direction === "down"
      ? {
          restingRest: "-translate-y-[2px]",
          restingHover: "group-hover/tray:translate-y-[18px]",
          incomingRest: "-translate-y-[18px]",
          incomingHover: "group-hover/tray:-translate-y-[2px]",
        }
      : {
          restingRest: "translate-y-[2px]",
          restingHover: "group-hover/tray:-translate-y-[18px]",
          incomingRest: "translate-y-[18px]",
          incomingHover: "group-hover/tray:translate-y-[2px]",
        };

  const arrowTransition =
    "transition-transform duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)]";

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
      aria-hidden="true"
    >
      <defs>
        {/* Clip everything above the tray bar so a travelling arrow vanishes
            behind it rather than overflowing the icon box. */}
        <clipPath id={`tray-clip-${direction}`}>
          <rect x="0" y="0" width="24" height="15" />
        </clipPath>
      </defs>

      <g clipPath={`url(#tray-clip-${direction})`}>
        {/* Resting arrow — visible (lifted) at rest, exits past the tray on hover. */}
        <g
          className={cn(
            arrowTransition,
            arrows.restingRest,
            arrows.restingHover,
          )}
        >
          <path d={stem} />
          <path d={chevron} />
        </g>
        {/* Incoming arrow — starts off the opposite edge, lands at rest on hover. */}
        <g
          className={cn(
            arrowTransition,
            arrows.incomingRest,
            arrows.incomingHover,
          )}
        >
          <path d={stem} />
          <path d={chevron} />
        </g>
      </g>

      {/* Tray drawn last so it sits in front — the arrow clips behind it. */}
      <path d={TRAY_PATH} />
    </svg>
  );
}

// Lucide's `arrow-right` / `arrow-left`, same 24×24 viewBox and 2px stroke.
const SIDE_ARROW = {
  right: { stem: "M5 12h14", chevron: "m12 5 7 7-7 7" },
  left: { stem: "M19 12H5", chevron: "m12 19-7-7 7-7" },
} as const;

export interface CycleArrowIconProps {
  direction?: "right" | "left";
  className?: string;
}

/**
 * The tray icon's cycle, sideways: on hover the resting arrow leaves the icon
 * box in its own direction and a fresh one arrives from the opposite edge.
 * There is no tray here, so the svg's own viewport does the clipping.
 *
 * Same `group/tray` hook, deliberately: one group name for one motion, so a
 * button can swap a down-arrow for a right-arrow without touching its wrapper.
 */
export function CycleArrowIcon({
  direction = "right",
  className,
}: CycleArrowIconProps) {
  const { stem, chevron } = SIDE_ARROW[direction];

  // Spelled out rather than composed, for the JIT scanner (see above).
  // The outgoing arrow is thrown well past the viewport rather than just over
  // its edge, so it reads as leaving rather than sliding; the incoming one
  // starts a full icon-width back, keeping a gap between the two.
  const arrows =
    direction === "right"
      ? {
          restingHover: "group-hover/tray:translate-x-[300px]",
          incomingRest: "-translate-x-[24px]",
        }
      : {
          restingHover: "group-hover/tray:-translate-x-[300px]",
          incomingRest: "translate-x-[24px]",
        };

  // The transition itself is hover-only, so leaving resets instantly instead of
  // running the whole thing backwards. Only the outbound trip is the animation.
  const arrowTransition =
    "transition-none group-hover/tray:transition-transform group-hover/tray:duration-[420ms] group-hover/tray:ease-[cubic-bezier(0.4,0,0.2,1)]";

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
      aria-hidden="true"
    >
      <g className={cn(arrowTransition, arrows.restingHover)}>
        <path d={stem} />
        <path d={chevron} />
      </g>
      <g
        className={cn(
          arrowTransition,
          arrows.incomingRest,
          "group-hover/tray:translate-x-0",
        )}
      >
        <path d={stem} />
        <path d={chevron} />
      </g>
    </svg>
  );
}
