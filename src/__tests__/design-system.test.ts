import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
 * An icon-only button with nothing to announce.
 *
 * A `size="icon"` button draws a glyph and no text, so unless it says its own
 * name it reaches a screen reader as "button" and nothing else. Every one of
 * them in this app already had a name when the rule was written; the rule
 * exists because the *next* one is written in a hurry, the glyph is obvious to
 * whoever picked it, and nothing on screen looks wrong.
 *
 * A name can arrive three ways and all three count: `aria-label` on the button,
 * a visually hidden `<span className="sr-only">` inside it, or a `label` prop
 * on one of the wrappers that turns a label into both (`RemoveButton`,
 * `ConfirmActionButton`, `EditButton`). The window is generous on purpose.
 * This is a guard against a forgotten label, not a parser, and a rule that
 * argues with formatting is a rule people delete.
 */
const ICON_BUTTON = /size=\{?["']icon(-sm)?["']/g;
const NAMES_ITSELF = /aria-label|sr-only|\blabel=/;

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

/**
 * A calendar date cut out of a UTC timestamp.
 *
 * `new Date().toISOString().slice(0, 10)` converts to UTC *first*, so east of
 * Greenwich it returns yesterday for the first hours of every day. In IST that
 * is 00:00 to 05:30, which is exactly when nobody is looking. `todayISO()` and
 * `localDateToISO()` in `domain/dates.ts` read the local calendar instead, and
 * that file has warned against this in prose since it was written — which is
 * the point: `EmployeeForm` defaulted a new employee's joining date this way
 * anyway, and the only thing that noticed was a test that failed one day a
 * month.
 *
 * Whole timestamps are untouched; it is slicing a date out of one that is
 * wrong.
 */
const UTC_DATE_SLICE = /toISOString\(\)\s*\.\s*(?:slice|substring|substr|split)\(/g;

/**
 * A hand-typed page inset.
 *
 * `p-9` is the page inset and nothing else uses it. It was re-typed in thirteen
 * files, which is thirteen chances for one page to end up a step off its
 * neighbours — and that drift is invisible as a bug report, because a screen
 * inset 24px where the rest are 36px does not look broken, it looks vaguely
 * wrong on a page nobody can point at. One of the thirteen had already been
 * missed: `/client/checklist` was still `p-6` after the pass that set the rest.
 *
 * `PageBody` owns it. A page that genuinely differs passes `className`, which
 * is an override with a reason attached rather than a second inset.
 */
const HAND_ROLLED_PAGE_INSET = /className="[^"]*\bp-9\b[^"]*"/g;

/**
 * A hand-typed page title.
 *
 * Same rule one element down: `text-2xl font-semibold` is the page `h1`, it
 * appeared in nine files, and the sizes had already begun to disagree with each
 * other elsewhere. `PageHeader` owns the title, the optional description and
 * where the actions sit, so a new page cannot invent a fourth arrangement of
 * the three.
 *
 * Scoped to an `h1` rather than to the classes: `text-2xl font-semibold` is
 * also what the CTC calculator's result figure is, and a number is not a page
 * title. It is the heading that has one house arrangement, not the type size.
 */
const HAND_ROLLED_PAGE_TITLE = /<h1[^>]*\btext-2xl\b/g;

/** `PageBody` and `PageHeader` are the primitives these two rules point at. */
const PAGE_PRIMITIVE = ['src/components/admin/Page.tsx'];

/**
 * A transition duration outside the three-tier scale.
 *
 * 75ms state, 100ms overlay, 200ms panel — defined in `globals.css`, where 75
 * is also the default, so the tier most components want costs nothing to ask
 * for. The audit that produced these numbers found the state tier was never
 * written down at all: a bare `transition-colors` took Tailwind's 150ms, so
 * every hover in the app ran at twice the intended speed and nothing said so.
 *
 * Two animations are deliberately outside the scale: the tray arrow's 420ms
 * and the reset button's 500ms spin. Both are one-off icon performances with
 * their own curve rather than state changes, and both explain themselves in
 * place. They are listed by file rather than exempted by pattern, so a third
 * cannot join them quietly.
 *
 * The sliding pill indicator is what this rule was worth writing for. It is
 * drawn by three components — `Tabs`, the browser's view toggle, the profile
 * switcher — and they ran it at 500ms, 300ms and 300ms, with the tab *panel*
 * sliding at 1500ms. Nobody chose those; they are shadcn defaults that were
 * never read. One control, three speeds, and no test that could see it.
 */
const OFF_SCALE_DURATION = /\bduration-(?!75\b|100\b|200\b)\[?[0-9]+m?s?\]?/g;
const SIGNATURE_MOTION = [
  'src/components/ui/tray-arrow-icon.tsx',
  'src/components/spec/ResetProgressButton.tsx',
];

/**
 * A table drawn straight onto the page background.
 *
 * `TableCard` is the surface every list sits on: one border, the card fill, and
 * a footer rule holding the row count and the pager. Without it a table has no
 * edges at all: its header row, its last row and the page run together, and the
 * count and the pager end up floating under it in a different place on every
 * screen.
 *
 * File-scoped rather than token-scoped, because what is wrong is not any one
 * class: it is a `<Table>` with nothing around it.
 */
const TABLE_TAG = /<Table>/;
const TABLE_CARD = /<TableCard[\s>]/;

/**
 * A stored phone number printed straight into the page.
 *
 * Phones are stored E.164 (`+919876543210`) and shown grouped.
 * `formatPhoneForDisplay` has existed and been tested since phones were added,
 * and until this rule nothing outside its own test called it. Every list in the
 * app printed the raw stored string, which is the one form nobody writes a
 * phone number in.
 *
 * A JSX *prop* is exempt (the lookbehind on `=`), because the stored form is
 * the right value to hand to something that is not printing it: `CopyCell`
 * copies E.164 to the clipboard while showing the grouped form beside it. What
 * this rule is about is the string that reaches the reader.
 */
const RAW_PHONE_PRINT = /(?<!=)\{\s*[\w.]+\.phone\s*\}/g;

/**
 * A dash typed in as "there is no value here".
 *
 * The dashboard printed an em dash for a letter with no total and the clients
 * list printed nothing at all, which is the `DateCell` lesson again: a value
 * that appears in more than one place gets one thing that decides how it
 * looks. `NIL` in `lib/utils.ts` is that thing, and it is a hyphen, because
 * the house rule bans the em dash and the en dash belongs to numeric ranges.
 *
 * Only a *bare* quoted dash matches, so an en dash inside 'April-March' is
 * untouched. The document sheets are exempt here as everywhere: they are
 * printed artifacts with their own typographic conventions.
 */
const HAND_TYPED_NIL = /['"][\u2014\u2013]['"]/g;

/**
 * A date formatted inside a table.
 *
 * This is the rule the *user* caught, not the test suite: the dashboard printed
 * a document's date at full strength and the clients list printed a client's
 * muted, one page apart, because each table formatted its own. Neither weight
 * was chosen — the second table simply had nothing to copy from, and the same
 * fact ended up looking like two different kinds of fact.
 *
 * `DateCell` in `admin/Page.tsx` owns the format and the weight, the same way
 * `PageBody` owns the inset. A table that calls `formatDisplayDate` itself is
 * a third opinion waiting to happen.
 *
 * Scoped to files that render table cells: a sheet, an editor heading and a
 * picker hint all print dates legitimately and none of them is a column.
 */
const TABLE_CELL_TAG = /<TableCell[\s/>]/;
const HAND_FORMATTED_DATE = /formatDisplayDate\(/;

/**
 * A document's status, decided by whoever is rendering it.
 *
 * The same lesson as `DateCell`, one column over. The table and the card view
 * each wrote `status === 'finalized' ? 'Finalized' : 'Draft'` with their own
 * badge variant, which is two places to disagree about a fact with legal weight:
 * finalized means immutable, retained 72 months, correctable only by
 * duplication. `ui/status-badge.tsx` owns the word, the icon and the fill, and
 * the icon is why the rule is worth enforcing rather than merely tidy: colour
 * alone was carrying "sealed" and colour alone is not a message.
 *
 * The comparison itself is fine; what is banned is turning it into a label
 * here. Matching the quoted status beside a ternary catches exactly that and
 * leaves `if (doc.status === 'finalized') return …` alone.
 */
const HAND_ROLLED_STATUS_BADGE = /status === ['"]finalized['"]\s*\?/g;

/**
 * "Optional" written into a label or a placeholder by hand.
 *
 * `OptionalMark` (in `form/FieldInfo.tsx`) is the one way a field says it can
 * be left empty, reachable as the `optional` prop on `FieldInfo`. It exists
 * because three sites had said it three ways: `label="CIN (optional)"`, a
 * placeholder reading "Optional" where the placeholder's job is to name the
 * kind of value, and a sentence at the end of an info tip. All three said the
 * same thing at a different weight, in a different place, and two of them said
 * it on a step where every single field was optional, which marks nothing.
 *
 * The rule catches the two written forms. The third, prose in an info tip, is
 * not greppable and is not meant to be: an explanation may fairly *mention*
 * that a field is optional, and this bans claiming it as a label.
 */
/**
 * `uppercase` as a way to make a label look like a heading.
 *
 * Small caps at 11px was how a table header, a group heading and a stat label
 * each said "this is a name, not a value", and all-caps is the worst available
 * way to say it: it removes the word shapes a reader recognises without
 * looking, it costs ~10% of the reading speed of the same word in sentence
 * case, and it is the one type treatment that cannot be undone by a screen
 * reader, which reads some of them out letter by letter. Sentence case at
 * 12px muted carries the same hierarchy through colour, which is what
 * everything else here already does.
 *
 * The sheets are exempt through `EXEMPT`, and correctly: "DESCRIPTION" and
 * "TERMS" are the printed document\'s own typography and several of the
 * headings are wanted verbatim by Rule 46.
 */
const SHOUTED_LABEL = /\buppercase\b/g;

/**
 * A popup offset or width decided by whoever was writing that popup.
 *
 * Four primitives draw a surface anchored to a control, and each had answered
 * "how far from it" and "how wide" on its own. That produced a submenu at
 * `sideOffset={0}` overlapping the menu it opened from, and a combobox list a
 * few pixels narrower than the field above it. `ui/popup.ts` owns both numbers
 * and the reason a ringed control needs different ones.
 *
 * `w-(--anchor-width)` is banned with them: a popup pinned to its anchor's
 * width cannot grow to its content, so a long option label is truncated rather
 * than shown. The floor is the anchor's width, never the ceiling.
 */
const HAND_WRITTEN_POPUP_OFFSET = /sideOffset\s*=\s*\{?\d/g;
const POPUP_PINNED_TO_ANCHOR = /\bw-\(--anchor-width\)/g;

/**
 * A width floor lowered from the call site. `tailwind-merge` resolves the
 * *last* utility in the class string, so a `min-w-max` passed to a
 * `DropdownMenuContent` silently replaces the anchor-width floor the primitive
 * set, and the menu comes out narrower than the control it hangs from. Three
 * filter menus were doing exactly that. A popup that needs to be wider says so
 * with a number (`min-w-56`), which raises the floor instead of removing it.
 */
const POPUP_FLOOR_LOWERED = /\bmin-w-(max|fit|min|auto)\b/g;

const HAND_WRITTEN_OPTIONAL =
  /(label|title)=["'][^"']*\(optional\)["']|placeholder=["']Optional["']/gi;

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

  it('takes every calendar date from domain/dates.ts, never from a UTC slice', () => {
    // `dates.ts` is exempt because it is the primitive, and because its own
    // warning against this spells the offending expression out.
    expect(violations(UTC_DATE_SLICE, ['src/lib/domain/dates.ts'], /\.tsx?$/)).toEqual([]);
  });

  it('takes the page inset from PageBody, never a hand-typed one', () => {
    expect(violations(HAND_ROLLED_PAGE_INSET, PAGE_PRIMITIVE)).toEqual([]);
  });

  it('takes the page title from PageHeader, never a hand-typed one', () => {
    expect(violations(HAND_ROLLED_PAGE_TITLE, PAGE_PRIMITIVE)).toEqual([]);
  });

  it('takes every duration from the three-tier motion scale', () => {
    expect(violations(OFF_SCALE_DURATION, SIGNATURE_MOTION)).toEqual([]);
  });

  it('puts every table in a TableCard', () => {
    const root = join(__dirname, '..', '..');
    const bare = policedFiles(UI_PRIMITIVES).filter((file) => {
      const source = readFileSync(join(root, file), 'utf8');
      return TABLE_TAG.test(source) && !TABLE_CARD.test(source);
    });
    expect(bare).toEqual([]);
  });

  it('takes every date in a table from DateCell, never formatting its own', () => {
    const root = join(__dirname, '..', '..');
    const own = policedFiles(PAGE_PRIMITIVE).filter((file) => {
      const source = readFileSync(join(root, file), 'utf8');
      return TABLE_CELL_TAG.test(source) && HAND_FORMATTED_DATE.test(source);
    });
    expect(own).toEqual([]);
  });

  it('gives every icon-only button a name to announce', () => {
    const root = join(__dirname, '..', '..');
    const unnamed: string[] = [];
    for (const file of policedFiles(UI_PRIMITIVES)) {
      const source = readFileSync(join(root, file), 'utf8');
      for (const match of source.matchAll(ICON_BUTTON)) {
        const from = Math.max(0, match.index - 300);
        if (!NAMES_ITSELF.test(source.slice(from, match.index + 700))) {
          unnamed.push(`${file}: ${match[0]}`);
        }
      }
    }
    expect(unnamed).toEqual([]);
  });

  it('sets labels in sentence case, never uppercase', () => {
    // `form/inputFilters.ts` owns `uppercaseField`, which uppercases a *value*
    // (an IFSC, a PAN) rather than a label, and is a `.ts` besides.
    expect(violations(SHOUTED_LABEL, UI_PRIMITIVES)).toEqual([]);
  });

  it('marks an optional field through OptionalMark, never in the label text', () => {
    expect(violations(HAND_WRITTEN_OPTIONAL, UI_PRIMITIVES)).toEqual([]);
  });

  it('says a document’s status through StatusBadge, never a ternary label', () => {
    expect(violations(HAND_ROLLED_STATUS_BADGE, UI_PRIMITIVES)).toEqual([]);
  });

  it('prints one nil glyph, from NIL, never a hand-typed dash', () => {
    expect(violations(HAND_TYPED_NIL, UI_PRIMITIVES)).toEqual([]);
  });

  it('formats every phone on the way out, never printing the stored form', () => {
    expect(violations(RAW_PHONE_PRINT, UI_PRIMITIVES)).toEqual([]);
  });

  it('takes every popup offset and width from ui/popup.ts', () => {
    expect(violations(HAND_WRITTEN_POPUP_OFFSET)).toEqual([]);
    expect(violations(POPUP_PINNED_TO_ANCHOR)).toEqual([]);
    expect(violations(POPUP_FLOOR_LOWERED)).toEqual([]);
  });

  it('polices .ts as well as .tsx (the schemas are not .tsx)', () => {
    const all = policedFiles([], /\.tsx?$/);
    expect(all).toContain('src/lib/domain/registry.ts');
    expect(all.length).toBeGreaterThan(policedFiles().length);
  });
});
