import { policedFiles, violations, UI_PRIMITIVES } from './policedSource';

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
});
