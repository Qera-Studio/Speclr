import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOGUE, DECISIONS, entryOf, FIRST_ENTRY, SECTIONS } from '../catalogue';

/**
 * The library's index: which components it holds and how a URL names one.
 *
 * Pure, and tested apart from the page, because the failure that matters here
 * is silent. A `?component=` naming nothing has to land somewhere rather than
 * render an empty pane, and a slug that stops matching its entry breaks a
 * bookmark without breaking a render, which is the kind of thing a screenshot
 * review never catches.
 */

describe('the catalogue', () => {
  it('names each component with a slug that can sit in a URL', () => {
    for (const entry of CATALOGUE) {
      expect(entry.slug).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('gives every component a distinct slug', () => {
    const slugs = CATALOGUE.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  /**
   * Every entry says where the component lives and where its rule is written,
   * because a gallery that shows a component without either is a picture. The
   * whole point of this page is to be the way back to the source and the rule.
   */
  it('points every component at its file and its rule', () => {
    for (const entry of CATALOGUE) {
      expect(entry.source).toMatch(/^(?:src\/.+\.(?:tsx?|css)|docs\/design\.md)$/);
      expect(entry.rule).toMatch(/^§\d/);
    }
  });

  it('gives every component at least one variant to look at', () => {
    for (const entry of CATALOGUE) {
      expect(entry.variants.length).toBeGreaterThan(0);
    }
  });

  it('gives every variant a distinct name within its component', () => {
    for (const entry of CATALOGUE) {
      const names = entry.variants.map((variant) => variant.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

/**
 * The two pointers every entry carries have to still point at something.
 *
 * This is the rule that makes the library a source of truth rather than a page
 * about one. A catalogue naming a file that was renamed, or a section of
 * `docs/design.md` that was renumbered, is worse than no catalogue: it sends
 * the next reader somewhere that no longer exists, and nothing about the page
 * looks broken while it does. Both are one-line edits somebody makes without
 * ever opening this folder, which is precisely `CONTEXT.md` §5e's argument for
 * enforcing rather than writing a rule down.
 */
describe('the pointers stay true', () => {
  const root = join(__dirname, '..', '..', '..', '..');

  it('names a source file that exists', () => {
    for (const entry of CATALOGUE) {
      expect(existsSync(join(root, entry.source))).toBe(true);
    }
  });

  it('names a section that is actually in the design doc', () => {
    const design = readFileSync(join(root, 'docs/design.md'), 'utf8');
    for (const entry of CATALOGUE) {
      // The heading itself, e.g. '### 2.10 Pagination'. Matching the bare
      // number would pass against any cross-reference in the prose.
      expect(design).toMatch(new RegExp(`^#{2,3} ${entry.rule.slice(1)}[.\\s]`, 'm'));
    }
  });

  /**
   * **The library shows the real component, never a copy of one.**
   *
   * The whole claim of this page is that what is on it is what ships, which
   * holds only while it imports the primitive rather than reproducing it. A
   * local re-implementation would make the library a second place for the
   * component to be decided, and the first symptom would be the library looking
   * right while the app did not.
   */
  it('renders the real primitive rather than a copy of it', () => {
    /*
      Every file in the library folder, not a named few.

      The list was `Specimen.tsx` alone while a pager was the only entry, then
      two files when the drawer's specimens needed state of their own, and a
      third arrived with the buttons. A hand-kept list of the files that hold
      specimens is the same kind of second place to forget that this whole
      page exists to remove, and it fails *open*: a component whose specimens
      move to a new file would go unchecked rather than loudly wrong.

      What is being guarded is "the library imports the real primitive
      somewhere", never which file it sits in.

      **And that is the whole of its strength**, stated so nobody reads it as
      more. It cannot tell *which* file uses the import, so a component the
      library also happens to use as furniture (Button, which every specimen
      row is built from) would satisfy it even if that entry's specimens were
      stubbed. It catches the failure it was written for, a catalogue row
      pointing at a file the page never imports, and nothing subtler.

      The subtler half is covered per component instead, where it can be: the
      button page's fills and heights are keyed by the primitive's own union
      type, so falling behind it fails the typecheck.
    */
    const dir = join(__dirname, '..');
    const source = readdirSync(dir)
      .filter((file) => file.endsWith('.tsx') || file.endsWith('.ts'))
      .map((file) => readFileSync(join(dir, file), 'utf8'))
      .join('\n');

    /*
      One exemption: an entry whose source is inside the library folder is an
      experiment, a fork taken on purpose so a design can change without the
      app moving with it (`library/drawer/`). It is not a primitive the page
      could import instead, and it is deleted when the experiment ends.
    */
    for (const entry of CATALOGUE.filter((e) => /^src\/components\/.+\.tsx?$/.test(e.source) && !e.source.startsWith('src/components/design/'))) {
      const module = entry.source.replace(/^src\//, '@/').replace(/\.tsx?$/, '');
      // Either quote: a formatter rewriting `'` to `"` is not a component
      // going missing, and a guard that goes red for it teaches people to
      // ignore it.
      expect(source).toMatch(new RegExp(`from ['"]${module.replace(/\//g, '\\/')}['"]`));
    }
  });
});

describe('resolving a component from the URL', () => {
  it('finds the entry a slug names', () => {
    expect(entryOf('pagination').slug).toBe('pagination');
  });

  /**
   * A URL is somebody else's text: a stale bookmark, a typo, a renamed slug.
   * It reads as "nothing chosen", which is the first entry, never as an empty
   * pane the reader has no way out of.
   */
  it('falls back to the first entry for a slug that names nothing', () => {
    expect(entryOf('does-not-exist')).toBe(FIRST_ENTRY);
    expect(entryOf(undefined)).toBe(FIRST_ENTRY);
    expect(entryOf('')).toBe(FIRST_ENTRY);
  });
});
