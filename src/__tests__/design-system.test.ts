import {
  policedFiles,
  violations,
  SCHEMA_PRIMITIVES,
  UI_PRIMITIVES,
} from './policedSource';

/**
 * The other half of the enforcement layer.
 *
 * `design-tokens.test.ts` polices *colour*. This one polices **which primitive
 * was reached for** — because the failure mode that actually happened here was
 * not a stray hex code, it was a step hand-rolling a control that
 * `src/components/ui/` already exported. `date-picker.tsx` says in its own
 * docstring that it replaces the browser's native date input; a step used
 * `type="date"` anyway, and nothing noticed until someone opened the page.
 *
 * A convention that lives in a docstring is a convention nobody enforces. Each
 * rule below is one that was actually broken, kept from coming back.
 *
 * **Adding a rule here is cheap and is the point.** When a primitive becomes
 * the house answer for something, ban the thing it replaced in the same commit.
 */

/**
 * Standing muted text under a field.
 *
 * Every field carrying a permanent line of explanation is how a form becomes
 * unreadable: the notes are addressed to someone reading it for the first time
 * and shouted at everyone else forever. Explanations belong behind the info
 * icon (`FieldInfo` / `InfoTip`), and format examples belong in the
 * placeholder.
 */
const FIELD_DESCRIPTION = /<FieldDescription\b/g;

/**
 * The browser's own date control ignores the theme entirely, which is the
 * reason `ui/date-picker.tsx` exists.
 */
const NATIVE_DATE_INPUT = /type=["']date["']/g;

/**
 * A *visible* file input.
 *
 * Every drop zone needs a real `<input type="file">` — it is what carries the
 * accept filter, opens the picker and fires `change`, and removing it would
 * put the control out of reach of a screen reader. What is banned is showing
 * it: the browser's own widget cannot be styled to match anything, and a
 * page that renders one has skipped `form/UploadDropzone`.
 *
 * So the rule is "hidden, not absent" — the input must carry `sr-only`.
 */
// `[^>]` already spans newlines, so no `s` flag is needed (and the TS target
// would reject one).
const FILE_INPUT_TAG = /<input\b[^>]*type=["']file["'][^>]*>/g;
const isHidden = (tag: string) => /className=["'][^"']*\bsr-only\b/.test(tag);

/**
 * An identifier input built by hand.
 *
 * `form/fields.tsx` exports one component per identifier, each owning its
 * label, placeholder, length cap, upper-casing, tick and error slot, against
 * the matching rule in `lib/domain/fields.ts`. Registering one of these names
 * directly means rebuilding that from primitives, which is exactly how the
 * employee PAN ended up without a length cap and the studio GSTIN with no
 * validation at all.
 *
 * The names are matched with an optional dotted prefix so a nested path
 * (`billing.pan`) is caught too.
 */
const HAND_ROLLED_IDENTIFIER = /register\(\s*[`'"](?:[\w.]+\.)?(?:pan|gstin|tan|cin)[`'"]/gi;

/**
 * An email rule written in a component.
 *
 * The rule is `emailSchema()` in `lib/domain/fields.ts`, so the browser and the
 * Server Action cannot disagree about what an address is. Seven copies of it
 * carried three different messages before this.
 */
const INLINE_EMAIL_RULE = /\.email\(/g;

/**
 * A text field's rule written by hand instead of taken from `domain/text.ts`.
 *
 * `z.string().trim().max(n)` is length and presence and nothing else. It was on
 * roughly ninety fields, which is how a person's name came to accept a digit,
 * a `<script>` tag and a right-to-left override that reorders a printed
 * invoice. The replacements say what the field *is* — `personNameSchema`,
 * `orgNameSchema`, `textSchema`, `multilineSchema`, `codeSchema` — and every
 * one of them sanitises on the way in.
 *
 * Matches `.trim()` on a zod string specifically, because that is the tell: the
 * primitives trim internally, so a caller writing it by hand is building a rule
 * that already exists.
 */
const HAND_ROLLED_TEXT_RULE = /z\s*\.string\(\)\s*\.trim\(\)/g;

/**
 * A phone rule that is not the shared one.
 *
 * This is the one that had actually gone wrong: `isValidPhone` lived in
 * `PhoneField` and nowhere else, so every schema behind it was
 * `z.string().max(30)` and a number reaching a Server Action any other way was
 * never checked at all. It prints on an invoice.
 */
const HAND_ROLLED_PHONE_RULE = /(?:phone|mobile)\s*:\s*z\s*\.string\(\)/gi;

describe('design system', () => {
  it('finds source files to police (guards against the walker silently matching nothing)', () => {
    expect(policedFiles().length).toBeGreaterThan(50);
  });

  it('explains fields through the info icon, never a standing muted line', () => {
    expect(violations(FIELD_DESCRIPTION, UI_PRIMITIVES)).toEqual([]);
  });

  it('uses the DatePicker, never the browser’s native date input', () => {
    expect(violations(NATIVE_DATE_INPUT, UI_PRIMITIVES)).toEqual([]);
  });

  it('never shows the browser’s own file input', () => {
    const visible = violations(FILE_INPUT_TAG, UI_PRIMITIVES).filter(
      (found) => !isHidden(found),
    );
    expect(visible).toEqual([]);
  });

  it('builds every identifier input from form/fields.tsx', () => {
    expect(violations(HAND_ROLLED_IDENTIFIER, UI_PRIMITIVES)).toEqual([]);
  });

  it('never writes an email rule in a component', () => {
    expect(violations(INLINE_EMAIL_RULE, UI_PRIMITIVES)).toEqual([]);
  });

  it('takes every text field rule from domain/text.ts', () => {
    expect(violations(HAND_ROLLED_TEXT_RULE, SCHEMA_PRIMITIVES, /\.tsx?$/)).toEqual([]);
  });

  it('takes every phone rule from domain/fields.ts', () => {
    expect(violations(HAND_ROLLED_PHONE_RULE, SCHEMA_PRIMITIVES, /\.tsx?$/)).toEqual([]);
  });

  it('polices .ts as well as .tsx (the schemas are not .tsx)', () => {
    const all = policedFiles([], /\.tsx?$/);
    expect(all).toContain('src/lib/domain/registry.ts');
    expect(all.length).toBeGreaterThan(policedFiles().length);
  });
});
