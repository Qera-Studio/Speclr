"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  ArrowUpRight,
  Columns3,
  Filter,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import ServiceEditDialog from "@/components/admin/services/ServiceEditDialog";
import { SCHEDULE_ICONS } from "@/components/contract/scheduleIcons";
import { removeService, restoreService } from "@/server/actions/services";
import { SCHEDULES, type Schedule, type ScheduleKey } from "@/lib/domain/contract/schedules";
import type { ContractService } from "@/lib/domain/service";
import { formatQuote } from "@/lib/domain/quotation";
import { accentBadge, type Accent } from "@/lib/accent";
import { cn } from "@/lib/utils";

/**
 * The service catalogue: everything the studio sells, by Schedule.
 *
 * Redrawn on 16 October 2026 from a trial approved on `/preview/services-trial`,
 * in the quiet style: a centred 980px column, hairlines at half strength, ink
 * rather than fills on hover, colour only where it groups (the code chip takes
 * its Schedule's accent). Two views of one list, cards by section and a board
 * by column, sharing one card and one menu.
 *
 * **The card is the way into the Service's own page**, where the items, the
 * wording and the libraries are; the corner square is its menu. A card cannot
 * be both a link and an add button, and the page is what a card is about.
 */

/**
 * Quiet controls: no fill on hover, the ink and the hairline strengthen
 * instead. Hairline to `muted-foreground` rather than full ink, which read as
 * a black box around every control under the pointer.
 */
const QUIET =
  // `tab-label`, two shades under muted text: as light as a label can go and
  // still clear 4.5:1 (measured in `contrast.test.ts`). Hover is one step,
  // to muted text and a label-grey hairline, never to full ink.
  "border-border/50 text-tab-label hover:border-tab-label/50 hover:bg-transparent hover:text-muted-foreground dark:bg-transparent";

/** The page's one filled action. Ink rather than the blue primary, on trial here. */
const INK = "bg-foreground text-background hover:bg-foreground/85";

const VIEWS = [
  { key: "cards", label: "Cards", icon: LayoutGrid },
  { key: "board", label: "Board", icon: Columns3 },
] as const;
type View = (typeof VIEWS)[number]["key"];

const SORTS = [
  { key: "catalogue", label: "Catalogue order" },
  { key: "name", label: "Name" },
  { key: "price", label: "Price" },
] as const;
type Sort = (typeof SORTS)[number]["key"];

/**
 * A list price, without paise when there are none: these are round figures a
 * quote starts from, and ".00" on every card is noise (`formatQuote`, the
 * quotation's own rule). Real paise still print.
 */
function priceOf(service: ContractService) {
  if (service.ratePaise === undefined) return "Quoted";
  return service.scheduleKey === "retainer"
    ? `${formatQuote(service.ratePaise)} / mo`
    : formatQuote(service.ratePaise);
}

/**
 * A board column's ground: its Schedule's accent at a few percent, so the four
 * read as four without a border between them. Written out because Tailwind
 * only builds class names it can see.
 */
const COLUMN_WASH: Record<Accent, string> = {
  violet: "bg-accent-violet/4 dark:bg-accent-violet/6",
  cyan: "bg-accent-cyan/4 dark:bg-accent-cyan/6",
  teal: "bg-accent-teal/4 dark:bg-accent-teal/6",
  green: "bg-accent-green/4 dark:bg-accent-green/6",
  amber: "bg-accent-amber/4 dark:bg-accent-amber/6",
  orange: "bg-accent-orange/4 dark:bg-accent-orange/6",
  rose: "bg-accent-rose/4 dark:bg-accent-rose/6",
  magenta: "bg-accent-magenta/4 dark:bg-accent-magenta/6",
};

/** Lowest first, with quoted-per-engagement Services after every priced one. */
function byPrice(a: ContractService, b: ContractService) {
  return (a.ratePaise ?? Infinity) - (b.ratePaise ?? Infinity);
}

export default function ServiceCatalogue({
  services,
}: {
  /** Every Service, archived ones included: the Archived tab reads them. */
  services: ContractService[];
}) {
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [query, setQuery] = useState("");
  const [schedules, setSchedules] = useState<ScheduleKey[]>([]);
  const [sort, setSort] = useState<Sort>("catalogue");
  const [view, setView] = useState<View>("cards");
  /** The Service whose dialog is open. The record, so the dialog mounts fresh. */
  const [editing, setEditing] = useState<ContractService | null>(null);
  /** Adding: the Schedule it was asked for from, or "any" from the header. */
  const [adding, setAdding] = useState<ScheduleKey | "any" | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = services.filter(
      (s) =>
        s.archived === (tab === "archived") &&
        (schedules.length === 0 || schedules.includes(s.scheduleKey)) &&
        (!q ||
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          (s.blurb ?? "").toLowerCase().includes(q)),
    );
    if (sort === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "price") return [...list].sort(byPrice);
    return list;
  }, [services, tab, query, schedules, sort]);

  const narrowed = query.trim() !== "" || schedules.length > 0;
  const columns = SCHEDULES.filter(
    (s) => schedules.length === 0 || schedules.includes(s.key),
  );
  const clear = () => {
    setQuery("");
    setSchedules([]);
  };

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[980px] flex-col gap-9 pt-12",
        // The board is held to the inset's height, so the page never scrolls
        // and each lane scrolls its own cards. The cards view is a long page
        // and scrolls like one.
        view === "board" ? "h-full min-h-0 pb-8" : "pb-16",
      )}
    >
      <div className="flex flex-col gap-9">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-display font-medium">Services</h1>
            <p className="text-lead font-normal text-muted-foreground">
              Everything the studio sells, by Schedule
            </p>
          </div>
          <Button variant="primary" className={INK} onClick={() => setAdding("any")}>
            <Plus aria-hidden />
            Add service
          </Button>
        </header>

        <div className="flex items-center justify-between gap-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList aria-label="Which services">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3">
            <div className="relative w-56">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-tab-label"
              />
              <Input
                type="search"
                aria-label="Search services"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-7 border-border/50 pl-8 hover:border-tab-label/50"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="sm" className={QUIET} />}>
                <Filter aria-hidden />
                Filter
                {schedules.length ? (
                  <span className="text-tab-label tabular-nums">{schedules.length}</span>
                ) : null}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                {SCHEDULES.map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s.key}
                    checked={schedules.includes(s.key)}
                    onCheckedChange={(on) =>
                      setSchedules((now) =>
                        on ? [...now, s.key] : now.filter((k) => k !== s.key),
                      )
                    }
                  >
                    {s.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="sm" className={QUIET} />}>
                <ArrowUpDown aria-hidden />
                Sort
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as Sort)}>
                  {SORTS.map((s) => (
                    <DropdownMenuRadioItem key={s.key} value={s.key} closeOnClick>
                      {s.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Icons only, at the toolbar's 28px: two choices both on show
                beat a menu that hides one. Each is named for a screen reader
                and in a tooltip, since the glyph alone names nothing. */}
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList size="sm" aria-label="View">
                {VIEWS.map((v) => (
                  <Tooltip key={v.key}>
                    {/* The tab outside, the tooltip trigger as what it
                        renders: the other way round, the tooltip's
                        `data-slot` overwrote the tab's, and the drag, which
                        finds tabs by that slot, had nothing to land on. */}
                    <TabsTrigger
                      value={v.key}
                      aria-label={v.label}
                      className="px-2"
                      render={<TooltipTrigger />}
                    >
                      <v.icon aria-hidden />
                    </TabsTrigger>
                    <TooltipContent>{v.label}</TooltipContent>
                  </Tooltip>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {shown.length === 0 ? (
        narrowed ? (
          <EmptyState
            preset="no-matches"
            noun="service"
            action={
              <Button size="sm" className={QUIET} onClick={clear}>
                Clear search and filters
              </Button>
            }
          />
        ) : tab === "archived" ? (
          <EmptyState
            preset="none-yet"
            noun="archived service"
            description="An archived service leaves the catalogue and every new contract. It shows here, and can be restored."
          />
        ) : (
          <EmptyState
            preset="none-yet"
            noun="service"
            description="Run the contract seed to load the services library."
          />
        )
      ) : view === "cards" ? (
        <div className="flex flex-col gap-12">
          {columns.map((schedule) => {
            const mine = shown.filter((s) => s.scheduleKey === schedule.key);
            if (mine.length === 0) return null;
            return (
              <section key={schedule.key} aria-label={schedule.name} className="flex flex-col gap-4">
                <SectionHead
                  schedule={schedule}
                  count={mine.length}
                  onAdd={tab === "active" ? () => setAdding(schedule.key) : undefined}
                />
                <ul className="grid grid-cols-3 gap-4">
                  {mine.map((service) => (
                    <li key={service.code}>
                      <ServiceCard
                        service={service}
                        schedule={schedule}
                        onEdit={() => setEditing(service)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        // Lanes 28% of the column wide: three in view and the start of the
        // fourth, which is what says the row scrolls. One row the height of
        // what is left of the inset, so a long lane stops at the inset's foot
        // and scrolls inside rather than taking the page with it.
        <div className="grid min-h-0 flex-1 auto-cols-[28%] grid-flow-col grid-rows-[minmax(0,1fr)] items-start gap-3 overflow-x-auto overflow-y-hidden">
          {columns.map((schedule) => {
            const mine = shown.filter((s) => s.scheduleKey === schedule.key);
            return (
              <section
                key={schedule.key}
                aria-label={schedule.name}
                className={cn("flex max-h-full min-h-0 min-w-0 flex-col gap-4 rounded-lg p-3", COLUMN_WASH[schedule.accent])}
              >
                <div className="px-1 pt-1">
                  <SectionHead
                    schedule={schedule}
                    count={mine.length}
                    onAdd={tab === "active" ? () => setAdding(schedule.key) : undefined}
                  />
                </div>
                {mine.length ? (
                  <ul className="scrollbar-none flex min-h-0 flex-col gap-3 overflow-y-auto">
                    {mine.map((service) => (
                      <li key={service.code}>
                        <ServiceCard
                          service={service}
                          schedule={schedule}
                          onEdit={() => setEditing(service)}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  // An empty column keeps its place, so the four stay four, and
                  // says so in the column rather than leaving a hole.
                  <p className="px-1 pb-2 text-meta text-tab-label">
                    Nothing here
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}

      {editing ? (
        <ServiceEditDialog key={editing.code} service={editing} onClose={() => setEditing(null)} />
      ) : null}
      {adding ? (
        <ServiceEditDialog
          key={`add-${adding}`}
          scheduleKey={adding === "any" ? undefined : adding}
          startFrom={services.filter((s) => !s.archived)}
          onClose={() => setAdding(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * A section's heading, in both views: the Schedule's name, its count, and an
 * add square that files the new Service under it. No icon: the cards carry it.
 */
function SectionHead({
  schedule,
  count,
  onAdd,
}: {
  schedule: Schedule;
  count: number;
  onAdd?: () => void;
}) {
  return (
    <div className="flex h-6 items-center gap-2">
      <h2 className="text-lead font-normal text-muted-foreground">{schedule.name}</h2>
      <span className="text-meta text-tab-label tabular-nums">{count}</span>
      {onAdd ? (
        <Button
          size="sm"
          icon
          aria-label={`Add to ${schedule.name}`}
          onClick={onAdd}
          className={cn("ml-auto size-6", QUIET)}
        >
          <Plus aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}

/**
 * One Service. The name is the link, and its `after` box stretches over the
 * card, so the whole card opens the page while the link keeps one accessible
 * name. The menu sits above that box (`relative z-10`) and takes its hover
 * state from the card, so it is found without being hunted for.
 *
 * One card for both views. The board had a compact one while its lanes were a
 * quarter of the page; at 28% they are nearly a card's width, so the reason
 * for a second shape went with them.
 */
function ServiceCard({
  service,
  schedule,
  onEdit,
}: {
  service: ContractService;
  schedule: Schedule;
  onEdit: () => void;
}) {
  const Icon = SCHEDULE_ICONS[schedule.key];
  return (
    // The ring is the card's when its link has keyboard focus: the link
    // fills the card, so the card is what was focused.
    <div className="group/card relative flex h-full flex-col justify-between gap-6 rounded-lg border border-border/50 bg-background p-3 transition-colors hover:border-muted-foreground/50 has-[a:focus-visible]:ring-forced">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            <Link
              href={`/client/services/${service.code}`}
              className="truncate text-lead outline-none after:absolute after:inset-0 after:rounded-lg"
            >
              {service.name}
            </Link>
          </div>
          <CardMenu service={service} onEdit={onEdit} />
        </div>
        {/* `min-h-10` holds two lines, so a short description does not pull
            the footer up and break the row's baseline. */}
        <p className="line-clamp-2 min-h-10 text-body text-muted-foreground">
          {service.blurb ?? service.overview[0]}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 text-meta tabular-nums">
        {/* The Schedule's accent, quiet: the hue groups, the text names it. */}
        {/* Shorter and tighter than the shared badge (16px, 4px in), so the
            code is a label on the card rather than a second heading. The text
            stays at the 11px floor. */}
        <span className={accentBadge(schedule.accent, "h-4 px-1", true)}>{service.code}</span>
        <span className={service.ratePaise === undefined ? "text-tab-label" : "text-muted-foreground"}>
          {priceOf(service)}
        </span>
      </div>
    </div>
  );
}

/**
 * A card's actions. Archive confirms because it takes a Service off every new
 * contract; restore does not, because it only puts one back.
 *
 * The confirmation is a sibling of the menu, never inside it: a dialog
 * rendered within a menu item unmounts with the menu the instant the item is
 * chosen, so it would never open.
 */
function CardMenu({
  service,
  onEdit,
}: {
  service: ContractService;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (action: typeof removeService) =>
    startTransition(async () => {
      const result = await action(service.code);
      if (result.success) {
        setConfirming(false);
        router.refresh();
      }
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="sm"
              icon
              aria-label={`Actions for ${service.name}`}
              className={cn(
                "relative z-10 size-6 shrink-0 group-hover/card:border-tab-label/50 group-hover/card:text-muted-foreground",
                QUIET,
              )}
            />
          }
        >
          <MoreHorizontal aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          {service.archived ? null : (
            <DropdownMenuItem onClick={onEdit}>
              <Pencil aria-hidden />
              Quick edit
            </DropdownMenuItem>
          )}
          <DropdownMenuItem render={<Link href={`/client/services/${service.code}`} />}>
            <ArrowUpRight aria-hidden />
            Open page
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {service.archived ? (
            <DropdownMenuItem onClick={() => run(restoreService)}>
              <ArchiveRestore aria-hidden />
              Restore
            </DropdownMenuItem>
          ) : (
            // Not `destructive`: archiving is reversible from the Archived tab,
            // and red is for what cannot be taken back.
            <DropdownMenuItem onClick={() => setConfirming(true)}>
              <Archive aria-hidden />
              Archive
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Archive service"
        consequence="It leaves the catalogue and stops being offered on new contracts. Contracts already holding it keep their own copy, and it can be restored from the Archived tab."
        confirmLabel="Archive service"
        pending={pending}
        onConfirm={() => run(removeService)}
      />
    </>
  );
}
