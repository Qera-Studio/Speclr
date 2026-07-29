import { useId } from 'react';

const BASE = '/assets/mock-ups/safari-pinned';

/**
 * Pinned tab circles: 30x28 at 33.636px pitch, y=59.5.
 *
 * The export clips each icon with `rx=14` on a 28-tall rect — i.e. fully round,
 * not the rounded-rect the background uses. Safari draws pinned tabs as circles,
 * so the clip radius is half the height and must stay derived from it.
 *
 * `startX` is 10 rather than the export's 20: at this preview's scale the
 * export's inset became a wide gap before the first tab.
 */
const TAB = { w: 30, h: 28, y: 59.5, pitch: 33.6364, startX: 10 };
const TAB_RADIUS = TAB.h / 2;

/** The icon inside each circle — 10.777x16, derived so it centres exactly. */
const TAB_ICON = { w: 10.7769, h: 16, y: 65.5, offsetX: (TAB.w - 10.7769) / 2 };

/**
 * The 10 sample pinned tabs that follow the uploaded one. Kept deliberately —
 * a pinned tab is only judged in the company of others, since the question is
 * whether yours stays recognisable at this size beside real sites' icons.
 */
const SAMPLE_TABS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/**
 * Toolbar row above the tabs: sidebar toggle, divider, chevron.
 *
 * Every x is derived from `TAB.startX` so the sidebar icon shares its left edge
 * with the first pinned tab — the two sit in the same optical column, and
 * hand-placing them drifted out of alignment.
 */
const TOOLBAR = { y: 0, h: 52 };
/**
 * Toolbar spacing. The preview renders ~2.64x (250 viewBox units across a ~660px
 * card), so `px()` converts a screen-pixel gap into viewBox units — the design
 * is specified in what the eye sees, not in raw units.
 */
const PREVIEW_SCALE = 660 / 250;
const px = (screenPx: number) => screenPx / PREVIEW_SCALE;

// The tab circle is 28 across but sits in a 30-wide cell, so its visible left
// edge is 1 unit in from `startX`. The sidebar icon is nudged 2px right of that
// to sit optically level with the circle rather than flush to its bounding box.
const TAB_VISUAL_LEFT = TAB.startX + (TAB.w - TAB.h) / 2;
const SIDEBAR_ICON = { x: TAB_VISUAL_LEFT + px(2), y: 20, w: 12, h: 12 };
const DIVIDER_X = SIDEBAR_ICON.x + SIDEBAR_ICON.w + 8;
/** Chevron sits to the RIGHT of the divider, as in the design. */
const CHEVRON_X = DIVIDER_X + 7;
const CHEVRON_W = 6;

/** The window panel — toolbar plus the pinned-tab row beneath it. */
const PANEL_PAD = 7.5;
const PANEL = {
  x: 0,
  y: TOOLBAR.y,
  w: 390,
  h: TAB.y + TAB.h + PANEL_PAD,
  r: 8,
};

interface SafariPinnedTabMockupProps {
  /** Uploaded icon; when absent the first tab shows an empty placeholder. */
  imageUrl?: string;
  alt: string;
  /** Site name — unused in the tab row, kept for dispatcher symmetry. */
  brandName?: string;
}

function tabX(index: number) {
  return TAB.startX + index * TAB.pitch;
}

/**
 * Safari's window chrome with the uploaded icon as the first pinned tab.
 *
 * Rendered in full colour on purpose. The monochrome `mask-icon` silhouette was
 * deprecated in Safari 12 (2018); modern Safari uses the regular favicon and
 * keeps its colour, which is what you see in the browser today. Simulating the
 * old mask here would misrepresent current behaviour.
 *
 * Geometry lifted from `safari-pinned-icon-preview.svg` — the sidebar toggle and
 * the circular pinned-tab strip. The back arrow and address bar are deliberately
 * omitted: they carry no information about the icon, and the URL duplicated what
 * the browser-tab mockup already shows. The chrome is redrawn with theme tokens
 * so it belongs to the card in light and dark; only the sample tab icons stay
 * raster, since they're real artwork.
 *
 * ids are namespaced with `useId()` so several instances can coexist without
 * clip-path collisions.
 */
export default function SafariPinnedTabMockup({ imageUrl, alt }: SafariPinnedTabMockupProps) {
  const raw = useId();
  const uid = raw.replace(/:/g, ''); // ':' is invalid inside SVG url(#…) references
  const id = (name: string) => `${name}_${uid}`;

  // Framed on the window's left portion — the export is 1449px wide, but the
  // toolbar controls and the whole pinned-tab row live in the leftmost ~390px.
  // 250 units across a ~660px card is ~2.6x, large enough to judge an icon at
  // pinned-tab size while still showing several neighbours for comparison.
  const viewBox = `-70 ${PANEL.y} 250 ${PANEL.h}`;

  return (
    <svg viewBox={viewBox} className="h-auto w-full" role="img" aria-label={`${alt} shown as a Safari pinned tab`}>
      <defs>
        {/* Each tab clips its icon to a circle, as in the export. */}
        {[1, ...SAMPLE_TABS].map((n, i) => (
          <clipPath key={n} id={id(`tab${i}`)}>
            <rect x={tabX(i)} y={TAB.y} width={TAB.w} height={TAB.h} rx={TAB_RADIUS} />
          </clipPath>
        ))}
      </defs>

      {/* Window panel */}
      <rect
        x={PANEL.x}
        y={PANEL.y}
        width={PANEL.w}
        height={PANEL.h}
        rx={PANEL.r}
        className="fill-muted/60 stroke-border"
        strokeWidth="1"
      />

      {/* ---- Toolbar row ---- */}
      <g aria-hidden="true">
        {/* Sidebar toggle — left-aligned with the first pinned tab below. */}
        <rect
          x={SIDEBAR_ICON.x}
          y={SIDEBAR_ICON.y}
          width={SIDEBAR_ICON.w}
          height={SIDEBAR_ICON.h}
          rx="2.5"
          fill="none"
          strokeWidth="1.2"
          className="stroke-muted-foreground/70"
        />
        <line
          x1={SIDEBAR_ICON.x + 4.5}
          y1={SIDEBAR_ICON.y}
          x2={SIDEBAR_ICON.x + 4.5}
          y2={SIDEBAR_ICON.y + SIDEBAR_ICON.h}
          strokeWidth="1.2"
          className="stroke-muted-foreground/70"
        />

        {/* Divider */}
        <line x1={DIVIDER_X} y1="18" x2={DIVIDER_X} y2="34" strokeWidth="0.8" className="stroke-border" />

        {/* Chevron-down — right of the divider */}
        <path
          d={`M${CHEVRON_X} 24.5 L${CHEVRON_X + CHEVRON_W / 2} 27.5 L${CHEVRON_X + CHEVRON_W} 24.5`}
          fill="none"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-muted-foreground/70"
        />

      </g>

      {/* ---- Pinned tab row ---- */}
      {/* The uploaded icon's pinned tab — first in the row, and active. */}
      <circle
        cx={tabX(0) + TAB.w / 2}
        cy={TAB.y + TAB_RADIUS}
        r={TAB_RADIUS}
        className="fill-background stroke-border"
        strokeWidth="1"
      />
      <g clipPath={`url(#${id('tab0')})`}>
        {imageUrl ? (
          <image
            href={imageUrl}
            x={tabX(0) + TAB_ICON.offsetX}
            y={TAB_ICON.y}
            width={TAB_ICON.w}
            height={TAB_ICON.h}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <rect
            x={tabX(0) + TAB_ICON.offsetX}
            y={TAB_ICON.y}
            width={TAB_ICON.w}
            height={TAB_ICON.h}
            rx="2"
            fill="none"
            strokeWidth="1"
            strokeDasharray="3 2"
            className="stroke-muted-foreground/50"
          />
        )}
      </g>

      {/* Sample pinned tabs — decorative context, hidden from assistive tech. */}
      {SAMPLE_TABS.map((n, i) => {
        const x = tabX(i + 1);
        return (
          <g key={n} aria-hidden="true">
            <circle
              cx={x + TAB.w / 2}
              cy={TAB.y + TAB_RADIUS}
              r={TAB_RADIUS}
              className="fill-muted-foreground/10"
            />
            <g clipPath={`url(#${id(`tab${i + 1}`)})`}>
              <image
                href={`${BASE}/tab${n}.png`}
                x={x + TAB_ICON.offsetX}
                y={TAB_ICON.y}
                width={TAB_ICON.w}
                height={TAB_ICON.h}
                preserveAspectRatio="xMidYMid meet"
              />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
