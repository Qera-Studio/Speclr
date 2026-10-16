import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  policedFiles,
  violations,
  SCHEMA_PRIMITIVES,
  UI_PRIMITIVES,
} from './policedSource';
import {
  INLINE_TRANSITION_MIGRATED_LATER,
  RADIUS_MIGRATED_LATER,
  RESPONSIVE_MIGRATED_LATER,
  RING_MIGRATED_LATER,
  SHADOW_MIGRATED_LATER,
  SPACING_MIGRATED_LATER,
  TYPE_MIGRATED_LATER,
  WEIGHT_MIGRATED_LATER,
  Z_MIGRATED_LATER,
} from './migratedLater';

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
 * An `icon` button draws a glyph and no text, so unless it says its own
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
const ICON_BUTTON = /<(?:Button|ConfirmActionButton|AddButton)\b[^>]*?(?<![\w-])icon(?:\s|=\{true\}|\/?>)[^>]*?>/g;
const NAMES_ITSELF = /aria-label|sr-only|\blabel=/;

/**
 * The button API before 16 October 2026: eight fills and five sizes. `default`
 * is `primary` now and is no longer the default; `outline` is `secondary` and
 * is; `raised` and `neutral` are gone; `icon` is a shape rather than a size;
 * `form` is `lg`. cva rejects the old names at the type level, but a tag with
 * `{...props}` spread or a string built at runtime would not be caught there.
 */
const BUTTON_TAG = /<(?:Button|AlertDialogAction|AlertDialogCancel|ConfirmActionButton|AddButton|AddLink)\b[^>]*?>/g;
const OLD_BUTTON_API = /\b(?:variant=["'](?:default|outline|raised|neutral)["']|size=["'](?:icon|icon-sm|default|form)["'])/;

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

/**
 * Decorative motion, by the forms it actually took here (`docs/design.md`
 * §1.6, 16 October 2026): a spring library, a shared-layout pill, an icon
 * that transforms on hover, a transform transition anywhere a panel is not
 * sliding, a ring that pulses when a field fills, a popup that zooms as it
 * fades, and anything that animates in on mount. None carried information.
 */
const MOTION_LIB = /from ['"]motion(?:\/react)?['"]/g;
const LAYOUT_ID = /\blayoutId=/g;
const ICON_TRANSFORM = /\b(?:group-)?hover(?:\/[\w-]+)?:-?(?:rotate|scale|translate)-/g;
const TRANSITION_TRANSFORM = /\btransition-(?:transform|all)\b/g;
/** The three things that really do slide: the sheet, the nav rail, the profile track. */
const PANELS_THAT_SLIDE = [
  'src/components/ui/sheet.tsx',
  'src/components/ui/sidebar.tsx',
  'src/components/ui/switch.tsx',
  'src/components/admin/AdminSidebar.tsx',
];
const FILL_FLASH = /animate-fill-flash/g;
const ZOOMING_POPUP = /\bzoom-(?:in|out)-\d+/g;
const MOUNT_ANIMATION = /\b(?:animate-in|slide-in-from-[a-z]+-\d+)\b/g;
/** The overlay atoms fade in at the Overlay tier; the skeleton's delayed fade stops a flash on fast loads. */
const OVERLAYS = [
  'src/components/ui/alert-dialog.tsx',
  'src/components/ui/combobox.tsx',
  'src/components/ui/dialog.tsx',
  'src/components/ui/dropdown-menu.tsx',
  'src/components/ui/popover.tsx',
  'src/components/ui/select.tsx',
  'src/components/ui/tooltip.tsx',
  'src/app/(app)/loading.tsx',
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

/**
 * A `<TableBody>` is what makes a thing a list of records rather than a
 * layout: `ui/table.tsx` exports the primitives, and the one place allowed to
 * assemble them into a list is `RecordTable`.
 */
const TABLE_BODY_TAG = /<TableBody[\s/>]/;
const RECORD_TABLE_PRIMITIVES = [
  ...UI_PRIMITIVES,
  'src/components/admin/RecordTable.tsx',
  // The loading skeleton is a real TableCard holding real rows, on purpose:
  // its geometry has to match the table it stands in front of, or the page
  // jumps twice. See its note in Page.tsx.
  'src/components/admin/Page.tsx',
];
const TABLE_CARD = /<TableCard[\s>]/;

/**
 * A pager written by hand.
 *
 * `ui/pagination.tsx` is the pager: prev, the counter, next, and the box you
 * type a page into. The document preview had a second copy of that control and
 * it was the only one with the box, so a nine-page document went to page 9 in
 * one keystroke while a nine-page table took eight clicks. Neither surface
 * chose that; the second one simply had nothing to copy from.
 *
 * The tell used to be the counter (`Page {n} / {total}`), which was the one part
 * a hand-rolled pager always wrote out. **The primitive stopped rendering one**
 * when the pages became a tab group, so that pattern now matches nothing
 * anywhere and the rule would have passed forever against any future copy —
 * exactly the "a rule that matches nothing is a test that passes forever"
 * failure this file's header warns about.
 *
 * So the tell is the *navigation* instead: a prev/next pair, which is what
 * every hand-rolled pager has and what nothing else in the app writes. Either
 * spelling of the label counts, since the counter is no longer there to give it
 * away.
 *
 * `DocumentPager` is exempt because it *is* the wrapper: it renders
 * `Pagination` with the document's vocabulary and holds no control of its own.
 */
const PAGE_COUNTER =
  /Page \{[^}]+\}\s*\/\s*\{|(?:aria-label|name)=\{?["'`][^"'`]*\b[Pp]revious page\b/;
const PAGINATION_PRIMITIVE = [
  ...UI_PRIMITIVES,
  'src/components/docs/DocumentPager.tsx',
];

/**
 * A sheet told where to open.
 *
 * `AdminShell` publishes the inset card through `InsetProvider`, and
 * `SheetContent` reads it, so every drawer in the app opens inside the card
 * without being asked to. Passing `container` by hand is how the rule gets
 * opted out of quietly, and the drawer that spilled over the inset did so
 * because it was four levels into a page and *could* not be handed the prop.
 */
const SHEET_CONTAINER = /<SheetContent[^>]*\scontainer=/;

/**
 * A sheet that sizes itself.
 *
 * There were three drawers in the app and three unrelated answers to how wide
 * a drawer is: `Notifications` took the base `sm:max-w-sm`, `ClauseLibrary`
 * overrode it to `sm:max-w-xl`, and the mobile nav set a CSS variable. Nobody
 * chose a system, so the clause drawer's width was a number somebody typed
 * once and every new drawer would have been another one.
 *
 * `size` is that system (`docs/design.md` §2.11): 30% of the inset card for a
 * feed, 60% for something being worked through, 90% for a record being read.
 * Percentages rather than fixed maxima because a sheet is positioned against
 * the card, which moves with the sidebar.
 *
 * The className is where the old answers lived, so that is what is banned.
 * `min-w-*` is deliberately *not* matched: the floors are part of the sizes
 * and live in `ui/sheet.tsx`, which this rule does not police.
 */
const SHEET_OWN_WIDTH = /<SheetContent[^>]*className="[^"]*(?<![\w-])(?:sm:)?(?:max-)?w-/;

/**
 * A textarea told how tall to be.
 *
 * `ui/textarea.tsx` carries `field-sizing-content`, so a field is the height of
 * what is in it. Two things override that and both are bugs (`docs/design.md`
 * §2.2): `rows` is a height, so it floors an empty field at N lines whatever
 * field-sizing says, and `resize-y` puts a drag corner on every field, which is
 * a second answer to how tall it is and the one that wins permanently once
 * used.
 *
 * The clause body editor carried both, which is why this rule exists: it read
 * as deliberate at a glance and was 28 rows of half-empty box.
 *
 * `resize-none` is deliberately allowed. It is the primitive's own answer and a
 * caller re-stating it is saying the same thing, not a different one.
 *
 * No `g` flag, deliberately: `.test()` on a global regex resumes from
 * `lastIndex`, so a shared one used in a `filter` reports every other file.
 *
 * **Matched per attribute, not across the whole tag**, and that is a bug fixed
 * rather than a style. The first version was `<Textarea[^>]*rows=`, which
 * cannot cross a `>` and therefore stopped dead at the first arrow function in
 * the props: on the clause row, `onChange={(e) => …}` sits above `rows`, so the
 * rule read as passing on the exact file it was written for. It only ever
 * caught the tags whose attributes happened to come in a lucky order.
 *
 * So the tag is found first and its attributes are searched separately, with
 * `[^]` rather than `.` because the props span lines.
 */
const TEXTAREA_TAG = /<Textarea\b[^]*?\/>/g;
const FIXED_HEIGHT = /\brows=|\bresize-(?:y|x|both)\b/;

/**
 * Files that fixed a textarea's height before the rule above existed.
 *
 * Nine of them, found the moment the rule was written, and **not swept**: the
 * change that added the rule was the clause body editor, and rewriting nine
 * unrelated forms behind it is how one fix becomes a diff nobody can review.
 * Some are also a genuine judgement rather than the same bug (a studio address
 * that should always show three lines is not a clause row that should show
 * one), and that judgement wants making per form, with the form on screen.
 *
 * The list only shrinks. A new file here fails the build; an old one leaves
 * this array in the commit that fixes it.
 */
const GROWN_LATER = [
  'src/components/spec/IconSpecCard.tsx',
  'src/components/admin/clients/onboarding/AccessStep.tsx',
  'src/components/admin/services/ServiceEditDialog.tsx',
  'src/components/admin/services/WordingForm.tsx',
  'src/components/admin/settings/StudioForm.tsx',
  'src/components/docs/editors/ContentFields.tsx',
  'src/components/docs/editors/LetterEditor.tsx',
  'src/components/docs/editors/LineItemsEditor.tsx',
  'src/components/docs/editors/QuotationEditor.tsx',
  'src/components/docs/editors/SlipEditor.tsx',
];

/**
 * A multi-step flow built by hand.
 *
 * `aria-current="step"` is the tell: it is the attribute that marks which step
 * of a sequence you are standing on, so a file carrying one is a file that has
 * built its own step row. `components/flow/` owns that row, along with the
 * three-band layout, the submit portal, the locking of steps that need a saved
 * record, and the rule that completeness is derived rather than stored.
 *
 * Onboarding had the only one, and the contract builder was about to get a
 * second. Two hand-built wizards is how the two come to disagree about what a
 * disabled step looks like, whether the current one is announced, and where the
 * button sits — none of which is visible as a bug in either flow alone.
 */
const HAND_ROLLED_STEP_NAV = /aria-current=\{?["']step["']/;
const FLOW_PRIMITIVE = ['src/components/flow/'];

/**
 * A table that sorts, and the toggle that has to come with it.
 *
 * Sorting's controls only appear on a heading under the pointer, so its one
 * discoverable piece of UI is `SortToggle`. A list that sorts without one shows
 * arrows on hover that nothing on the page can turn off, which is what the
 * clause library and the employees list both did.
 *
 * Checked per feature folder rather than per file, because a table and the bar
 * holding its toggle are usually two files (`ClientsTable` / `ClientManager`).
 */
const TURNS_SORTING_ON =
  /^\s*sortable$|^\s*sortable\s*=|\bexternalSort\b|\bonSortChange=|\bsort=\{/m;
const RENDERS_SORT_TOGGLE = /<SortToggle[\s/>]/;

/**
 * Tables whose sort is driven by a toggle one folder up, listed by name.
 *
 * An explicit list rather than a path rule, because every path rule tried here
 * opens the hole the sorting rule exists to close (see the note at the check
 * itself). A named exemption cannot spread: adding a file to it is a line in a
 * diff somebody reviews, which is the whole mechanism.
 */
const SORTS_UNDER_A_PARENTS_TOGGLE = [
  /*
    `library/table/TemplateTable` is the template a new table is copied from.
    Its `sortable` **defaults to off**, which is the rule rather than an
    exemption from it: a copied table does not sort until its caller asks.

    What sorts is the specimen one folder up, `library/TableSpecimens.tsx`,
    which renders the real `SortToggle` over the real `useShowSort` and passes
    its state down. So the pairing is satisfied in the ordinary way, by the file
    that owns the eye; this row exists only because the table and its bar sit
    one directory apart, which is the case the note above anticipates.
  */
  'src/components/library/table/TemplateTable.tsx',
];

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
 * duplication. `ui/badge.tsx`'s `status` prop owns the word, the icon and the fill, and
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


/**
 * A data attribute handed a boolean.
 *
 * React writes `data-empty={false}` as `data-empty="false"`, and Tailwind's
 * `data-empty:` variant matches the attribute's **presence**, not its value. So
 * the style applies in both states. That is how every filled DatePicker in the
 * app came to print its date in the placeholder colour: the trigger carried
 * `data-empty={!selected}`, which never once removed the attribute. It went
 * unseen while the empty colour was the darker muted grey and surfaced the day
 * the placeholder was lightened.
 *
 * Write the attribute as present-or-absent: `cond ? '' : undefined`.
 */
const BOOLEAN_DATA_ATTR = /data-[a-z-]+=\{(?![^}]*(?:\?|undefined))(?:!|[^}]*[=!]==?)[^}]*\}/g;


/**
 * A text size outside the type scale.
 *
 * `globals.css` defines eight sizes (`text-caption` … `text-display`), each
 * carrying its own line-height, weight and tracking, so a call site says one
 * word. The audit that produced the scale found ten distinct sizes in use
 * against a rulebook that said four: 11px written two ways, 13px written as a
 * rem, 10px inside two primitives. None of them looked wrong on its own.
 * Tailwind's `text-xs`…`text-2xl` are banned with the arbitrary ones because
 * they are a second scale with different line-heights, and
 * `leading-*` / `tracking-*` / `text-x/y` are banned because the token
 * already answered that question. See `docs/design.md` §1.4.
 */
const ARBITRARY_TEXT = /\btext-\[[0-9.]+(?:px|rem|em)\]/g;
const OFF_SCALE_TEXT = /(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl)\b/g;
const OWN_LINE_HEIGHT = /\btext-[\w-]+\/[\w.]+|\bleading-[\w.[\]]+|\btracking-[\w.[\]-]+/g;

/**
 * A third weight. Regular and medium are the two on every screen; 600 exists
 * only inside `--text-title` and `--text-display`, where the token applies
 * it, so nothing outside `globals.css` writes `font-semibold`. Bold is not a
 * level: a third level is colour or size (§1.4).
 */
const HEAVY_WEIGHT = /\bfont-(?:semibold|bold|extrabold|black)\b/g;

/**
 * Spacing off the grid.
 *
 * Seven gaps: 4, 6, 8, 12, 16, 24, 32 (`gap-1` … `gap-8`), and the same set
 * for padding. The audit found `gap-3` was the second most used value in the
 * app and not in the house vocabulary, which is how a rulebook loses: a value
 * everybody needs and nobody wrote down gets written by hand at every site.
 * Margin is banned outright (except `*-auto`, which is alignment): spacing
 * belongs to the parent as a `gap`, because a child with a margin carries a
 * decision about its neighbours into every place it is reused. §1.2.
 */
const OFF_SCALE_SPACING =
  /\b(?:gap|p|px|py|pt|pb|pl|pr)-(?:[xy]-)?(?!(?:0|1|1\.5|2|3|4|6|8)\b)[0-9.]+\b/g;
const MARGIN = /(?<![\w-])-?m[trblxy]?-(?!auto\b)(?:[0-9.]+|px)\b/g;
const SPACE_BETWEEN = /\bspace-[xy]-[\w.]+/g;
const ARBITRARY_SPACE = /\b(?:gap|p|m)[xytrbl]?-\[[^\]]*\]/g;

/**
 * A corner off the radius scale. Four integers (4, 6, 8, 12) and `full`;
 * `rounded-xl` belongs to the two dialogs and nothing else, because a 12px
 * corner on a 28px control is a pill. §1.3.
 */
const OFF_SCALE_RADIUS = /\brounded-(?:[2-4]xl|\[[^\]]*\])/g;
const DIALOG_RADIUS = /\brounded-xl\b/g;
const DIALOG_PRIMITIVES = ['src/components/ui/dialog.tsx', 'src/components/ui/alert-dialog.tsx'];

/**
 * A shadow written by hand. Three tokens (`shadow-raised`, `shadow-overlay`,
 * `shadow-modal`), each with a dark value twice the weight of the light one,
 * replaced fourteen distinct arbitrary shadows, two of them in `rgba()` where
 * the colour test could not see them. §1.7.
 */
const ARBITRARY_SHADOW = /\bshadow-(?:\[[^\]]*\]|2?xs\b|sm\b|md\b|lg\b|xl\b|2xl\b)/g;

/**
 * A focus ring of its own. `focus-ring` in `globals.css` is the one
 * indicator; the audit found rings at 30%, 40%, 50% and solid, and one
 * control (`InfoTip`) with none. §1.8.
 */
const OWN_FOCUS_RING = /focus-visible:ring-[\w/[\]]+|\bring-ring\b/g;

/**
 * Motion outside the three tiers, in the places the duration rule could not
 * see: a second easing curve, an inline `style` transition, a `motion` spring.
 * One easing (`ease-standard`), and it is the default, so nothing names one.
 */
const OWN_EASING = /\bease-(?!standard\b)[a-z[][\w.,()[\]-]*/g;
// A CSS duration inside a JS string: `"transform 300ms ease-out"` in a
// `style` prop is a transition the class-based rules never see.
const INLINE_TRANSITION = /["'][\w-]+ \d+m?s\b[^"']*["']/g;

/**
 * A bare z-index. `--z-sticky` … `--z-toast` in `globals.css` name the five
 * layers; `z-(--z-overlay)` says what a thing is above, `z-50` does not.
 */
const RAW_Z = /\bz-(?:\[[^\]]*\]|[0-9]+)\b/g;

/**
 * A breakpoint outside the shell. The app is desktop-first and the shell is
 * the one thing that responds (nav collapses, rail becomes a sheet); a page
 * that carries `md:` is a page with a second layout nobody tests. §B10.
 */
const RESPONSIVE = /(?<![\w-])(?:sm|md|lg|xl|2xl):/g;
const SHELL = [
  'src/components/admin/AdminShell.tsx',
  'src/components/admin/AdminSidebar.tsx',
  'src/components/admin/TopPanel.tsx',
  'src/components/admin/AdminHeader.tsx',
  'src/components/admin/EditorSidebar.tsx',
];

/**
 * Every allowlist in `migratedLater.ts`, paired with the patterns it defers,
 * so the "only shrinks" rule is a test rather than a comment: a listed file
 * that no longer violates is reported, and leaves the list.
 */
const MIGRATIONS: Array<[string, string[], RegExp[], string[]]> = [
  ['TYPE', TYPE_MIGRATED_LATER, [ARBITRARY_TEXT, OFF_SCALE_TEXT, OWN_LINE_HEIGHT], []],
  ['WEIGHT', WEIGHT_MIGRATED_LATER, [HEAVY_WEIGHT], []],
  ['SPACING', SPACING_MIGRATED_LATER, [OFF_SCALE_SPACING, MARGIN, SPACE_BETWEEN, ARBITRARY_SPACE], []],
  ['RADIUS', RADIUS_MIGRATED_LATER, [OFF_SCALE_RADIUS, DIALOG_RADIUS], DIALOG_PRIMITIVES],
  ['SHADOW', SHADOW_MIGRATED_LATER, [ARBITRARY_SHADOW], []],
  ['RING', RING_MIGRATED_LATER, [OWN_FOCUS_RING], []],
  ['EASING', [], [OWN_EASING], []],
  ['INLINE_TRANSITION', INLINE_TRANSITION_MIGRATED_LATER, [INLINE_TRANSITION], []],
  ['Z', Z_MIGRATED_LATER, [RAW_Z], []],
  ['RESPONSIVE', RESPONSIVE_MIGRATED_LATER, [RESPONSIVE], SHELL],
];

/** `violations` over every pattern of a migration, minus its allowlist. */
function outstanding([, later, patterns, exempt]: (typeof MIGRATIONS)[number]) {
  return patterns.flatMap((p) => violations(p, [...later, ...exempt], /\.tsx?$/));
}

describe('design system', () => {
  it('writes a boolean data attribute as present or absent, never as "false"', () => {
    expect(violations(BOOLEAN_DATA_ATTR)).toEqual([]);
  });

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
    expect(violations(OFF_SCALE_DURATION)).toEqual([]);
  });

  it('has no decorative motion: no spring library, no sliding pill, no icon that moves on hover', () => {
    expect(violations(MOTION_LIB, [], /\.tsx?$/)).toEqual([]);
    expect(violations(LAYOUT_ID)).toEqual([]);
    expect(violations(ICON_TRANSFORM)).toEqual([]);
    expect(violations(TRANSITION_TRANSFORM, PANELS_THAT_SLIDE)).toEqual([]);
    expect(violations(FILL_FLASH)).toEqual([]);
    expect(violations(ZOOMING_POPUP)).toEqual([]);
    expect(violations(MOUNT_ANIMATION, OVERLAYS)).toEqual([]);
  });

  it('puts every table in a TableCard', () => {
    const root = join(__dirname, '..', '..');
    const bare = policedFiles(UI_PRIMITIVES).filter((file) => {
      const source = readFileSync(join(root, file), 'utf8');
      return TABLE_TAG.test(source) && !TABLE_CARD.test(source);
    });
    expect(bare).toEqual([]);
  });

  /**
   * The table rule, and the reason §2.3 was rewritten around a component.
   *
   * Every rule that section states was already written down when the clause
   * library shipped with no paging over 28 rows, no caption and no sortable
   * headings. Prose describing a default does not produce one. `RecordTable`
   * holds them instead, and this is what keeps a new list from starting again
   * from `<Table>` and rediscovering which of them matter.
   *
   * The exemption list is the whole policy: `ui/table.tsx` defines the
   * primitives, `RecordTable` assembles them, and `Page.tsx` draws the
   * skeleton that has to match the real thing row for row.
   */
  it('builds every list of records from RecordTable, never from a bare Table', () => {
    const root = join(__dirname, '..', '..');
    const bare = policedFiles(RECORD_TABLE_PRIMITIVES).filter((file) =>
      TABLE_BODY_TAG.test(readFileSync(join(root, file), 'utf8')),
    );
    expect(bare).toEqual([]);
  });

  /**
   * The pagination rule (`docs/design.md` §2.10). One pager, so the box you
   * type a page into cannot be a thing one surface happens to have.
   */
  it('builds every pager from Pagination, never writing its own counter', () => {
    const root = join(__dirname, '..', '..');
    const own = policedFiles(PAGINATION_PRIMITIVE).filter((file) =>
      PAGE_COUNTER.test(readFileSync(join(root, file), 'utf8')),
    );
    expect(own).toEqual([]);
  });

  /**
   * The sorting rule (`docs/design.md` §2.3): sorting and its toggle travel
   * together, or the arrows on hover cannot be turned off.
   */
  it('gives every sorting table a SortToggle in the same feature folder', () => {
    const root = join(__dirname, '..', '..');
    const read = (file: string) => readFileSync(join(root, file), 'utf8');
    const files = policedFiles(RECORD_TABLE_PRIMITIVES);

    const folderOf = (file: string) => file.slice(0, file.lastIndexOf('/'));
    const foldersWithToggle = new Set(
      files.filter((f) => RENDERS_SORT_TOGGLE.test(read(f))).map(folderOf),
    );

    // The folder itself, and deliberately *not* its parent. A table sits beside
    // the bar holding its toggle (`clients/ClientsTable` with `clients/`), and
    // walking up one level would let every list under `components/admin/`
    // borrow the documents browser's toggle, which is the hole this rule was
    // written to close: with the parent fallback in, removing the clients
    // toggle left the rule green.
    //
    // A *descendant* fallback was tried and is just as bad, for a reason worth
    // recording: `DocumentsBrowser` renders the only `SortToggle` in the app and
    // it sits in `components/admin/`, so "inside a folder that has a toggle"
    // makes every feature folder under `admin/` covered by it, which is the same
    // hole reached from the other direction. Confirmed by removing the clients
    // toggle and watching the rule stay green.
    //
    // So a nested folder that sorts declares its own coverage below, by name.
    const orphans = files.filter(
      (file) =>
        TURNS_SORTING_ON.test(read(file)) &&
        !foldersWithToggle.has(folderOf(file)) &&
        !SORTS_UNDER_A_PARENTS_TOGGLE.includes(file),
    );

    expect(orphans).toEqual([]);
  });

  /**
   * The sheet rule (`docs/design.md` §2.11). A drawer opens inside the inset
   * card because the shell publishes it, never because a caller remembered.
   */
  it('lets every sheet take its container from the shell, never naming its own', () => {
    const root = join(__dirname, '..', '..');
    const own = policedFiles(UI_PRIMITIVES).filter((file) =>
      SHEET_CONTAINER.test(readFileSync(join(root, file), 'utf8')),
    );
    expect(own).toEqual([]);
  });

  /**
   * The other half of the same rule: a drawer's *width* is one of three named
   * sizes, never a max typed onto the call site.
   */
  it('takes every sheet width from its size, never naming its own', () => {
    const root = join(__dirname, '..', '..');
    const own = policedFiles(UI_PRIMITIVES).filter((file) =>
      SHEET_OWN_WIDTH.test(readFileSync(join(root, file), 'utf8')),
    );
    expect(own).toEqual([]);
  });

  /**
   * A textarea grows with its content and is never given a height
   * (`docs/design.md` §2.2).
   */
  it('lets every textarea size itself, never fixing or resizing one', () => {
    const root = join(__dirname, '..', '..');
    const sized = policedFiles(UI_PRIMITIVES).filter((file) => {
      if (GROWN_LATER.includes(file)) return false;
      const source = readFileSync(join(root, file), 'utf8');
      return [...source.matchAll(TEXTAREA_TAG)].some((tag) => FIXED_HEIGHT.test(tag[0]));
    });
    expect(sized).toEqual([]);
  });

  /**
   * Every multi-step flow is built on `FlowShell` (`docs/design.md` §2.12).
   * A second hand-built step row is a second set of answers about locking,
   * announcing and where the submit sits.
   */
  it('builds every multi-step flow on FlowShell, never its own step row', () => {
    const root = join(__dirname, '..', '..');
    const own = policedFiles(FLOW_PRIMITIVE).filter((file) =>
      HAND_ROLLED_STEP_NAV.test(readFileSync(join(root, file), 'utf8')),
    );
    expect(own).toEqual([]);
  });

  it('takes every date in a table from DateCell, never formatting its own', () => {
    const root = join(__dirname, '..', '..');
    const own = policedFiles(PAGE_PRIMITIVE).filter((file) => {
      const source = readFileSync(join(root, file), 'utf8');
      return TABLE_CELL_TAG.test(source) && HAND_FORMATTED_DATE.test(source);
    });
    expect(own).toEqual([]);
  });

  it('writes every button in the five-fill, three-height API', () => {
    const root = join(__dirname, '..', '..');
    const stale: string[] = [];
    for (const file of policedFiles(['src/components/ui/button.tsx'])) {
      const source = readFileSync(join(root, file), 'utf8');
      for (const tag of source.matchAll(BUTTON_TAG)) {
        const old = OLD_BUTTON_API.exec(tag[0]);
        if (old) stale.push(`${file}: ${old[0]}`);
      }
    }
    expect(stale).toEqual([]);
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

  it('says a document’s status through Badge status, never a ternary label', () => {
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
  it('takes every text size from the type scale, never Tailwind’s or a pixel value', () => {
    expect(outstanding(MIGRATIONS[0])).toEqual([]);
  });

  it('sets at most two weights; 600 lives only in the title and display tokens', () => {
    expect(outstanding(MIGRATIONS[1])).toEqual([]);
  });

  it('keeps every gap and inset on the spacing scale, and never uses margin', () => {
    expect(outstanding(MIGRATIONS[2])).toEqual([]);
  });

  it('keeps every corner on the radius scale; xl is the dialogs’ alone', () => {
    expect(outstanding(MIGRATIONS[3])).toEqual([]);
  });

  it('takes every shadow from the three elevation tokens', () => {
    expect(outstanding(MIGRATIONS[4])).toEqual([]);
  });

  it('takes the focus ring from focus-ring, never drawing its own', () => {
    expect(outstanding(MIGRATIONS[5])).toEqual([]);
  });

  it('uses the one easing and never an inline transition', () => {
    expect(outstanding(MIGRATIONS[6])).toEqual([]);
    expect(outstanding(MIGRATIONS[7])).toEqual([]);
  });

  it('names every z-index layer, never a bare number', () => {
    expect(outstanding(MIGRATIONS[8])).toEqual([]);
  });

  it('keeps breakpoints inside the shell', () => {
    expect(outstanding(MIGRATIONS[9])).toEqual([]);
  });

  it('keeps every migration allowlist honest: a listed file still violates, or it leaves the list', () => {
    const root = join(__dirname, '..', '..');
    const stale: string[] = [];
    for (const [name, later, patterns, exempt] of MIGRATIONS) {
      for (const file of later) {
        if (exempt.includes(file)) stale.push(`${name}: ${file} is already exempt`);
        const source = readFileSync(join(root, file), 'utf8');
        if (!patterns.some((p) => new RegExp(p.source, p.flags.replace('g', '')).test(source))) {
          stale.push(`${name}: ${file} no longer violates; remove it from migratedLater.ts`);
        }
      }
    }
    expect(stale).toEqual([]);
  });
});
