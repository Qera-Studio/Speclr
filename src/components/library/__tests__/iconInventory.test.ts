import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { collect } from '../../../../scripts/icon-inventory';
import { ICON_USES } from '../iconInventory.generated';
import { ANIMATED_ICONS } from '../IconSpecimens';

/**
 * The icon gallery claims to show **every** icon in the app, and this is what
 * makes that claim true rather than true on the day it was written.
 *
 * A hand-kept icon list fails the worst way there is: silently, and invisibly
 * to review. Somebody adds an icon, never opens the library, and the page goes
 * on looking complete while being one short. Nothing about it looks broken, and
 * a reader has no way to tell a complete list from a stale one by looking at
 * it. So the list is generated and this re-walks the tree to check it.
 */
describe('the icon inventory', () => {
  const walked = collect();

  it('matches the source tree exactly', () => {
    const generated = ICON_USES.map(([name, files]) => `${name} ${files}`);
    const actual = walked.map((icon) => `${icon.name} ${icon.files}`);

    // Named rather than asserted as a bare equality, because the useful part of
    // this failure is *which* icon moved. "Run npx tsx scripts/icon-inventory.ts"
    // is the whole fix.
    expect(actual).toEqual(generated);
  });

  it('finds a plausible number of icons', () => {
    // A floor, not a fixed count: the point is that the walk still walks. A
    // regex that stops matching returns zero and every other assertion here
    // passes vacuously, which is how a guard like this dies unnoticed.
    expect(walked.length).toBeGreaterThan(50);
  });

  /**
   * The walk must not mistake a neighbouring import for an icon.
   *
   * It did, on the first pass: a greedy brace body ran past its own closing
   * brace into the next statement and reported `useEffect`, `useForm` and
   * `usePathname` as icons. They render as nothing, so the page would have
   * shown a handful of blank cells with React hook names under them.
   */
  it('reports only icons, never a neighbouring import', () => {
    const names = walked.map((icon) => icon.name);
    for (const notAnIcon of ['useState', 'useEffect', 'useForm', 'usePathname', 'cn']) {
      expect(names).not.toContain(notAnIcon);
    }
    // Every name is a component: PascalCase, no whitespace, no quotes.
    for (const name of names) {
      expect(name).toMatch(/^[A-Z][A-Za-z0-9]*$/);
    }
  });
});

/**
 * The animated half cannot be generated, so it is pinned instead.
 *
 * Motion lives in the component that uses an icon, not in the icon: the same
 * `Plus` is still in a table and turns on a drop zone. There is no property of
 * an icon to read. What can be checked is that every entry still describes
 * something real, which is what stops this list becoming a museum of motion
 * that was deleted two refactors ago.
 */
describe('the animated icons', () => {
  const root = join(__dirname, '..', '..', '..', '..');

  it('names a file that exists', () => {
    for (const icon of ANIMATED_ICONS) {
      expect(existsSync(join(root, icon.source))).toBe(true);
    }
  });

  /**
   * **The claim is checked against the file, not just asserted.**
   *
   * Each entry carries the exact string its motion is written as, and this
   * greps for it. Delete the rotation from `add-button.tsx` and this goes red,
   * rather than the gallery going on describing a quarter-turn that no longer
   * happens.
   */
  it('still finds the motion it describes, in the file it names', () => {
    for (const icon of ANIMATED_ICONS) {
      const source = readFileSync(join(root, icon.source), 'utf8');
      expect(source).toContain(icon.proof);
    }
  });

  it('gives every entry a distinct name', () => {
    const names = ANIMATED_ICONS.map((icon) => icon.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
