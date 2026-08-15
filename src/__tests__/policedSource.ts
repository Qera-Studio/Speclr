import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * The source walker the enforcement tests share.
 *
 * Two tests police `.tsx` under `src/` — one for colour
 * (`design-tokens.test.ts`), one for which primitive was reached for
 * (`design-system.test.ts`). They walked the tree with two copies of the same
 * function, which is one copy too many: the day an exemption is added to one
 * and not the other, the rule quietly stops applying to half the codebase.
 */

/**
 * Where a rule does not apply, and why:
 *
 * - `components/docs/sheets/` — pixel-faithful invoice/contract/letter
 *   artifacts. They print to paper in fixed ink, must not shift with the app
 *   theme, and are explicitly out of scope for redesign (see AGENTS.md).
 * - `components/spec/PreviewMockups/` — imitations of *other people's* UI
 *   (Chrome's tab strip, iOS home screen, a Google SERP). Their colours belong
 *   to Google and Apple, not to us; theming them would defeat the preview.
 * - `__tests__/` — assertions frequently name a class or a tag in order to
 *   prove it is absent.
 */
export const EXEMPT = [
  'src/components/docs/sheets/',
  'src/components/spec/PreviewMockups/',
  '__tests__/',
];

/**
 * The primitives themselves are exempt from the "use the primitive" rules —
 * `date-picker.tsx` is allowed to know what a date input is, `field.tsx` is
 * allowed to define `FieldDescription`, and `UploadDropzone` is allowed to own
 * the one `<input type="file">`. It is the *callers* that are policed.
 *
 * `UploadDropzone` sits in `form/` rather than `ui/` because it is composed
 * from `ui/` parts rather than being one; that is a directory convention, not
 * a reason to hold it to a different standard.
 */
export const UI_PRIMITIVES = [
  'src/components/ui/',
  'src/components/form/UploadDropzone.tsx',
  // The identifier inputs. Same standing as the two above: they are allowed to
  // know how a PAN input is built, because they are the one place it is built.
  'src/components/form/fields.tsx',
];

/**
 * The schema rules (`domain/text.ts`, `domain/fields.ts`) are the same idea one
 * layer down: they are the one place a field's rule is written, so they are the
 * one place allowed to write `z.string()` by hand.
 */
export const SCHEMA_PRIMITIVES = ['src/lib/domain/text.ts', 'src/lib/domain/fields.ts'];

const ROOT = join(__dirname, '..', '..');

function sourceFiles(dir: string, pattern: RegExp, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      sourceFiles(full, pattern, acc);
    } else if (pattern.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * Every source file under src/, minus the documented exemptions.
 *
 * `.tsx` by default, which is what the two design rules want. The schema rule
 * passes `/\.tsx?$/` because a zod schema lives in a `.ts`.
 */
export function policedFiles(extraExempt: string[] = [], ext = /\.tsx$/): string[] {
  const exempt = [...EXEMPT, ...extraExempt];
  return sourceFiles(join(ROOT, 'src'), ext)
    .map((f) => relative(ROOT, f))
    .filter((f) => !exempt.some((ex) => f.includes(ex)))
    .sort();
}

/** `[file, offendingToken]` pairs for every match of `pattern`. */
export function violations(
  pattern: RegExp,
  extraExempt: string[] = [],
  ext?: RegExp,
): string[] {
  const found: string[] = [];
  for (const file of policedFiles(extraExempt, ext)) {
    const source = readFileSync(join(ROOT, file), 'utf8');
    for (const match of source.matchAll(pattern)) {
      found.push(`${file}: ${match[0]}`);
    }
  }
  return found;
}
