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
];

const ROOT = join(__dirname, '..', '..');

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      sourceFiles(full, acc);
    } else if (/\.tsx$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/** Every `.tsx` under src/, minus the documented exemptions. */
export function policedFiles(extraExempt: string[] = []): string[] {
  const exempt = [...EXEMPT, ...extraExempt];
  return sourceFiles(join(ROOT, 'src'))
    .map((f) => relative(ROOT, f))
    .filter((f) => !exempt.some((ex) => f.includes(ex)))
    .sort();
}

/** `[file, offendingToken]` pairs for every match of `pattern`. */
export function violations(pattern: RegExp, extraExempt: string[] = []): string[] {
  const found: string[] = [];
  for (const file of policedFiles(extraExempt)) {
    const source = readFileSync(join(ROOT, file), 'utf8');
    for (const match of source.matchAll(pattern)) {
      found.push(`${file}: ${match[0]}`);
    }
  }
  return found;
}
