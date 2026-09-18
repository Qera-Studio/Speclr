import type { MetadataRoute } from 'next';

/**
 * The web app manifest, which is what makes speclr installable.
 *
 * Safari's "Add to Dock" and Chrome's "Install" both read this and write a real
 * `.app` bundle into `~/Applications`: Finder shows it, Spotlight indexes it,
 * Launchpad lists it, and it gets its own Dock icon and its own Cmd-Tab entry.
 * Without this file both browsers still offer a shortcut, but it opens in a tab
 * with the browser's chrome and takes its name from whichever page was open.
 *
 * **It is still a web app, and that is the honest framing.** Every page here is
 * a Server Component reading Neon, so the installed app is a window pointed at
 * a URL: it needs the network and it needs the deployment up. What installing
 * buys is the window, the icon and the launcher entry, not offline access.
 *
 * Asserted in `src/__tests__/manifest.test.ts`, because a manifest fails
 * silently: delete a field and nothing errors, no page breaks, and the install
 * simply comes out wrong.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // Fixed here rather than inherited. Left to the browser an installed app
    // takes the `<title>` of whatever was open when it was installed, so the
    // same app lands in `/Applications` as "speclr", "Dashboard" or "Clients".
    // `layout.tsx` pins `appleWebApp.title` for Safari; this is the rest.
    name: 'speclr',
    short_name: 'speclr',
    // The same deliberately bland line as the root layout, and for the same
    // reason. A manifest is public and unauthenticated: it is fetched before
    // sign-in and is the one description of this app a crawler can read.
    description: 'Internal tool.',
    // The app's own root, which resumes whichever profile you were last on via
    // the `speclr_profile` cookie. Deliberately not `/client` or `/admin`: the
    // installed app must not hard-code the side you happened to be on when you
    // installed it.
    start_url: '/',
    // The point of installing: no address bar, no tab strip, an app window.
    display: 'standalone',
    /*
      No `theme_color` and no `background_color`, deliberately, and for exactly
      the reason `layout.tsx` gives for having no `themeColor`.

      Both fields take a colour *string*, not a CSS variable, so either one is a
      second copy of `--background` in hex with nothing to keep it in step the
      day the palette moves. `design-tokens.test.ts` refuses hex literals for
      that reason. Worse here than there: these two would need *two* copies,
      since the value differs between light and dark and a manifest cannot
      express a media query.

      What they would have bought is the colour macOS paints the window for the
      instant before the app renders. `color-scheme` in `globals.css` already
      answers that in both themes, which is the same thing that made the
      `themeColor` decision cheap.
    */
    icons: [
      // 192 for the Dock and the app list, 512 for Launchpad and the
      // high-density rendering macOS does of both.
      //
      // No `maskable` icon: it is an Android adaptive-icon concept, and
      // declaring it lets the platform crop the mark to a circle or a
      // squircle. macOS never asks for one, and a wordmark cropped that way
      // loses its ends.
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
