"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FilterX,
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
import {
  tabPillSurface,
  tabsListVariants,
  useTabDrag,
} from "@/components/ui/tabs";
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
import DocumentsTable from "./DocumentsTable";
import {
  FILTER_FIELDS,
  hasTotal,
  matchesFilters,
  sortDocuments,
  type FilterField,
  type FilterOption,
  type FilterRow,
  type SortColumn,
  type SortState,
} from "@/lib/domain/documentQuery";
import { partyName } from "@/lib/domain/party";
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
 * Where the table-or-cards choice is remembered. Table by default: it is the
 * denser of the two and the one this tool was built around.
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

type View = "table" | "cards";

const VIEW_TABS = [
  { value: "table", label: "List", icon: Rows3 },
  { value: "cards", label: "Cards", icon: LayoutGrid },
] as const satisfies readonly {
  value: View;
  label: string;
  icon: LucideIcon;
}[];

export default function DocumentsBrowser({
  documents,
  emptyTitle,
  emptyDescription,
  /** Hidden on a per-type list, where every row is already the same type. */
  hideTypeFilter = false,
  /** What the party column holds here: "Client", "Employee", or both. */
  partyLabel = "Client / employee",
}: {
  documents: AdminDocument[];
  emptyTitle?: string;
  emptyDescription?: string;
  hideTypeFilter?: boolean;
  partyLabel?: string;
}) {
  const [rows, setRows] = useState<FilterRow[]>([]);
  const [sort, setSort] = useState<SortState | null>(null);
  const [showSort, toggleShowSort] = useShowSort();
  const [view, setView] = useState<View>("table");
  /** The pill is draggable here exactly as it is on a real tab strip. */
  const viewDrag = useTabDrag();

  // Read on mount, not in a lazy initializer: this component server-renders,
  // and reading localStorage during the first render would mismatch hydration.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(VIEW_KEY) === "cards") setView("cards");
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
  // not exist. The container classes are shared with `TabsList` so the two
  // still look like siblings.
  //
  // The pill glides rather than blinking, and it does so without measuring
  // anything: the segments are an equal-width grid, so the pill is exactly one
  // segment wide and a 100% translate lands precisely on the second. That is
  // why the labels are not free-width — `TabsIndicator` needs Base UI to
  // measure the active tab onto CSS variables, and there is no tab here to
  // measure. Add a third view and the grid columns go with it.
  const viewToggle = (
    <div
      role="group"
      aria-label="View"
      {...viewDrag}
      className={cn(
        tabsListVariants(),
        // `grid-cols-2` sizes both columns to the wider label, which is what
        // keeps the pill's width honest.
        "relative grid h-8 shrink-0 grid-cols-2",
      )}
    >
      {/* `data-drag-pill` / `data-drag-segment` are what `useTabDrag` looks for
          in a strip Base UI did not build. The transform is written out rather
          than left to `translate-x-full`, because the drag adds to it. */}
      <span
        aria-hidden="true"
        data-drag-pill=""
        style={{
          transform: `translateX(calc(${view === "cards" ? "100%" : "0px"} + var(--tab-drag, 0px)))`,
        }}
        className={cn(
          "pointer-events-none absolute inset-y-[3px] left-[3px] z-0 w-[calc(50%-3px)] rounded-md",
          tabPillSurface,
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
            "relative z-10 inline-flex h-full items-center justify-center gap-1.5 rounded-md px-2.5",
            "text-xs font-medium whitespace-nowrap transition-colors",
            "text-foreground/60 hover:text-foreground dark:text-muted-foreground",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            "aria-pressed:text-foreground dark:aria-pressed:text-foreground",
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {label}
        </button>
      ))}
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

  // A new filter set is a new list; page 3 of the old one means nothing.
  const onFiltersChange = (next: FilterRow[]) => {
    setRows(next);
    setPage(0);
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
    <div className="flex flex-col gap-4">
      <FilterBar
        rows={rows}
        onChange={onFiltersChange}
        fields={FILTER_FIELDS}
        icons={FIELD_ICONS}
        options={options}
        hiddenFields={hiddenFields}
        labels={{ party: partyLabel }}
        // The sort control's only UI is the column headers, which cards don't
        // have — offering it there would toggle nothing.
        leading={
          view === "table" ? (
            <SortToggle showSort={showSort} onToggle={toggleShowSort} />
          ) : null
        }
        // Right-hand end: this picks how the whole list is drawn, so it sits
        // apart from the controls that decide what is in it.
        trailing={viewToggle}
      />

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
          {view === "cards" ? (
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
        </>
      )}
    </div>
  );
}
