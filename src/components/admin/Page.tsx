import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { formatDisplayDate, localDateToISO } from "@/lib/domain/dates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { NIL, cn } from "@/lib/utils";

/**
 * The two pieces every page in the shell is made of: the inset that holds it
 * off the frame, and the title row at the top of it.
 *
 * Both existed already, re-typed in thirteen files. That is thirteen chances
 * for one page to drift a step off the others, and it is exactly the drift
 * nobody reports as a bug — a screen that is 24px in where its neighbours are
 * 36px does not look broken, it looks slightly wrong, on a page you cannot
 * point at. `design-system.test.ts` fails the build on a hand-typed inset or a
 * hand-typed page title, so the next page cannot start the drift again.
 *
 * The document sheets are not pages in this sense. They are fixed A4 artifacts
 * with their own geometry and are out of scope here, as everywhere.
 */

/**
 * The page inset: 36px on all four sides, 24px between the blocks inside it.
 *
 * `className` is for the handful of pages that genuinely differ — the UI kit
 * caps its width, onboarding runs full height with its own internal spacing.
 * It is an override for a stated reason, not a way to pick a different inset.
 *
 * Capped at 1400px and centred. A six-column table stretched across a 27-inch
 * display puts the number at one edge and the status at the other, and reading
 * a row becomes a head movement; past about 1400 the extra width buys nothing
 * and costs the eye the return sweep. The cap is on the *body*, not on the
 * shell, so the header, the rails and the frame still run edge to edge: the
 * chrome belongs to the window, the content belongs to the reader.
 */
export function PageBody({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1440px] flex-col gap-3 p-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * The surface a table sits on.
 *
 * A table drawn straight onto the page background has no edges, so its header
 * row, its last row and the page itself all bleed into one another and the
 * eye has nothing to hold. The border is the edge: one rule around it, one
 * under the last row, and no fill.
 *
 * `bg-background`, not `bg-card`. In light mode the two are the same white, so
 * the card fill drew nothing and the table read as a bordered box; in dark mode
 * `--card` is two steps lighter than the page and the same table came out as a
 * grey slab. One component cannot look like two different design decisions
 * depending on the theme, and the light version is the one that was right. The
 * fill is opaque rather than absent because `TableHeader` is sticky and scrolls
 * rows underneath itself.
 *
 * `overflow-clip`, never `overflow-hidden`. A hidden box is still a scroll
 * container, and focusing a row inside one triggers a scroll-into-view that
 * walks up every ancestor. Same reasoning as `AdminShell`.
 *
 * The footer only exists if something is in it. `count` sits left and
 * `pagination` right, which is the conventional arrangement and the one every
 * table here should share.
 */
export function TableCard({
  className,
  count,
  pagination,
  children,
}: {
  className?: string;
  count?: React.ReactNode;
  pagination?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("overflow-clip rounded-md border bg-background", className)}
    >
      {children}
      {count || pagination ? (
        <div className="flex min-h-11 items-center justify-between gap-2 border-t px-9 py-2 text-xs text-muted-foreground">
          <span>{count}</span>
          {pagination}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The column widths a table skeleton draws when the route does not say.
 *
 * Six columns, because that is what the documents list has and it is the table
 * this boundary stands in front of most often. The last is `ml-auto` for the
 * same reason `DocumentsTable` right-aligns its total: a money column that
 * arrives on the other side of the cell from where its placeholder sat is a
 * visible jump on every load.
 */
const SKELETON_COLUMNS = [
  "w-24",
  "w-16",
  "w-32",
  "w-20",
  "w-16 ml-auto",
  "w-14",
];

/**
 * A table's shape, before the table.
 *
 * The point of a skeleton is that nothing moves when the content lands, which
 * makes its geometry the whole of its job. A placeholder at the wrong row
 * height is a page that jumps *twice*, once to draw the bars and again to
 * replace them, and that is worse than never having drawn it.
 *
 * So it is not a drawing of a table. It is a real `TableCard` holding a real
 * `Table` with real `TableRow`s, and the bars are the only fake part. Row
 * height, the header rule, the cell padding, the border and the corner radius
 * therefore cannot drift from the real thing: they are the same components,
 * and a change to `h-11` moves both at once.
 *
 * Column *widths* are the one honest approximation, since the real table is
 * `table-layout: auto` and sized by content nobody has yet. A route with a
 * known column set passes its own; the default is the documents list's.
 */
export function TableSkeleton({
  columns = SKELETON_COLUMNS,
  rows = 6,
}: {
  /** One entry per column: width utilities, plus `ml-auto` to right-align. */
  columns?: string[];
  rows?: number;
}) {
  return (
    <TableCard>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((width, index) => (
              <TableHead key={index}>
                {/* `h-3` is the 12px line the heading and every cell here are
                    set in, so the bar occupies the text's box rather than the
                    row's. */}
                <Skeleton className={cn("h-3", width)} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, row) => (
            <TableRow key={row}>
              {columns.map((width, index) => (
                <TableCell key={index}>
                  <Skeleton className={cn("h-3", width)} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  );
}

/**
 * A date, in a table cell.
 *
 * The same fact in two lists must look the same in both, and it did not: the
 * dashboard printed a document's date at full strength while the clients list
 * printed a client's in `text-muted-foreground`, one page apart. Nobody chose
 * that; it is what happens when each table decides for itself, and it is the
 * kind of difference that reads as "these are different things" to everyone
 * who cannot say why.
 *
 * So the decision lives here, once, and `design-system.test.ts` fails the
 * build on a table that formats a date itself.
 *
 * Full strength, not muted: a date is a value the list is read *for* (and on
 * two of these tables it is the sort order), not a caption. Muted is for text
 * that supports another value, which is why the card view keeps it.
 *
 * Takes an ISO date or epoch milliseconds, because `documents.issueDate` is a
 * calendar date and `clients.createdAt` is a timestamp. `localDateToISO` reads
 * the local calendar rather than UTC, for the reason `dates.ts` gives.
 */
export function DateCell({
  value,
  className,
}: {
  value: string | number;
  className?: string;
}) {
  return (
    <TableCell className={cn("whitespace-nowrap tabular-nums", className)}>
      {formatDisplayDate(
        typeof value === "number" ? localDateToISO(new Date(value)) : value,
      )}
    </TableCell>
  );
}

/**
 * A cell whose value may be longer than its column.
 *
 * Table cells are `whitespace-nowrap`, so without a cap one long email widens
 * the whole table and pushes every column after it off the card. Capped and
 * ellipsised, with the full value on the element's `title` so it is still
 * readable and still selectable in the DOM.
 *
 * The cap lives on an inner `span`: `max-width` on a `td` is advisory under
 * `table-layout: auto` and browsers routinely ignore it.
 *
 * End truncation, not middle. Middle would keep an email's domain visible,
 * which is the better read, but it needs measurement in JS on every cell. Add
 * it when a column actually needs it.
 */
export function TruncCell({
  value,
  width = "16rem",
  className,
}: {
  value: string;
  /** Any CSS length. Defaults to a width that holds a typical email. */
  width?: string;
  className?: string;
}) {
  return (
    <TableCell className={className}>
      <span
        className="block truncate"
        style={{ maxWidth: width }}
        title={value || undefined}
      >
        {value || NIL}
      </span>
    </TableCell>
  );
}

/**
 * The title row: what this page is, optionally why, and the actions it offers.
 *
 * The actions sit in `children` so a page can pass one button, three, or a
 * button wrapped in a tooltip, without this component learning about any of
 * them. They wrap to their own line before the title truncates, because a
 * page whose name is cut in half to make room for a button has its priorities
 * backwards.
 */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    // `min-h-9` is the title's own height, reserved. Without it a route whose
    // header renders a beat before its body (or one with no description where
    // its neighbour has one) shifts everything below by a line as it settles,
    // which reads as the page twitching on arrival.
    // `mb-4` on top of `PageBody`'s own `gap-2`, so the page name sits 24px
    // above what follows while the blocks below it stay 8px apart. The title
    // names the whole page; the filter row and the table it filters are one
    // thing, and equal gaps all the way down made them read as three unrelated
    // strips.
    <div className="flex min-h-9 flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        {/* `tracking-[-0.01em]`: at 24px semibold the default spacing that
            suits body text reads loose, which is the optical correction every
            type scale needs and almost none apply. It is the only place in the
            app with type this large, so it is the only place that needs it. */}
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? (
        // `min-h-9 items-center`, not `items-start`. The title is a 32px line
        // and a default button is 36px, so aligning the two boxes' tops leaves
        // the button reading 2px high against the word beside it. Matching the
        // title row's own reserved height and centring within it puts the
        // button's centre on the title's centre line, and it stays there when a
        // description pushes the block taller.
        <div className="flex min-h-9 flex-wrap items-center gap-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A column heading that can sort, and looks identical when it can't.
 *
 * Shared by the documents and clients tables, so the two lists sort with one
 * set of rules rather than two that drift. Sorting is opt-in per table: pass
 * `onSortChange` and the heading becomes a button, omit it and it stays plain
 * text, which is what keeps a table renderable with no client state.
 */
export function SortableHead<C extends string>({
  column,
  label,
  right,
  sort,
  onSortChange,
}: {
  column: C;
  label: string;
  /** Right-aligned, as a money column is. Reverses the arrow's side too. */
  right?: boolean;
  sort?: { column: C; direction: "asc" | "desc" } | null;
  onSortChange?: (column: C) => void;
}) {
  const active = sort?.column === column;
  const SortIcon = !active
    ? ArrowUpDown
    : sort.direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <TableHead
      className={cn(right && "text-right")}
      // Announced only for the column actually sorted; the rest are 'none',
      // which is what tells a screen reader they're sortable.
      aria-sort={
        !onSortChange
          ? undefined
          : active
            ? sort.direction === "asc"
              ? "ascending"
              : "descending"
            : "none"
      }
    >
      {/*
        Both branches lay out identically: label, gap, then a 3.5 arrow slot
        that is merely `invisible` when sorting is off. Dropping the arrow
        instead would change the header's width, and with `table-auto` that
        re-measures every column: toggling the control shifted the whole table
        sideways.

        They share `text-muted-foreground` for the same reason: `TableHead`
        defaults to `text-foreground`, so leaving the unsortable branch to that
        default darkened every heading the moment sorting was switched off.
      */}
      {onSortChange ? (
        <button
          type="button"
          onClick={() => onSortChange(column)}
          className={cn(
            "group/sort inline-flex items-center gap-1 transition-colors hover:text-foreground",
            right && "flex-row-reverse",
            !active && "text-muted-foreground",
          )}
        >
          {label}
          {/*
            The arrow is permanent on the column actually sorted and appears on
            hover or keyboard focus on the others. A standing arrow on every
            header is that many invitations of equal weight, and none of them is
            the answer to "how is this sorted". `opacity`, not conditional
            rendering, so the slot keeps its width and the columns do not
            re-measure.
          */}
          <SortIcon
            className={cn(
              "size-3.5 transition-opacity",
              !active &&
                "opacity-0 group-hover/sort:opacity-100 group-focus-visible/sort:opacity-100",
            )}
            aria-hidden="true"
          />
        </button>
      ) : (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-muted-foreground",
            right && "flex-row-reverse",
          )}
        >
          {label}
          <SortIcon className="invisible size-3.5" aria-hidden="true" />
        </span>
      )}
    </TableHead>
  );
}
