'use client';

import { Badge } from '@/components/ui/badge';
import {
  Banknote,
  Building2,
  CalendarDays,
  CircleDot,
  FileText,
  Hash,
  MapPin,
  MessageSquare,
  Tag,
  UserRound,
  Users,
} from 'lucide-react';
import { AmountCell } from '@/components/patterns/AmountCell';
import { DateValue } from '@/components/patterns/Page';
import { CopyValue } from '@/components/patterns/CopyCell';
import { LocationCell } from '@/components/patterns/LocationCell';
import { PeopleCell, PersonCell } from '@/components/patterns/PersonCell';
import type { RecordColumn } from '@/components/patterns/RecordTable';
import { accentBadge, accentFor } from '@/lib/accent';
import { NIL } from '@/lib/utils';
import type { TemplateRow } from './rows';

/**
 * **The template: one of every kind of column a table in this app can have.**
 *
 * This is the file to copy from when building a new table. Take the rows the
 * column spec for the columns your table actually needs, delete the rest, and
 * the behaviour comes with them: `RecordTable` already brings paging, the
 * caption, selection, the actions column and the row that opens its record
 * (`docs/design.md` §2.3), and each entry below brings the one decision that
 * column kind has to get right.
 *
 * **A column spec is data, and that is deliberate.** It is an array rather than
 * JSX inside a component so that promoting this from a reference to a shared
 * component is a *move* rather than a rewrite: a real table imports the
 * definitions it wants, or copies them, and neither requires this file to have
 * been a component. It is also what lets a test read the spec without rendering
 * anything.
 *
 * **Nothing here is a new abstraction over `RecordTable`.** There is exactly one
 * table component in this app and it is `RecordTable`; a second layer with one
 * real shape is how every table's differences become props on a wrapper nobody
 * can change. What this file holds is *column* definitions, which is the part
 * that genuinely repeats.
 *
 * ---
 *
 * **The eleven kinds, and what each one is the answer to.** The order is the
 * order they sit in on the specimen, which is also roughly the order a row is
 * read in: what it is, what it is called, where it stands, what it is worth.
 *
 * | Kind | Column | The decision it carries |
 * |---|---|---|
 * | Identity | `name` | Frozen, and the only column that says which row you are on |
 * | Copyable | `reference` | The value *is* the button, and the cell is the table's |
 * | Status | `status` | One component decides how a state looks, never a ternary |
 * | Money | `amount` | Integer minor units, the symbol as a raised chip, `tabular-nums`, absent is not zero |
 * | Category | `category` | An accent hue that means nothing, with the word beside it |
 * | Person | `owner` | A disc and a name, and `NIL` where there is none |
 * | People | `team` | Three discs then a count; the names go to the tooltip |
 * | Place | `location` | A flag is never the only carrier of a country |
 * | Date | `issuedOn` | Formatted on the way out, `tabular-nums`, full strength |
 * | Prose | `note` | The column that truncates, with the value on its `title` |
 * | Glyph | `progress` | A column that is scanned rather than read may have no visible heading |
 *
 * Eleven is **over the six-column budget** §2.3 sets, on purpose: this is a
 * catalogue rather than a table anybody reads. A real table takes the four or
 * five of these its rows actually need, and the ones it leaves out belong on
 * the detail page.
 */
export const TEMPLATE_COLUMNS: RecordColumn<TemplateRow>[] = [
  {
    /*
      **Identity. Every table has exactly one, and it is first.**

      Frozen (`sticky`) because it is the only column that says *which row you
      are on*, which is what a reader needs at every scroll position in order to
      act on anything. That is the rule: the frozen column is the identifying
      one, never whichever happened to be leftmost.

      It is also the column `RecordTable` stretches the row's link across and
      reads a row's accessible name from, so it returns a plain string. A
      component here would still render, but the row would announce as "Open"
      with nothing after it unless the table passed `rowLabel` as well.
    */
    key: 'name',
    label: 'Name',
    icon: Building2,
    sticky: true,
    size: 200,
    cell: (row) => row.name,
  },
  {
    /*
      **A value somebody retypes into something else**: an invoice number into a
      bank transfer, an email into a mail client. Every one of those is a
      transcription, and a transcribed identifier is eventually a wrong one.

      `CopyValue`, **not `CopyCell`**, and the difference is the one thing that
      catches people out. `CopyCell` brings its own `<TableCell>`, and a width,
      a `left` and a divider all belong on that cell, which a column cannot hand
      over. On a resizable table a cell with no width takes whatever is left and
      paints over the column beside it. The value-only form keeps both.

      No `trunc` either: `CopyValue` truncates its own value, and a second cap
      around one that already exists paints a native `title` tooltip above every
      layer on the page, frozen columns included.

      `font-mono` because this is an identifier, and a proportional font makes
      two references of the same shape look different lengths (§2.3).
    */
    key: 'reference',
    label: 'Reference',
    icon: Hash,
    size: 180,
    className: 'font-mono',
    sortValue: (row) => row.reference,
    cell: (row) => (
      <CopyValue value={row.reference} label={`Copy reference for ${row.name}`} />
    ),
  },
  {
    /*
      **A state, and it is never a ternary.** `StatusBadge` is the one place that
      decides how a status looks, and `design-system.test.ts` fails the build on
      a status compared against a literal and turned into a label by a ternary
      anywhere else. (Described rather than quoted, because that test greps raw
      source and a rule written out in a comment reads to it exactly like the
      rule being broken.) The table and the card view each decided this for
      themselves once, which is how one fact came to look like two.

      Every status carries a **word**. The fill is the second reading, never the
      first: roughly one man in twelve cannot separate the filled badge from the
      muted one, and nobody at all can hear a colour (WCAG 1.4.1).

      `sortValue` is the raw key rather than the rendered badge, because a
      column whose cell is a component has no string for the default sort to
      read and would silently sort on nothing.
    */
    key: 'status',
    label: 'Status',
    icon: CircleDot,
    size: 120,
    sortValue: (row) => row.status,
    cell: (row) => <Badge status={row.status} />,
  },
  {
    /*
      **Money. The column with the most rules on it, and all of them are
      correctness rather than taste.**

      - **Integer minor units, always** (`CONTEXT.md` §1). The value on the
        record is paise, and `AmountCell` hands it to `formatMoney`, which is the
        only thing in the app that turns money into characters. A number
        formatted here by hand is a number that will disagree with the same
        figure on an invoice.
      - **The symbol is a raised chip, not a glyph in the text.** `AmountCell`
        splits it off what the formatter produced and boxes it in `RaisedChip`,
        the same container the flag sits in one column over, so the two read as
        the same kind of object. The digits are the formatter's, byte for byte:
        Indian grouping for INR, two decimals, nothing re-derived here.
      - **Absent is not zero.** A row with no amount prints `NIL`, because zero
        is a real figure meaning the work was given away and an absence is not a
        figure at all. Getting this wrong puts a ₹0.00 in a total nobody typed.
      - **`sortValue` is the number**, not the formatted string. Sorting
        '₹1,200.00' against '₹12,00,000.00' as text puts the larger first.
    */
    key: 'amount',
    label: 'Amount',
    icon: Banknote,
    size: 170,
    /*
      **Left-aligned, against the house rule that a money column is right-aligned
      (§2.3), and the chip is what decides it.**

      What right alignment buys is a column of decimal points in one place, so
      magnitudes are comparable by shape. That argument holds for a bare figure
      and stops holding once the figure carries a chip: right-aligned, the chips
      land at a different x on every row, following the length of the number they
      label, and a column of them is a ragged edge the eye has to re-find per
      row. Left-aligned they line up, which is what makes "this column is money,
      in rupees" readable as a property of the column instead of a fact repeated
      on each line. It is the same argument `CopyValue` makes for pushing its
      icon to the cell's edge rather than beside the value.

      `tabular-nums` is kept and is doing most of the work either way: every
      digit is a common width, so the figures still stack into readable columns.
      What is actually given up is the alignment of the *last* digit across rows
      of different magnitude.

      The same call the experimental clients table made, for the same reason and
      on request. An icon in the heading is possible again as a consequence: on a
      `right` heading `SortableHead` reverses the row and the glyph lands at the
      column's far edge, touching the next column's icon.
    */
    className: 'tabular-nums',
    // `-1` rather than `0` for an absent amount, so a row with no figure sorts
    // apart from a row genuinely worth nothing instead of being mixed in with
    // it. The number never renders; only the order it produces does.
    sortValue: (row) => row.amountMinor ?? -1,
    cell: (row) =>
      row.amountMinor === undefined ? (
        <span className="text-muted-foreground">{NIL}</span>
      ) : (
        <AmountCell minor={row.amountMinor} currency="INR" />
      ),
  },
  {
    /*
      **A category: a value from a set with no ordering.** An accent hue, and the
      hue **means nothing** (`lib/accent.ts`). It says "this one differs from
      that one" and no more, which is what lets the eye group a column it is
      scanning rather than reading.

      The word is always printed beside it, so the colour is redundant by
      construction (WCAG 1.4.1) and a reader who cannot tell violet from magenta
      loses only the grouping aid.

      `accentFor` hashes the name, which is right for a set nobody has
      enumerated and **wrong for a real one**: once a category is an enum on the
      record, each value names its hue explicitly, because a hash puts two
      adjacent rows on neighbouring hues often enough to matter and nobody can
      correct it without renaming the category.

      Not `ui/badge.tsx`: its variants are semantic (`default` is `--primary`)
      and all `rounded-full`, and a category is not a status. `accentBadge` is
      `rounded-sm` precisely so the two cannot be confused.
    */
    key: 'category',
    label: 'Category',
    icon: Tag,
    size: 140,
    sortValue: (row) => row.category,
    cell: (row) => <span className={accentBadge(accentFor(row.category))}>{row.category}</span>,
  },
  {
    /*
      **One person**: a tinted disc of their initials, then their name.

      **Initials, never a photograph.** An avatar image is a file, a blob, a
      private read route and a deletion rule (`CONTEXT.md` §5d) for a
      decoration. Initials distinguish four people in a column perfectly well,
      which is all this has to do.

      The disc is keyed on the name, so a person is the same colour in every row
      they appear in. That is what makes the stack in the next column scannable
      at all.

      An absent person prints `NIL` in the muted ramp, which `PersonCell`
      handles: an empty cell reads as a rendering failure, and a blank disc
      reads as a person with no name.
    */
    key: 'owner',
    label: 'Owner',
    icon: UserRound,
    size: 150,
    sortValue: (row) => row.owner ?? '',
    cell: (row) => <PersonCell name={row.owner} />,
  },
  {
    /*
      **Several people, overlapped.** A column of four names is wider than any
      column has to be, and the question this one answers at a glance is "how
      many, and is it the usual crowd" rather than "who exactly". The names are
      all still there, in the tooltip and in the accessible label.

      **Three discs, then a count.** Four is where a stack stops reading as a
      group and starts reading as a row of things to count, and `+2` is both
      narrower and more honest than a fourth disc hiding two people behind it.

      Not sortable: there is no sensible order for a set of people, and a
      heading whose arrow sorts on something the reader cannot see is worse than
      one that does not sort at all.
    */
    key: 'team',
    label: 'Team',
    icon: Users,
    size: 120,
    sortable: false,
    cell: (row) => <PeopleCell names={row.team} />,
  },
  {
    /*
      **A place**: the flag as a raised chip, then the city and the country.

      **A flag is never the only carrier of the country** (WCAG 1.4.1, and plain
      legibility). Two flags at 14px are frequently indistinguishable, and a
      reader who has not memorised 243 of them is every reader. The chip is
      `aria-hidden` and the country's name is in the text, so a screen reader
      hears the place once rather than "flag of India, Delhi, India".

      **`fit` and `minSize` together, and they are different promises.**
      `minSize` is stated, so it holds on a page where every value is short and
      before the data has loaded; `fit` is measured from the rows on screen, so
      it grows past the stated floor rather than cutting a value. A cut place
      name names nowhere ('Bridge of Earn, United Kingd'), which is what makes
      this column worth the width it takes. The floor is whichever is larger.

      Both need `resizable`: a width is advisory under `table-layout: auto`.

      Its `sortValue` is the **country**, because that is the coarse axis worth
      ordering on, and the heading says "Location" rather than "Country" because
      the city is the half somebody is scanning for. Where those two disagree,
      say so in a comment as this does, or the arrow means something other than
      it appears to.
    */
    key: 'location',
    label: 'Location',
    icon: MapPin,
    size: 240,
    minSize: 240,
    fit: true,
    sortValue: (row) => row.country ?? 'IN',
    cell: (row) => <LocationCell city={row.city} country={row.country} />,
  },
  {
    /*
      **A date, formatted on the way out and never printed as stored.**
      `DateValue` is the one place that decides, and `design-system.test.ts`
      fails a file that calls `formatDisplayDate` itself beside a `<TableCell>`.

      **Full strength, not muted.** A date is a value the list is read *for*,
      not a caption: muted is for text supporting another value. The dashboard
      printed a document's date at full strength while the clients list printed
      a client's muted, one page apart, and nobody chose that.

      `DateValue`, not `DateCell`, for the same reason Reference uses
      `CopyValue`: `DateCell` brings its own `<TableCell>` and a resized column
      cannot put a width on it. `tabular-nums` is the caller's, and it is what
      keeps a column of dates aligned on its digits.
    */
    key: 'issuedOn',
    label: 'Issued',
    icon: CalendarDays,
    size: 130,
    className: 'tabular-nums',
    sortValue: (row) => row.issuedOn,
    cell: (row) => <DateValue value={row.issuedOn} />,
  },
  {
    /*
      **Prose: the column that truncates.**

      `trunc` renders the cell through `TruncCell`, which caps the value on an
      inner span (`max-width` on a `<td>` is advisory under `table-layout: auto`
      and browsers routinely ignore it) and puts the whole thing on the
      element's `title`, so it is still readable and still selectable.

      End truncation, not middle. Middle would keep an email's domain visible,
      which is the better read, and it needs measurement in JS on every cell.
      Add it the day a column actually needs it.

      **`trunc` requires the cell to be a string.** `TruncCell` prints `value`,
      and `RecordTable` passes the rendered cell only when it is a string, so a
      component here would silently print nothing. That is the trade: a
      truncating column is a plain-text column.
    */
    key: 'note',
    label: 'Note',
    icon: MessageSquare,
    size: 220,
    trunc: true,
    sortable: false,
    cell: (row) => row.note,
  },
  {
    /*
      **A column that is scanned rather than read**, and the one kind allowed no
      visible heading (`headingHidden`). The onboarding ring is the real
      example; this is a bar.

      Three rules, and they are the price of dropping the heading:

      - **It still has a `label`.** A column with no name is a column a screen
        reader cannot place; `headingHidden` makes the heading `sr-only`, it
        does not remove it.
      - **It carries its figures in an accessible name.** A glyph a reader
        cannot hover is a glyph that says nothing to anyone not using a mouse,
        which is why this is `role="img"` with a label rather than a bare div.
      - **Nothing-yet draws as a track, never as a zero-length arc**, which is
        indistinguishable from a rendering failure.

      `headingHidden` is for a column *whose values are glyphs*. A text column
      with no heading is just a column somebody forgot to name.
    */
    key: 'progress',
    label: 'Progress',
    icon: FileText,
    headingHidden: true,
    size: 90,
    sortable: false,
    sortValue: (row) => row.team.length,
    cell: (row) => <ProgressBar done={row.team.length} total={4} />,
  },
];

/**
 * The glyph column's glyph: a track with a filled portion.
 *
 * Its own component rather than markup in the cell, for the reason every cell
 * on this table is: a value that appears in more than one place gets one
 * component that decides how it looks (`PRINCIPLES.md` rule 1 applied to
 * presentation). It is here rather than in `admin/` only because nothing else
 * uses it yet; the day something does, it moves and this imports it.
 *
 * The track is always drawn, even at zero, so "none yet" is a visible state
 * rather than an empty cell.
 */
function ProgressBar({ done, total }: { done: number; total: number }) {
  const safe = Math.max(0, Math.min(done, total));
  return (
    <span
      role="img"
      aria-label={`${safe} of ${total}`}
      className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <span
        className="h-full rounded-full bg-primary"
        style={{ width: `${total === 0 ? 0 : (safe / total) * 100}%` }}
      />
    </span>
  );
}
