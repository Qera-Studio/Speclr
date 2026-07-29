import { useId } from 'react';
import { displayDomain } from '@/lib/spec/displayDomain';

/**
 * Real Google Search captures, exported from Figma in both themes.
 *
 * The pages are used as supplied except for the first result row, whose logo,
 * site name, URL and description were replaced with placeholders — the live
 * values below are drawn over those slots.
 *
 * The light capture is 2px taller than the dark one (2123 vs 2121) and every
 * row sits 2px lower with it, so each layer carries its own vertical offset.
 */
const PAGE_W = 1512;
const LAYERS = [
  {
    key: 'light',
    src: '/assets/mock-ups/serp-page-light.svg',
    h: 2123,
    dy: 2,
    cls: 'block dark:hidden',
    text: '#1F1F1F',
    muted: '#4D5156',
    chip: '#F1F3F4',
    link: '#1A0DAB',
  },
  {
    key: 'dark',
    src: '/assets/mock-ups/serp-page-dark.svg',
    h: 2121,
    dy: 0,
    cls: 'hidden dark:block',
    text: '#E8EAED',
    muted: '#9AA0A6',
    chip: '#303134',
    link: '#99C3FF',
  },
] as const;

/**
 * The first row's favicon chip.
 *
 * `cy` is the vertical centre of the name/URL block (glyphs span y 166-197), so
 * the mark sits level with the two lines rather than riding high against the
 * name alone.
 */
const CHIP = { cx: 217.859, cy: 181.5 };
const ICON = 36;

/**
 * Row-1 text anchors. `x` clears the 36px chip by 16px so the name and URL
 * aren't crowded against the mark.
 */
const TEXT = { x: 251.859, siteY: 176, urlY: 196, titleY: 236 };

/**
 * The zoom window, in page coordinates.
 *
 * The frame is 500x250 and the page is drawn at a third of its natural width
 * (the `object-cover` fit the flat <img> used), then zoomed 2.5x from the
 * top-left — so the visible slice is 605x302 page units starting at the origin.
 * That puts the first result row, at y≈166-240, comfortably inside it.
 */
const VIEW = { w: 605, h: 302 };

interface GoogleSerpMockupProps {
  /** Uploaded icon; when absent the chip shows a dashed placeholder. */
  imageUrl?: string;
  alt: string;
  /** Client/project name — the site name and the blue link title. */
  brandName?: string;
  /** Domain shown beside the favicon; falls back to a slugged brand name. */
  domain?: string;
}

/**
 * The uploaded favicon shown in a real Google results page.
 *
 * This is the surface `favicon-192` is judged on: Google clips the mark into a
 * circle, so a square logo with corner detail loses it, and a transparent PNG
 * picks up the page's own background rather than its own.
 *
 * Both captures render as sibling layers and CSS reveals the one matching the
 * theme — a referenced <image> can't inherit theme tokens from the page, so the
 * swap happens on the element.
 *
 * ids are namespaced with `useId()` so several instances can coexist without
 * clip-path collisions.
 */
export default function GoogleSerpMockup({ imageUrl, alt, brandName, domain }: GoogleSerpMockupProps) {
  const raw = useId();
  const uid = raw.replace(/:/g, ''); // ':' is invalid inside SVG url(#…) references

  const title = brandName?.trim() || 'Sample Brand';
  const url = displayDomain(brandName, domain);

  return (
    <svg
      viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
      className="h-full w-full"
      role="img"
      aria-label={`${alt} shown beside a Google search result`}
    >
      <defs>
        {LAYERS.map((l) => (
          // Google clips result favicons to a circle — a mark that looks correct
          // as a square can lose its corners entirely here.
          <clipPath key={l.key} id={`serpicon_${l.key}_${uid}`}>
            <circle cx={CHIP.cx} cy={CHIP.cy + l.dy} r={ICON / 2} />
          </clipPath>
        ))}
      </defs>

      {LAYERS.map((l) => (
        <g key={l.key} className={l.cls}>
          {/* The results page. Decorative: the row under review is re-stated as
              live text below, so the capture stays out of the a11y tree. */}
          <image href={l.src} x={0} y={0} width={PAGE_W} height={l.h} aria-hidden="true" />

          {imageUrl ? (
            <>
              {/* The tile Google draws behind the mark — what makes a
                  transparent favicon vanish into the page. */}
              <circle cx={CHIP.cx} cy={CHIP.cy + l.dy} r={ICON / 2} fill={l.chip} />
              <image
                href={imageUrl}
                x={CHIP.cx - ICON / 2}
                y={CHIP.cy + l.dy - ICON / 2}
                width={ICON}
                height={ICON}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#serpicon_${l.key}_${uid})`}
              />
            </>
          ) : null}

          {/* Site name and URL. The asset leaves this space empty, so no
              backing rect is needed — one would sit as a grey block behind the
              text and read as a rendering glitch. */}
          <text x={TEXT.x} y={TEXT.siteY + l.dy} fontSize="15" fontFamily="Arial, sans-serif" fill={l.text}>
            {title}
          </text>
          <text x={TEXT.x} y={TEXT.urlY + l.dy} fontSize="14" fontFamily="Arial, sans-serif" fill={l.muted}>
            {`https://${url}`}
          </text>

          {/* The blue link title. Google's own link colour in each theme rather
              than a card token — a SERP link is blue regardless of the surface
              it's previewed on. */}
          <text
            x={206}
            y={TEXT.titleY + l.dy}
            fontSize="24"
            fontFamily="Arial, Helvetica, sans-serif"
            fill={l.link}
          >
            {title.length > 34 ? `${title.slice(0, 33)}…` : title}
          </text>
        </g>
      ))}
    </svg>
  );
}
