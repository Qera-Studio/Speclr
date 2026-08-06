import { cn } from '@/lib/utils';

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
export type TrayArrowDirection = 'down' | 'up';

// The tray bar, identical for both directions.
const TRAY_PATH = 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4';

// Arrow = vertical stem + chevron, taken from the matching Lucide icon.
const ARROW = {
  down: { stem: 'M12 15V3', chevron: 'm7 10 5 5 5-5' },
  up: { stem: 'M12 3v12', chevron: 'm17 8-5-5-5 5' },
} as const;

export interface TrayArrowIconProps {
  direction?: TrayArrowDirection;
  className?: string;
}

export function TrayArrowIcon({ direction = 'down', className }: TrayArrowIconProps) {
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
    direction === 'down'
      ? {
          restingRest: '-translate-y-[2px]',
          restingHover: 'group-hover/tray:translate-y-[18px]',
          incomingRest: '-translate-y-[18px]',
          incomingHover: 'group-hover/tray:-translate-y-[2px]',
        }
      : {
          restingRest: 'translate-y-[2px]',
          restingHover: 'group-hover/tray:-translate-y-[18px]',
          incomingRest: 'translate-y-[18px]',
          incomingHover: 'group-hover/tray:translate-y-[2px]',
        };

  const arrowTransition = 'transition-transform duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)]';

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4', className)}
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
        <g className={cn(arrowTransition, arrows.restingRest, arrows.restingHover)}>
          <path d={stem} />
          <path d={chevron} />
        </g>
        {/* Incoming arrow — starts off the opposite edge, lands at rest on hover. */}
        <g className={cn(arrowTransition, arrows.incomingRest, arrows.incomingHover)}>
          <path d={stem} />
          <path d={chevron} />
        </g>
      </g>

      {/* Tray drawn last so it sits in front — the arrow clips behind it. */}
      <path d={TRAY_PATH} />
    </svg>
  );
}
