"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FilterX,
  Columns3,
  LayoutGrid,
  Rows3,
  Calendar,
  CircleDot,
  FileText,
  IndianRupee,
  User,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTabDrag } from "@/components/ui/tabs";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Pagination,
  rowCountLabel,
  usePagedRows,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import SortToggle, { useShowSort } from "./SortToggle";
import FilterBar from "./FilterBar";
import DocumentsCards from "./DocumentsCards";
import DocumentsKanban from "./DocumentsKanban";
import DocumentsTable from "./DocumentsTable";
import { BulkBar, useBulkSelect } from "./BulkSelect";
import { DELETE_DRAFT_CONSEQUENCE } from "@/lib/domain/registry";
import { DEV_UNLIMITED } from "@/lib/devMode";
import { deleteDraftAction } from "@/server/actions/documents";
import {
  FILTER_FIELDS,
  GROUP_BY_LIST,
  groupDocuments,
  hasTotal,
  matchesFilters,
  partyFieldLabel,
  sortDocuments,
  type FilterField,
  type FilterOption,
  type FilterRow,
  type GroupBy,
  type SortColumn,
  type SortState,
} from "@/lib/domain/documentQuery";
import { partyName } from "@/lib/domain/party";
import { profileOfDocType } from "@/lib/profile";
import { DOC_TYPE_LIST, DOC_TYPES } from "@/lib/domain/registry";
import type { AdminDocument } from "@/lib/domain/types";

/**
 * The documents list, with its filters and column sorting.
 *
 * Filtering and sorting run in memory over the list the page already fetched.
 * This is an internal tool holding tens of documents, so a round trip per
 * keystroke would buy nothing; if the list ever reaches thousands this moves
 * into SQL behind the same component boundary.
 *
 * Note the two distinct empty outcomes: "nothing has been created yet" is the
 * table's own empty state, while "nothing matches your filters" is handled here
 * — conflating them would make an over-narrow filter look like data loss.
 */
/**
 * Where the view choice is remembered. Table by default: it is the densest of
 * the three and the one this tool was built around.
 *
 * The board's grouping is deliberately *not* remembered alongside it. The view
 * is a habit ("I read lists as cards"); which way a board is cut is a question
 * about the thing being looked at right now, and it opens on type every time.
 */
const VIEW_KEY = "speclr:doc-view";

/**
 * An icon per filter field. Here rather than beside `FILTER_FIELDS`, because
 * that table is domain code and Lucide is UI.
 */
const FIELD_ICONS: Record<FilterField, LucideIcon> = {
  type: FileText,
  party: User,
  status: CircleDot,
  date: Calendar,
  total: IndianRupee,
};

type View = "table" | "cards" | "board";

const VIEW_TABS = [
  { value: "table", label: "List", icon: Rows3 },
  { value: "cards", label: "Cards", icon: LayoutGrid },
  { value: "board", label: "Board", icon: Columns3 },
] as const satisfies readonly {
  value: View;
  label: string;
  icon: LucideIcon;
}[];

const isView = (value: unknown): value is View =>
  VIEW_TABS.some((tab) => tab.value === value);

/** What the group row calls each cut, and the icon it carries. */
const GROUP_LABELS: Record<GroupBy, string> = {
  status: "Status",
  type: "Type",
  month: "Month",
};

/**
 * The same glyph the filter pill for that field uses, so "Status" means the
 * same thing on both rows. Month has no filter field of its own, and takes the
 * date field's calendar.
 */
const GROUP_ICONS: Record<GroupBy, LucideIcon> = {
  status: CircleDot,
  type: FileText,
  month: Calendar,
};

export default function DocumentsBrowser({
  documents,
  emptyTitle,
  emptyDescription,
  /** Hidden on a per-type list, where every row is already the same type. */
  hideTypeFilter = false,
}: {
  documents: AdminDocument[];
  emptyTitle?: string;
  emptyDescription?: string;
  hideTypeFilter?: boolean;
}) {
  const [rows, setRows] = useState<FilterRow[]>([]);
  const [sort, setSort] = useState<SortState | null>(null);
  const [showSort, toggleShowSort] = useShowSort();
  const [view, setView] = useState<View>("table");
  const [groupBy, setGroupBy] = useState<GroupBy>(GROUP_BY_LIST[0]);
  /** The pill is draggable here exactly as it is on a real tab strip. */
  const viewDrag = useTabDrag();

  // Read on mount, not in a lazy initializer: this component server-renders,
  // and reading localStorage during the first render would mismatch hydration.
  // Validated rather than cast: the key is client-writable, and a third view
  // arriving meant a stored 'cards' check would have silently kept working
  // while a stored anything-else drew nothing.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (isView(stored)) setView(stored);
    } catch {
      // Private browsing / storage disabled — the default holds for the session.
    }
  }, []);

  const chooseView = (next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // As above — the choice still applies, it just won't survive a reload.
    }
  };

  // Two pressed-state buttons rather than one that toggles: "which view am I
  // in" is answerable at a glance, and neither icon has to stand for both
  // states. `aria-pressed` carries that to assistive tech, and each button
  // keeps its own name so voice control can ask for either by name.
  //
  // Styled as a segmented control, but deliberately *not* built from `Tabs`.
  // A tab's job is to reveal its own tabpanel, and there is no panel here —
  // this redraws one list that lives outside the bar, with the sort control,
  // the row count and the pager all reading from the same state. Borrowing the
  // tab roles for the look would announce panels to a screen reader that do
  // not exist. It is drawn to match `ProfileSwitcher` rather than `TabsList`:
  // same trackless pill, same two label weights, same padding.
  //
  // The pill glides rather than blinking, and it does so without measuring
  // anything: the segments are an equal-width grid, so the pill is exactly one
  // segment wide and each 100% of translate lands precisely on the next. That
  // is why the labels are not free-width — `TabsIndicator` needs Base UI to
  // measure the active tab onto CSS variables, and there is no tab here to
  // measure. The grid columns, the pill's width and the translate all read off
  // `VIEW_TABS`, so a fourth view is a row in that table and nothing else.
  const viewToggle = (
    <div
      role="group"
      aria-label="View"
      {...viewDrag}
      className={cn(
        // Deliberately *not* `tabsListVariants()` any more. This matches
        // `ProfileSwitcher`: no trough, no border, no padding. The pill is the
        // whole of the visible state, and a container stroke was a second edge
        // saying what the fill already says.
        //
        // `h-7` is not a taste: it is `Button`'s own default size, which every
        // other control on this row is. A hand-written control that sets its
        // own height is how one row comes to have two, and the difference is
        // small enough to look like a rendering artefact rather than a bug.
        "group/tabs-list relative grid h-7 w-fit shrink-0 cursor-grab items-center data-dragging:cursor-grabbing data-dragging:select-none",
      )}
      // An arbitrary class can't be composed from a value, and `grid-cols-3`
      // written out is a second place to count the tabs.
      style={{ gridTemplateColumns: `repeat(${VIEW_TABS.length}, minmax(0, 1fr))` }}
    >
      {/* `data-drag-pill` / `data-drag-segment` are what `useTabDrag` looks for
          in a strip Base UI did not build. The transform is written out rather
          than left to `translate-x-full`, because the drag adds to it. */}
      <span
        aria-hidden="true"
        data-drag-pill=""
        style={{
          width: `${100 / VIEW_TABS.length}%`,
          transform: `translateX(calc(${VIEW_TABS.findIndex((tab) => tab.value === view) * 100}% + var(--tab-drag, 0px)))`,
        }}
        className={cn(
          // Flat `bg-raised`, no border and no shadow: with the trough gone
          // the fill is the whole of the state, and the offsets re-zero with
          // the padding that used to inset them.
          "pointer-events-none absolute inset-y-0 left-0 z-0 rounded-md bg-raised",
          "transition-transform duration-200 ease-standard motion-reduce:transition-none",
          // Untransitioned under the hand; the offset is already per-frame.
          "group-data-dragging/tabs-list:transition-none",
        )}
      />
      {VIEW_TABS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          data-drag-segment=""
          onClick={() => chooseView(value)}
          className={cn(
            // `px-3` and the switcher's own two weights. The pill is exactly
            // one segment and the segments are adjacent by construction, so
            // the air between the labels is the segments' own padding.
            "relative z-10 inline-flex h-full items-center justify-center gap-1.5 rounded-md px-3",
            "text-xs font-medium whitespace-nowrap transition-colors",
            "text-muted-foreground hover:text-sidebar-foreground",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            "aria-pressed:text-sidebar-foreground",
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );

  // How the board is cut: three cuts, all three on the page, in a row of their
  // own under the filters.
  //
  // It was a dropdown at the left end of the filter bar, and the two things
  // wrong with that are the same thing twice. There are exactly three cuts and
  // they are cheap to try, so a menu hid two of them behind a click for no
  // saving in space; and the filter row answers "which rows", while this
  // answers "how are they arranged", which is a different question and reads
  // as one when it is on its own line.
  //
  // Drawn as a tab strip rather than as buttons: no strokes anywhere, each cut
  // a label and its glyph, and the one in force sitting on `bg-raised` — the
  // same surface `TabsIndicator` and the view toggle's pill use, so the app has
  // one way of saying "this one". No visible group label either; three named
  // cuts under a filter row say what they are. The name is still on the group
  // for anything that cannot see the arrangement.
  const groupRow = (
    <div role="group" aria-label="Group by" className="flex w-fit items-center gap-1">
      {GROUP_BY_LIST.map((value) => {
        const Icon = GROUP_ICONS[value];
        const on = groupBy === value;
        return (
          <Button
            key={value}
            type="button"
            variant="ghost"
            aria-pressed={on}
            onClick={() => setGroupBy(value)}
            className={cn(
              "px-2.5 whitespace-nowrap transition-colors",
              // `hover:bg-raised` is not redundant: `ghost` brings its own
              // `hover:bg-muted`, which would drop the active one a step on
              // hover, and a pill that changes under the cursor reads as a
              // control that is about to do something.
              on
                ? "bg-raised text-foreground hover:bg-raised"
                : "text-muted-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {GROUP_LABELS[value]}
          </Button>
        );
      })}
    </div>
  );

  // Choices come from what is actually on screen — a filter value that can only
  // ever return nothing is a click wasted.
  const options = useMemo(() => {
    const types = new Set(documents.map((d) => d.type));
    const parties = [...new Set(documents.map(partyName).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b),
    );
    const statuses = new Set(documents.map((d) => d.status));

    return {
      type: DOC_TYPE_LIST.filter((spec) => types.has(spec.code)).map(
        (spec) => ({
          value: spec.code,
          label: spec.label,
        }),
      ),
      party: parties.map((name) => ({ value: name, label: name })),
      status: (["draft", "finalized"] as const)
        .filter((s) => statuses.has(s))
        .map((s) => ({
          value: s,
          label: s === "draft" ? "Draft" : "Finalized",
        })),
    } satisfies Record<"type" | "party" | "status", FilterOption[]>;
  }, [documents]);

  // Which type columns the board draws, empty ones included. Every type this
  // profile can hold, so "no credit note this year" is something the board
  // says rather than something it omits — except on a per-type list, where
  // four empty columns would be four answers to a question nobody asked.
  const columnTypes = useMemo(() => {
    const present = new Set(documents.map((doc) => doc.type));
    if (hideTypeFilter) return [...present];
    const profiles = new Set(documents.map((doc) => profileOfDocType(doc.type)));
    return DOC_TYPE_LIST.filter((spec) =>
      profiles.has(profileOfDocType(spec.code)),
    ).map((spec) => spec.code);
  }, [documents, hideTypeFilter]);

  const hiddenFields = useMemo(() => {
    const hidden: FilterField[] = [];
    if (hideTypeFilter) hidden.push("type");
    if (options.party.length === 0) hidden.push("party");
    // Letters and contracts have no line items; offering a total filter here
    // would only ever empty the list.
    if (!documents.some(hasTotal)) hidden.push("total");
    return hidden;
  }, [hideTypeFilter, options.party.length, documents]);

  const visible = useMemo(() => {
    const kept = rows.length
      ? documents.filter((doc) => matchesFilters(doc, rows))
      : documents;
    return sortDocuments(kept, sort);
  }, [documents, rows, sort]);

  // Paged so a long list cannot push whatever follows it off the page — on the
  // contract list, that is the services section.
  const {
    page,
    pageCount,
    visible: pageRows,
    setPage,
    start,
  } = usePagedRows(visible);

  const router = useRouter();

  /*
    Only what may lawfully be deleted gets a checkbox. A finalized document is
    immutable (`CONTEXT.md` §4) and the persistence layer refuses to remove one,
    so offering it here would be offering an action the server says no to, one
    confirm dialog later. `DEV_UNLIMITED` is inlined at build time and is the
    same pre-launch escape hatch `DocumentRowActions` uses for the single-row
    delete; it is not in the production bundle.
  */
  const deletable = useCallback(
    (doc: AdminDocument) => doc.status === "draft" || DEV_UNLIMITED,
    [],
  );
  const docId = useCallback((doc: AdminDocument) => doc.id, []);
  const selection = useBulkSelect({ rows: pageRows, id: docId, deletable });

  /*
    One call per document rather than a batch action. There is no batched delete
    on the server and adding one would mean a second path that has to re-derive
    the auth and immutability checks `deleteDraftAction` already makes; the
    sequential loop reuses the checked path exactly.

    Refusals are counted and reported rather than swallowed. A server that says
    no to three of five must not look like a success — the list refreshes either
    way, so whatever survived is visible in the rows themselves.
  */
  const onBulkDelete = async () => {
    const chosen = selection.chosen;
    const results = await Promise.all(
      chosen.map((doc) => deleteDraftAction(doc.id)),
    );
    const refused = results.filter((r) => !r.success).length;
    selection.clear();
    router.refresh();
    if (refused > 0) {
      toast.error(
        `${refused} of ${chosen.length} could not be deleted. They are still in the list.`,
      );
    }
  };

  // A new filter set is a new list; page 3 of the old one means nothing, and
  // neither does a tick on a row it no longer contains.
  const onFiltersChange = (next: FilterRow[]) => {
    setRows(next);
    setPage(0);
    selection.clear();
  };

  // asc → desc → unsorted, so a column can always be put back.
  const onSortChange = (column: SortColumn) =>
    setSort((prev) => {
      if (prev?.column !== column) return { column, direction: "asc" };
      if (prev.direction === "asc") return { column, direction: "desc" };
      return null;
    });

  // Nothing to filter yet — the table's empty state says what to do instead.
  if (documents.length === 0) {
    return (
      <DocumentsTable
        documents={documents}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    );
  }

  return (
    // `gap-2`, the same 8px `FilterBar` puts between Sort and Add filter. The
    // bar and the table are one unit — every control in it changes what the
    // rows below say — and at 16px the bar floated between the page title and a
    // table it had no visible connection to. Matching the bar's own internal
    // spacing is what makes the two read as one block.
    <div
      className={cn(
        "flex flex-col gap-2",
        // The board fills the page and scrolls inside its columns, which is
        // the catalogue's arrangement and needs a height to resolve against
        // all the way up (`PageBody className="h-full min-h-0"`). Only here:
        // a table given a definite height would have to grow its own
        // scrollbar, and the page's is the one that should move.
        view === "board" && "min-h-0 flex-1",
      )}
    >
      <FilterBar
        rows={rows}
        onChange={onFiltersChange}
        fields={FILTER_FIELDS}
        icons={FIELD_ICONS}
        options={options}
        hiddenFields={hiddenFields}
        labels={{ party: partyFieldLabel(documents) }}
        // The sort control's only UI is the column headers, which neither the
        // cards nor the board have — offering it there would toggle nothing.
        // The board's own arrangement control is a row below, not here.
        leading={
          view === "table" ? (
            <SortToggle showSort={showSort} onToggle={toggleShowSort} />
          ) : null
        }
        // Right-hand end: this picks how the whole list is drawn, so it sits
        // apart from the controls that decide what is in it.
        trailing={viewToggle}
      />

      {/* Its own row, and only the view that has an arrangement to change. It
          stays above the "n of m shown" status line, so the two controls that
          decide what the board looks like are adjacent.

          The rule under it is what a strip with no strokes of its own needs:
          the pill says which cut is in force, and the line says where the
          controls stop and the board starts. */}
      {view === "board" ? (
        <>
          {groupRow}
          <Separator />
        </>
      ) : null}

      <p className="sr-only" role="status">
        {visible.length} of {documents.length} documents shown
      </p>

      {visible.length === 0 ? (
        <Empty className="border py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FilterX />
            </EmptyMedia>
            <EmptyTitle>No documents match these filters</EmptyTitle>
            <EmptyDescription>
              {documents.length} document
              {documents.length === 1 ? " is" : "s are"} hidden by the current
              filters.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              type="button"
              variant="outline"
              onClick={() => onFiltersChange([])}
            >
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          {view === "board" ? (
            // Every filtered row, not one page of them, and so no pager: see
            // `DocumentsKanban` on why a board that holds cards back misreports
            // the one thing it is for.
            <DocumentsKanban
              groups={groupDocuments(visible, groupBy, columnTypes)}
              groupBy={groupBy}
            />
          ) : view === "cards" ? (
            <>
              <DocumentsCards documents={pageRows} />
              {/* Cards have no card to sit in, so the pager stays under them. */}
              <Pagination
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
                label="documents"
              />
            </>
          ) : (
            <DocumentsTable
              documents={pageRows}
              selection={selection}
              sort={sort}
              // Omitted while the toggle is off — the headers then render as plain
              // text, which is `DocumentsTable`'s existing unsortable mode.
              onSortChange={showSort ? onSortChange : undefined}
              count={rowCountLabel(
                visible.length,
                "document",
                start,
                pageRows.length,
              )}
              pagination={
                <Pagination
                  page={page}
                  pageCount={pageCount}
                  onPageChange={setPage}
                  label="documents"
                />
              }
            />
          )}

          {/* Under the table and right-aligned, in normal flow rather than
              floating over it: a bar that overlays the last rows hides the
              very things about to be deleted. Cards get none — selection is a
              table affordance and a card has no checkbox column. */}
          {view === "table" ? (
            <BulkBar
              count={selection.count}
              noun="document"
              onClear={selection.clear}
              onDelete={onBulkDelete}
              consequence={DELETE_DRAFT_CONSEQUENCE}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
