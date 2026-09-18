/**
 * Walks the app and reports every icon it imports.
 *
 * The icon page in the component library is a *generated* inventory, and this
 * is what generates it. The alternative was a hand-written list, which is the
 * one thing that page must not be: an icon gallery maintained by hand is a
 * gallery that is wrong the first time somebody adds an icon and does not think
 * to open it, and a reader has no way to tell a complete list from a stale one
 * by looking at it.
 *
 * So the list lives in `iconInventory.generated.ts`, this script writes it, and
 * `__tests__/iconInventory.test.ts` re-runs the walk and fails while the
 * checked-in file disagrees with the source tree. Adding an icon without
 * regenerating is a red build rather than a quietly incomplete page.
 *
 *     npx tsx scripts/icon-inventory.ts
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

/** Where the generated list is written. */
export const GENERATED = join(SRC, 'components/library/iconInventory.generated.ts');

/**
 * Named imports from `lucide-react`, per statement.
 *
 * `[^{}]*?` rather than `[\s\S]*?` is load-bearing: a greedy body runs past its
 * own closing brace and swallows the next import statement, which on the first
 * pass of this walk reported `useEffect` and `useForm` as icons. A brace class
 * cannot leave the statement it started in.
 */
const IMPORT = /import\s+(?:type\s+)?\{([^{}]*?)\}\s*from\s*['"]lucide-react['"]/g;

/** Type-only exports of the library, which are not icons. */
const NOT_ICONS = new Set(['LucideIcon', 'LucideProps']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      // Tests import icons to assert on them, which says nothing about what
      // the app shows a user.
      if (name === '__tests__') continue;
      walk(path, out);
    } else if (name.endsWith('.tsx') || name.endsWith('.ts')) {
      out.push(path);
    }
  }
  return out;
}

export interface IconUse {
  /** The export name as imported, e.g. `TriangleAlert`. */
  name: string;
  /** How many distinct files import it. The rough measure of how load-bearing it is. */
  files: number;
  /** Repo-relative paths, sorted, for the reader who wants to go and look. */
  where: string[];
}

/** Every Lucide icon the app imports, by name. */
export function collect(): IconUse[] {
  const uses = new Map<string, Set<string>>();

  for (const file of walk(SRC)) {
    const source = readFileSync(file, 'utf8');
    if (!source.includes('lucide-react')) continue;

    let match: RegExpExecArray | null;
    IMPORT.lastIndex = 0;
    while ((match = IMPORT.exec(source))) {
      for (const part of match[1].split(',')) {
        const raw = part.trim();
        if (!raw) continue;
        // `Foo as Bar` is imported under a local name; the icon is still Foo.
        const name = raw.replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
        if (!name || NOT_ICONS.has(name)) continue;
        if (!uses.has(name)) uses.set(name, new Set());
        uses.get(name)!.add(relative(ROOT, file));
      }
    }
  }

  return [...uses.entries()]
    .map(([name, files]) => ({ name, files: files.size, where: [...files].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function render(icons: IconUse[]): string {
  const rows = icons.map((icon) => `  ['${icon.name}', ${icon.files}],`).join('\n');

  return `/**
 * Every Lucide icon the app imports, and how many files import it.
 *
 * **Generated. Do not edit.** Run \`npx tsx scripts/icon-inventory.ts\` after
 * adding or removing an icon; \`__tests__/iconInventory.test.ts\` fails while
 * this file disagrees with the source tree, which is what stops the gallery
 * quietly going stale.
 *
 * ${icons.length} icons across the app.
 */

/** \`[name, how many files import it]\`. */
export const ICON_USES: ReadonlyArray<readonly [string, number]> = [
${rows}
];
`;
}

if (require.main === module) {
  const icons = collect();
  writeFileSync(GENERATED, render(icons));
  console.log(`${icons.length} icons -> ${relative(ROOT, GENERATED)}`);
}
