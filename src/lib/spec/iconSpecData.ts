import type { IconSpec } from './types';

export const ICON_SPECS: IconSpec[] = [
  {
    id: 'favicon-ico',
    name: 'Browser Favicon (.ico)',
    filename: 'favicon.ico',
    acceptedDimensions: [
      { width: 16, height: 16 },
      { width: 32, height: 32 },
      { width: 48, height: 48 },
    ],
    format: 'ico',
    usedIn: 'Browser tab, bookmarks bar, browser history, Windows shortcuts',
    whyItMatters:
      'Missing or wrong-format .ico falls back to a generic globe/blank icon in older browsers and some non-Chromium tools that still look for /favicon.ico by convention.',
    industryStandard:
      'A single .ico container bundling 16×16, 32×32, and 48×48 layers — legacy browsers/Windows pick whichever embedded size fits the context.',
    priority: 'required',
    requireOpaque: true,
    previewMockup: 'bookmarksBar',
  },
  {
    id: 'favicon-32',
    name: 'Standard Favicon (small)',
    filename: 'favicon-32x32.png',
    acceptedDimensions: [{ width: 32, height: 32 }],
    format: 'png',
    usedIn: 'Modern browser tabs via <link rel="icon" sizes="32x32">',
    whyItMatters: 'The primary tab icon in every modern Chromium/Firefox browser.',
    industryStandard:
      "Google's SERP favicon spec: square, non-transparent, ideally a multiple of 48px — 32×32 is the browser-tab-specific size, separate from the SERP requirement.",
    priority: 'required',
    requireOpaque: true,
    previewMockup: 'browserTab',
  },
  {
    id: 'favicon-192',
    name: 'Standard Favicon (large)',
    filename: 'favicon-192x192.png',
    acceptedDimensions: [{ width: 192, height: 192 }],
    format: 'png',
    usedIn:
      'High-DPI browser tabs, Android home-screen shortcuts, and reused as the schema.org Organization/LocalBusiness "logo" field',
    whyItMatters:
      'Also frequently reused directly as the structured-data logo URL — a transparent or low-quality version here leaks into Google Knowledge Panel display too.',
    industryStandard:
      "Google's SERP favicon spec: square, non-transparent, minimum 48×48, ideally a multiple of 48px.",
    priority: 'required',
    requireOpaque: true,
    previewMockup: 'googleSerp',
  },
  {
    id: 'favicon-512',
    name: 'Standard Favicon (largest)',
    filename: 'favicon-512x512.png',
    acceptedDimensions: [{ width: 512, height: 512 }],
    format: 'png',
    usedIn: 'PWA manifest "any" purpose icon, high-resolution displays, app install prompts',
    whyItMatters: 'The largest fallback icon — used whenever the OS/browser wants a crisp, high-res mark.',
    industryStandard: 'Square, non-transparent, exactly 512×512 for manifest compliance.',
    priority: 'required',
    requireOpaque: true,
    previewMockup: 'none',
  },
  {
    id: 'apple-touch-icon',
    name: 'Apple Touch Icon',
    filename: 'apple-touch-icon.png',
    acceptedDimensions: [{ width: 180, height: 180 }],
    format: 'png',
    usedIn: 'iOS/iPadOS home-screen icon when a visitor adds the site to their home screen, Safari tab groups',
    whyItMatters:
      'iOS renders this file directly with no automatic background — a transparent PNG shows through to black (or whatever the home screen background is) behind the mark, which is very likely the exact bug this whole revamp is fixing.',
    industryStandard:
      "Apple's own Human Interface Guidelines: a full-bleed, opaque square (iOS applies its own rounded-corner mask on top) — never ship a transparent apple-touch-icon.",
    priority: 'required',
    requireOpaque: true,
    previewMockup: 'iosHomeScreen',
  },
  {
    id: 'manifest-icon-any',
    name: 'PWA Manifest Icon — "any" purpose',
    filename: 'icon-192x192.png / icon-512x512.png',
    acceptedDimensions: [
      { width: 192, height: 192 },
      { width: 512, height: 512 },
    ],
    format: 'png',
    usedIn: 'manifest.json icons array, purpose: "any" — Android/desktop PWA install icon, app switcher',
    whyItMatters: 'The flat, unmasked icon shown when the OS doesn\'t apply adaptive-icon shaping.',
    industryStandard: 'Full-bleed square PNG at 192×192 and 512×512, opaque background recommended.',
    priority: 'required',
    requireOpaque: true,
    previewMockup: 'none',
  },
  {
    id: 'manifest-icon-maskable',
    name: 'PWA Manifest Icon — "maskable" purpose',
    filename: 'icon-maskable-192x192.png / icon-maskable-512x512.png',
    acceptedDimensions: [
      { width: 192, height: 192 },
      { width: 512, height: 512 },
    ],
    format: 'png',
    usedIn:
      'manifest.json icons array, purpose: "maskable" — Android adaptive icons (the OS crops this into a circle, squircle, or rounded-square at install time)',
    whyItMatters:
      'Reusing the flat "any" file here (no padding) means the OS mask crops directly through the logo — this was a confirmed bug in a prior audit.',
    industryStandard:
      'W3C maskable-icon spec: keep all essential content inside the inner ~80% safe zone (a centered circle at 40% of the icon\'s total size) — the outer 20% ring may be clipped by any OS mask shape.',
    priority: 'required',
    requireOpaque: true,
    previewMockup: 'maskableSafeZone',
  },
  {
    id: 'og-image',
    name: 'Open Graph / Social Share Image',
    filename: 'og-image.png',
    acceptedDimensions: [{ width: 1200, height: 630 }],
    format: 'png',
    usedIn: 'Link previews on WhatsApp, Slack, iMessage, Facebook, LinkedIn, Discord — og:image / twitter:image',
    whyItMatters: 'The single biggest visual element in a shared link preview — directly affects click-through.',
    industryStandard:
      'Meta/Facebook + Twitter recommended size: exactly 1200×630px, under 8MB. This is a full design asset, not just the logo — the logo mark inside it should still follow the same white-bg-if-needed treatment for consistency.',
    priority: 'required',
    requireOpaque: false,
    previewMockup: 'socialCard',
  },
  {
    id: 'og-image-square',
    name: 'Open Graph Image — Square Variant',
    filename: 'og-image-square.png',
    acceptedDimensions: [{ width: 1200, height: 1200 }],
    format: 'png',
    usedIn:
      'Some platforms/contexts crop link previews to 1:1 instead of the 1200×630 landscape — having a purpose-built square avoids an awkward auto-crop',
    whyItMatters: 'Without this, some platforms center-crop the 1200×630 image, which can cut off the logo or headline.',
    industryStandard: '1200×1200px, same content-safety principles as the landscape OG image.',
    priority: 'nice-to-have',
    requireOpaque: false,
    previewMockup: 'socialCard',
  },
  {
    id: 'svg-favicon',
    name: 'SVG Favicon',
    filename: 'favicon.svg',
    acceptedDimensions: [],
    format: 'svg',
    usedIn: '<link rel="icon" type="image/svg+xml"> — modern Chromium/Firefox browser tabs',
    whyItMatters:
      'Renders crisp at any zoom level/DPI with zero raster upscaling artifacts, and can optionally auto-adapt to light/dark tab chrome via an embedded prefers-color-scheme media query.',
    industryStandard:
      'Increasingly treated as the primary favicon by modern browsers, with the PNG/ICO set kept only as a fallback for older browsers that don\'t support SVG favicons.',
    priority: 'nice-to-have',
    requireOpaque: false,
    previewMockup: 'browserTab',
  },
  {
    id: 'safari-pinned-tab',
    name: 'Safari Pinned Tab Icon',
    filename: 'safari-pinned-tab.svg',
    acceptedDimensions: [],
    format: 'svg',
    usedIn: '<link rel="mask-icon" href="..." color="#hex"> — legacy Safari "pin tab" feature',
    whyItMatters:
      'Deprecated by Apple in Safari 12 (2018) — modern Safari uses the regular favicon for pinned tabs, so mask-icon only still applies to older macOS Safari. Ship it only if you need that long tail; skipping it costs nothing on current browsers.',
    industryStandard:
      'Not a picture but a mask: Safari reads only the alpha channel and repaints the shape in the user\'s accent colour via the link tag\'s color attribute, so colour inside the file is ignored. Must be a single-colour SVG silhouette on a transparent background — the one slot here where transparency is required rather than disallowed, which usually means simplifying the logo to a shape that survives being flattened to one colour.',
    priority: 'nice-to-have',
    requireOpaque: false,
    previewMockup: 'none',
  },
];
