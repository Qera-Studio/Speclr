import { useId } from 'react';
import { displayDomain } from '@/lib/spec/displayDomain';

interface BrowserTabMockupProps {
  /** Uploaded favicon; when absent the tab shows an empty placeholder slot. */
  imageUrl?: string;
  alt: string;
  /** Tab title — the client/project name, falling back to a placeholder. */
  brandName?: string;
  /** Address-bar domain; falls back to a slugged brand name. */
  domain?: string;
}

/**
 * A realistic Chrome browser window showing the uploaded favicon in its active
 * tab. Rendered as an inline SVG (geometry lifted from a Figma export) with two
 * live spots: the favicon is the uploaded asset, the title is the client name.
 *
 * Theme-aware & background-less: every surface/text colour is driven by Tailwind
 * `fill-*` / `text-*` utilities mapped to theme tokens (card, muted, border,
 * foreground…), so the chrome recolours automatically in light vs. dark mode.
 * The window's traffic-light dots keep their real brand colours in both themes.
 *
 * All internal SVG ids are namespaced with a `useId()` prefix so several of
 * these can co-exist on one page without filter/clip-path collisions.
 */
export default function BrowserTabMockup({ imageUrl, alt, brandName, domain }: BrowserTabMockupProps) {
  const raw = useId();
  const uid = raw.replace(/:/g, ''); // ':' is invalid inside SVG url(#…) references
  const id = (name: string) => `${name}_${uid}`;

  const title = brandName?.trim() || 'Sample Brand';
  const url = displayDomain(brandName, domain);

  return (
    <svg
      viewBox="130 59 380 78"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${alt} shown in a browser tab`}
      preserveAspectRatio="xMinYMin meet"
      className="w-full text-foreground"
    >
      <defs>
        <clipPath id={id('barClip')}>
          <rect width="704" height="42" fill="white" transform="translate(130 59)" />
        </clipPath>
        <clipPath id={id('tabClip')}>
          <rect width="258" height="34" fill="white" transform="translate(214 67)" />
        </clipPath>
        <clipPath id={id('addrClip')}>
          <rect width="520" height="28" fill="white" transform="translate(238 105)" />
        </clipPath>
      </defs>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <g clipPath={`url(#${id('barClip')})`}>
        <path
          d="M130 75C130 69.3995 130 66.5992 131.09 64.4601C132.049 62.5785 133.578 61.0487 135.46 60.0899C137.599 59 140.399 59 146 59H818C823.601 59 826.401 59 828.54 60.0899C830.422 61.0487 831.951 62.5785 832.91 64.4601C834 66.5992 834 69.3995 834 75V101H130V75Z"
          className="fill-muted"
        />

        {/* Active tab */}
        <g clipPath={`url(#${id('tabClip')})`}>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M223 79.8C223 75.3196 223 73.0794 223.872 71.3681C224.639 69.8628 225.863 68.6389 227.368 67.8719C229.079 67 231.32 67 235.8 67H450.2C454.68 67 456.921 67 458.632 67.8719C460.137 68.6389 461.361 69.8628 462.128 71.3681C463 73.0794 463 75.3196 463 79.8V92C463 96.9706 467.029 101 472 101H463H223H214C218.971 101 223 96.9706 223 92V79.8Z"
            className="fill-card"
          />
          {/* Close (×) */}
          <path
            d="M449.97 79.9698C450.263 79.6769 450.737 79.6769 451.03 79.9698C451.323 80.2627 451.323 80.7375 451.03 81.0303L448.061 84.0001L451.03 86.9698C451.323 87.2627 451.323 87.7375 451.03 88.0303C450.737 88.3232 450.263 88.3232 449.97 88.0303L447 85.0606L444.03 88.0303C443.737 88.3232 443.263 88.3232 442.97 88.0303C442.677 87.7374 442.677 87.2627 442.97 86.9698L445.939 84.0001L442.97 81.0303C442.677 80.7374 442.677 80.2627 442.97 79.9698C443.263 79.6769 443.737 79.6769 444.03 79.9698L447 82.9395L449.97 79.9698Z"
            className="fill-muted-foreground/60"
          />
          {/* Tab title — the client / project name */}
          <text x="263" y="88" fontSize="12" fontFamily="Arial, sans-serif" className="fill-foreground">
            {title}
          </text>
          {/* Favicon — the uploaded asset, or an empty placeholder slot before
              a file is chosen. */}
          {imageUrl ? (
            <image href={imageUrl} x="235" y="76" width="16" height="16" preserveAspectRatio="xMidYMid meet" />
          ) : (
            <rect x="235" y="76" width="16" height="16" rx="3" className="fill-muted-foreground/20" />
          )}
        </g>

        {/* Window controls (traffic lights) — real brand colours in both themes */}
        <circle cx="197" cy="80" r="6" fill="#61C554" />
        <circle cx="197" cy="80" r="5.75" stroke="black" strokeOpacity="0.2" strokeWidth="0.5" />
        <circle cx="177" cy="80" r="6" fill="#F4BF4F" />
        <circle cx="177" cy="80" r="5.75" stroke="black" strokeOpacity="0.2" strokeWidth="0.5" />
        <circle cx="157" cy="80" r="6" fill="#ED6A5F" />
        <circle cx="157" cy="80" r="5.75" stroke="black" strokeOpacity="0.2" strokeWidth="0.5" />
      </g>

      {/* ── Toolbar (nav arrows + address bar) ──────────────────────────── */}
      <rect x="130" y="101" width="704" height="36" className="fill-card" />

      {/* Back arrow (active) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M152.017 112.957C151.717 112.671 151.243 112.683 150.957 112.983L145.957 118.233L145.882 118.324C145.684 118.612 145.709 119.007 145.957 119.267L150.957 124.517L151.039 124.592C151.327 124.817 151.745 124.803 152.017 124.543L152.092 124.461C152.317 124.173 152.303 123.755 152.043 123.483L148.25 119.5H157.75C158.164 119.5 158.5 119.164 158.5 118.75C158.5 118.336 158.164 118 157.75 118H148.25L152.043 114.017L152.114 113.931C152.324 113.633 152.29 113.217 152.017 112.957Z"
        className="fill-muted-foreground"
      />
      {/* Forward arrow (disabled) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M183.983 112.957C184.283 112.671 184.757 112.683 185.043 112.983L190.043 118.233L190.118 118.324C190.316 118.612 190.291 119.007 190.043 119.267L185.043 124.517L184.961 124.592C184.673 124.817 184.255 124.803 183.983 124.543L183.908 124.461C183.683 124.173 183.697 123.755 183.957 123.483L187.75 119.5H178.25C177.836 119.5 177.5 119.164 177.5 118.75C177.5 118.336 177.836 118 178.25 118H187.75L183.957 114.017L183.886 113.931C183.676 113.633 183.71 113.217 183.983 112.957Z"
        className="fill-muted-foreground/40"
      />
      {/* Reload */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M216 125.5C219.074 125.5 221.649 123.367 222.326 120.5H220.771C220.134 122.529 218.239 124 216 124C213.239 124 211 121.761 211 119C211 116.239 213.239 114 216 114C217.508 114 218.86 114.668 219.777 115.723L217.5 118H223V112.5L220.839 114.661C219.649 113.334 217.922 112.5 216 112.5C212.41 112.5 209.5 115.41 209.5 119C209.5 122.59 212.41 125.5 216 125.5Z"
        className="fill-muted-foreground"
      />

      {/* Address bar */}
      <g clipPath={`url(#${id('addrClip')})`}>
        <rect x="238" y="105" width="520" height="28" rx="14" className="fill-muted" />
        {/* Lock icon */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M253.5 116.5C253.5 115.119 254.619 114 256 114C257.381 114 258.5 115.119 258.5 116.5V117.5H259C259.552 117.5 260 117.948 260 118.5V123.5C260 124.052 259.552 124.5 259 124.5H253C252.448 124.5 252 124.052 252 123.5V118.5C252 117.948 252.448 117.5 253 117.5H253.5V116.5ZM257.5 117.5H254.5V116.5C254.5 115.672 255.172 115 256 115C256.828 115 257.5 115.672 257.5 116.5V117.5Z"
          className="fill-muted-foreground"
        />
        <text x="272" y="123" fontSize="12" fontFamily="Arial, sans-serif" className="fill-foreground/80">
          {url}
        </text>
      </g>
    </svg>
  );
}
