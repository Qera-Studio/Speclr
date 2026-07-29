import { useId } from 'react';

const BASE = '/assets/mock-ups/ios-home';

/**
 * Device geometry, lifted from the vector `iPhone-mockup.svg` export.
 *
 * That file draws the hardware as real paths — body, bezel, screen, Dynamic
 * Island, camera lens and four side buttons — rather than baking a photo of a
 * phone into a raster. The shapes are reused verbatim; only the finish changes:
 * the export's metallic multi-stop gradients (#554C5E body, 14-stop chrome
 * buttons) are replaced with flat theme tokens so the device recolours with the
 * card in light and dark, matching `BrowserTabMockup`.
 */
const BODY = { x: 134, y: 79, w: 431, h: 890, r: 74 };
const BEZEL = { x: 140, y: 85, w: 419, h: 878, r: 68 };
const SCREEN = { x: 153, y: 98, w: 393, h: 852, r: 55 };
const ISLAND = { x: 288, y: 109, w: 125, h: 38, r: 19 };

/** Side buttons, verbatim from the export — volume trio left, power right. */
const BUTTON_PATHS = [
  'M131 252C131 250.895 131.895 250 133 250H134V284H133C131.895 284 131 283.105 131 282V252Z',
  'M131 316C131 314.895 131.895 314 133 314H134V382H133C131.895 382 131 381.105 131 380V316Z',
  'M131 402C131 400.895 131.895 400 133 400H134V468H133C131.895 468 131 467.105 131 466V402Z',
  'M564 361H566C567.105 361 568 361.895 568 363V466C568 467.105 567.105 468 566 468H564V361Z',
];

/**
 * App grid: 63px icons, 90.6px pitch, rows at y=185.985 and y=284.069.
 *
 * Row 2 holds only the uploaded icon. The export had a second tile beside it
 * standing in for the upload; that slot is live now, so the placeholder is gone.
 */
const ICON = 63;
const NEIGHBOUR_APPS = [
  { src: `${BASE}/app0.png`, x: 182.328, y: 185.985 },
  { src: `${BASE}/app1.png`, x: 272.92, y: 185.985 },
  { src: `${BASE}/app2.png`, x: 363.512, y: 185.985 },
  { src: `${BASE}/app3.png`, x: 454.104, y: 185.985 },
];

/** The uploaded icon's slot — row 2, column 1 (clip4 in the export). */
const SLOT = { x: 182.328, y: 284.069, size: ICON };

interface IOSHomeScreenMockupProps {
  /** Uploaded icon; when absent the slot shows an empty placeholder. */
  imageUrl?: string;
  alt: string;
  /** App label under the icon — the client/project name. */
  brandName?: string;
}

/**
 * An iPhone home screen showing the uploaded apple-touch-icon among real app
 * icons — the context that reveals the bug this slot exists to catch: iOS
 * applies no background of its own, so a transparent PNG shows the wallpaper
 * through the mark.
 *
 * The uploaded icon is masked with iOS's squircle radius, matching how the real
 * OS clips it — an icon that looks fine square can lose corner detail.
 *
 * ids are namespaced with `useId()` so several instances can coexist without
 * clip-path collisions.
 */
export default function IOSHomeScreenMockup({ imageUrl, alt, brandName }: IOSHomeScreenMockupProps) {
  const raw = useId();
  const uid = raw.replace(/:/g, ''); // ':' is invalid inside SVG url(#…) references
  const id = (name: string) => `${name}_${uid}`;

  const label = brandName?.trim() || 'Sample Brand';

  // Framed on the top of the device — the export's phone is 890px tall, far more
  // than the icon grid needs. Cropping to the grid keeps the icons legible in a
  // card-sized preview; the bottom fades out in the card rather than cutting.
  const viewBox = `${BODY.x - 12} ${BODY.y - 12} ${BODY.w + 24} 330`;

  return (
    <svg
      viewBox={viewBox}
      className="h-auto w-full max-w-[320px]"
      role="img"
      aria-label={`${alt} shown on an iOS home screen`}
      // The device is cropped mid-body, so it must fade out at the bottom rather
      // than terminating flat. The fade lives here, not on the card's preview
      // area: this svg is h-auto and shorter than that container, so a mask
      // spanning the container resolves in empty space below the phone.
      style={{
        maskImage: 'linear-gradient(to bottom, black 78%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 78%, transparent)',
      }}
    >
      <defs>
        <clipPath id={id('screen')}>
          <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} rx={SCREEN.r} />
        </clipPath>
        {/* iOS squircle. The real mask is a superellipse; a ~22% radius is the
            standard approximation and close enough to judge corner crowding. */}
        <clipPath id={id('squircle')}>
          <rect x={SLOT.x} y={SLOT.y} width={SLOT.size} height={SLOT.size} rx={SLOT.size * 0.22} />
        </clipPath>
      </defs>

      {/* Side buttons — under the body so they read as protruding from it. */}
      {BUTTON_PATHS.map((d, i) => (
        <path key={i} d={d} className="fill-muted-foreground/45" aria-hidden="true" />
      ))}

      {/* Device body + bezel. Flat fills replace the export's metallic gradients. */}
      <rect
        x={BODY.x}
        y={BODY.y}
        width={BODY.w}
        height={BODY.h}
        rx={BODY.r}
        className="fill-muted stroke-border"
        strokeWidth="1.5"
      />
      <rect
        x={BEZEL.x}
        y={BEZEL.y}
        width={BEZEL.w}
        height={BEZEL.h}
        rx={BEZEL.r}
        className="fill-muted-foreground/25"
      />

      <g clipPath={`url(#${id('screen')})`}>
        {/* Wallpaper — the card's own surface, so icons sit on its palette. */}
        <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} className="fill-background" />

        {/* Neighbouring apps — decorative, so hidden from assistive tech. */}
        {NEIGHBOUR_APPS.map((app, i) => (
          <image key={i} href={app.src} x={app.x} y={app.y} width={ICON} height={ICON} aria-hidden="true" />
        ))}

        {/* The uploaded icon, clipped to the iOS squircle. Before upload the
            slot shows a dashed placeholder so the template still reads. */}
        <g clipPath={`url(#${id('squircle')})`}>
          {imageUrl ? (
            <image
              href={imageUrl}
              x={SLOT.x}
              y={SLOT.y}
              width={SLOT.size}
              height={SLOT.size}
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <>
              <rect
                x={SLOT.x}
                y={SLOT.y}
                width={SLOT.size}
                height={SLOT.size}
                className="fill-muted-foreground/15"
              />
              <rect
                x={SLOT.x}
                y={SLOT.y}
                width={SLOT.size}
                height={SLOT.size}
                fill="none"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                className="stroke-muted-foreground/40"
              />
            </>
          )}
        </g>

        {/* App label. iOS draws this white over the wallpaper, but here the
            "wallpaper" is the card's own surface — so it follows the theme
            foreground to stay legible in both light and dark. */}
        <text
          x={SLOT.x + SLOT.size / 2}
          y={SLOT.y + SLOT.size + 14}
          textAnchor="middle"
          fontSize="12"
          // SF Pro explicitly — `system-ui` alone inherits the app's Geist in
          // some engines, and the label should look like iOS, not like speclr.
          fontFamily='-apple-system, "SF Pro Text", "SF Pro Display", BlinkMacSystemFont, system-ui, sans-serif'
          fontWeight="500"
          letterSpacing="-0.1"
          fill="currentColor"
          className="text-foreground"
        >
          {label.length > 12 ? `${label.slice(0, 11)}…` : label}
        </text>

        {/* Dynamic Island — always dark, like real hardware. It is a physical
            cutout, not themed chrome, so it must not invert to white in dark
            mode the way `fill-foreground` did. */}
        <rect x={ISLAND.x} y={ISLAND.y} width={ISLAND.w} height={ISLAND.h} rx={ISLAND.r} fill="#101014" />
        {/* Camera lens */}
        <circle cx="394" cy="128" r="6" fill="#2A2A32" />
      </g>
    </svg>
  );
}
