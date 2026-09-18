import manifest from '../app/manifest';

/**
 * The web app manifest, which is what makes speclr installable as a Mac app.
 *
 * Safari's "Add to Dock" and Chrome's "Install" both read this file and write a
 * real `.app` bundle into `~/Applications`, which Finder shows and Spotlight
 * indexes. Without it both browsers still offer to make a shortcut, but it
 * opens in a tab with the browser's chrome and takes its name from whatever
 * page happened to be open.
 *
 * Asserted rather than assumed for the reason `security-headers.test.ts` gives:
 * a manifest fails silently. Delete a field and nothing errors, no page breaks
 * and no warning prints; the install just quietly comes out wrong, and the only
 * way to notice is to uninstall and reinstall the app.
 *
 * These read the real route rather than a copy. A duplicated expected object
 * would pass forever after somebody edited only one of the two.
 */
describe('the web app manifest', () => {
  /**
   * `standalone` is the whole point of installing it: the window loses the
   * address bar and the tab strip and becomes an app window. `browser` would
   * make the install a bookmark with extra steps.
   */
  it('opens in its own window rather than a browser tab', () => {
    expect(manifest().display).toBe('standalone');
  });

  /**
   * The name is fixed here rather than inherited from the page.
   *
   * Left to the browser, an installed app takes the `<title>` of whatever was
   * open when it was installed, so the same app lands in `/Applications` as
   * "speclr", "Dashboard" or "Clients" depending on the moment. `layout.tsx`
   * already pins `appleWebApp.title` for the same reason; this is its
   * counterpart for every other browser.
   */
  it('names itself, so the installed app is not named after a page', () => {
    expect(manifest().name).toBe('speclr');
    expect(manifest().short_name).toBe('speclr');
  });

  /**
   * It opens on the app's own root, which redirects to whichever profile you
   * were last on (`speclr_profile`). Deliberately not a profile path: the
   * installed app must not hard-code the side of the app you happened to be
   * looking at on the day you installed it.
   */
  it('starts at the root, which resumes the profile you were on', () => {
    expect(manifest().start_url).toBe('/');
  });

  /**
   * Two icons, which is the pair every installer wants: 192 for the Dock and
   * the app list, 512 for Launchpad and the high-density rendering macOS does
   * of both.
   *
   * `maskable` is deliberately absent. It is an Android adaptive-icon concept
   * and declaring it lets the platform crop the mark to a circle or a squircle;
   * a wordmark cropped that way loses its ends. macOS does not ask for it.
   */
  it('carries the two icon sizes an installer looks for', () => {
    const sizes = (manifest().icons ?? []).map((i) => i.sizes);

    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect((manifest().icons ?? []).every((i) => i.purpose !== 'maskable')).toBe(true);
  });

  /**
   * Every icon is a real file under `public/`, not a path somebody typed.
   *
   * This is the assertion that actually earns its keep. A manifest pointing at
   * a missing icon installs *successfully* and puts a blank tile in the Dock,
   * which is both the most likely mistake here and the one nothing else
   * catches.
   */
  it('points every icon at a file that exists', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { existsSync } = require('node:fs') as typeof import('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { join } = require('node:path') as typeof import('node:path');

    for (const icon of manifest().icons ?? []) {
      expect(existsSync(join(__dirname, '..', '..', 'public', icon.src))).toBe(true);
    }
  });

  /**
   * It stays out of search, exactly as `layout.tsx` does.
   *
   * A manifest is a public, unauthenticated file: it is fetched before sign-in
   * and is the one description of this app a crawler can read. speclr is an
   * internal tool holding financial and legal documents, so its description
   * says nothing about what is inside it, matching the deliberately bland
   * `description: 'Internal tool.'` in the root layout.
   */
  it('describes itself as blandly as the page metadata does', () => {
    expect(manifest().description).toBe('Internal tool.');
  });
});
