import { useId } from 'react';

/**
 * Android launcher grid geometry. A 4-up row of neighbour tiles with the
 * uploaded icon in the second slot, so the mark is judged beside other icons
 * rather than in isolation — crowding and weight only show in company.
 */
const TILE = 56;
const PITCH = 78;
const ROW_Y = 24;
const START_X = 16;
const SLOT_INDEX = 1;

const NEIGHBOUR_TINTS = ['fill-muted-foreground/20', 'fill-muted-foreground/30', 'fill-muted-foreground/15'];

interface AndroidLauncherMockupProps {
  /** Uploaded icon; when absent the slot shows an empty placeholder. */
  imageUrl?: string;
  alt: string;
  /** App label under the icon — the client/project name. */
  brandName?: string;
  /**
   * Apply the OS adaptive-icon mask. The manifest "any" purpose is drawn flat
   * and full-bleed; "maskable" is shaped by the launcher. Showing both side by
   * side is the only way the distinction becomes legible.
   */
  masked?: boolean;
}

/**
 * An Android launcher row showing the uploaded manifest icon among neighbour
 * tiles.
 *
 * This is the surface the 512px and manifest "any" icons actually exist for —
 * a soft or upscaled mark shows worst here, at full size against a flat grid.
 *
 * ids are namespaced with `useId()` so several instances can coexist without
 * clip-path collisions.
 */
export default function AndroidLauncherMockup({
  imageUrl,
  alt,
  brandName,
  masked = false,
}: AndroidLauncherMockupProps) {
  const raw = useId();
  const uid = raw.replace(/:/g, ''); // ':' is invalid inside SVG url(#…) references
  const clipId = `launcher_${uid}`;

  const label = brandName?.trim() || 'Sample Brand';
  const slotX = START_X + SLOT_INDEX * PITCH;

  return (
    <svg
      viewBox={`0 0 ${START_X * 2 + PITCH * 3 + TILE} 118`}
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label={`${alt} shown in an Android launcher`}
    >
      <defs>
        {/* Android's adaptive-icon mask. Real launchers vary the shape per OEM;
            the rounded squircle is the AOSP default and the common case. */}
        <clipPath id={clipId}>
          <rect x={slotX} y={ROW_Y} width={TILE} height={TILE} rx={TILE * 0.28} />
        </clipPath>
      </defs>

      {/* Neighbour tiles — decorative, so hidden from assistive tech. */}
      {[0, 2, 3].map((i, n) => (
        <rect
          key={i}
          x={START_X + i * PITCH}
          y={ROW_Y}
          width={TILE}
          height={TILE}
          rx={TILE * 0.28}
          className={NEIGHBOUR_TINTS[n]}
          aria-hidden="true"
        />
      ))}

      {imageUrl ? (
        <image
          href={imageUrl}
          x={slotX}
          y={ROW_Y}
          width={TILE}
          height={TILE}
          preserveAspectRatio="xMidYMid slice"
          // "any" purpose icons are drawn exactly as authored — no OS shaping.
          clipPath={masked ? `url(#${clipId})` : undefined}
        />
      ) : (
        <>
          <rect
            x={slotX}
            y={ROW_Y}
            width={TILE}
            height={TILE}
            rx={masked ? TILE * 0.28 : 0}
            className="fill-muted-foreground/15"
          />
          <rect
            x={slotX}
            y={ROW_Y}
            width={TILE}
            height={TILE}
            rx={masked ? TILE * 0.28 : 0}
            fill="none"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            className="stroke-muted-foreground/40"
          />
        </>
      )}

      <text
        x={slotX + TILE / 2}
        y={ROW_Y + TILE + 16}
        textAnchor="middle"
        fontSize="11"
        fontFamily='Roboto, "Helvetica Neue", system-ui, sans-serif'
        fill="currentColor"
        className="text-foreground"
      >
        {label.length > 12 ? `${label.slice(0, 11)}…` : label}
      </text>
    </svg>
  );
}
