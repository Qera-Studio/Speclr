"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
  LayoutGrid,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { removeService } from "@/server/actions/services";
import { SCHEDULES, type ScheduleKey } from "@/lib/domain/contract/schedules";
import { type ContractService } from "@/lib/domain/service";
import { formatINR } from "@/lib/domain/money";
import { NIL } from "@/lib/utils";
import { PageHeader } from "@/components/admin/Page";
import ServiceEditDialog from "@/components/admin/services/ServiceEditDialog";

const Heading = () => <PageHeader title="Services" />;

/**
 * The services library: one column per Schedule, every Service visible at once.
 *
 * A reference, not a chooser — assembling a contract happens on the contract's
 * own screen, where a card carries its description and its counts. Here the
 * question is only "what does the studio sell", so a card is its number, its
 * list price, its name, one line of what it is, and its classification.
 *
 * **Four columns, not one scrolling row.** The Schedules are the grouping that
 * matters — a Service belongs to exactly one, and which one decides how the
 * work is paid for, approved and owned — and a board says that in the layout
 * instead of in a tab strip and a set of dividers. It also removes the row's
 * horizontal scroll, which put two-thirds of the catalogue off-screen and took
 * a scroll-spy, a settle timer and a mask to make legible.
 *
 * Column order is `SCHEDULES` — the order an engagement runs in, which is also
 * the order the Schedules print in and the order the codes are numbered in.
 */
export default function ServiceCards({
  services,
}: {
  services: ContractService[];
}) {
  /**
   * The Service whose dialog is open, or null.
   *
   * The whole record rather than its code, so the dialog is keyed on it and
   * mounts fresh each time. Keeping a code here would mean re-finding the row
   * on every render for the one moment it is needed.
   */
  const [editing, setEditing] = useState<ContractService | null>(null);
  /** The column whose add card was clicked, or null. */
  const [adding, setAdding] = useState<ScheduleKey | null>(null);

  if (services.length === 0) {
    return (
      <>
        <Heading />
        <Empty className="mt-4 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package />
            </EmptyMedia>
            <EmptyTitle>No services yet</EmptyTitle>
            <EmptyDescription>
              Run the contract seed to load the services library.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <Heading />

      {/* Full height only where all four columns are side by side. Stacked, a
          column with its own scrollbar would be a scroll trap inside a page
          that is already scrolling. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:min-h-0 xl:flex-1 xl:grid-cols-4">
        {SCHEDULES.map((schedule) => {
          const mine = services.filter((s) => s.scheduleKey === schedule.key);

          return (
            <section
              key={schedule.key}
              aria-label={schedule.name}
              // Not `bg-sidebar`, which it was: that token is the page's own
              // ground now, so the column had no fill at all and the cards
              // floated on nothing. `bg-muted` is one step up the ramp, which
              // puts the column between the page and the cards' `bg-background`.
              className="flex min-h-0 flex-col rounded-md border border-border bg-muted"
            >
              {/* Add sits in the column header rather than at the foot of the
                  list: the column *is* the answer to "which Schedule", and up
                  here it is in the same place in every column instead of
                  wherever that column's cards happen to end. */}
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <h2 className="text-sm font-medium">{schedule.name}</h2>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm" icon
                    variant="ghost"
                    aria-label={`Add to ${schedule.name}`}
                    onClick={() => setAdding(schedule.key)}
                    className="size-7 text-muted-foreground"
                  >
                    <Plus />
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {mine.length}
                  </span>
                </div>
              </div>

              {/* The scroll lives here, not on the page: the Build column holds
                  most of the catalogue, and one long Schedule should not push
                  the other three off the bottom. The heading stays put outside
                  it, and so does the add button it carries. */}
              {/* `pb-2` so the last card ends clear of the column's bottom
                  edge rather than flush against it, which is what the add
                  button used to provide. */}
              <ul className="scrollbar-none flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-1 pb-1">
                {mine.map((service) => (
                  <li key={service.code}>
                    {/* `bg-background`, not `bg-card`: in dark mode `--card`
                        and `--sidebar` are the same value, so a card on the
                        column would dissolve into it. The page background
                        reads as a well the cards sit in. */}
                    <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
                      {/* The code as a badge and the item count as a chip: two
                          facts of different kinds, so they read as two chips at
                          opposite ends rather than as one run of muted text.
                          The count is a number and an icon, because "12 items"
                          spends four characters saying what the icon says. */}
                      {/* `rounded-sm` against the badge's own `rounded-full`,
                          and `h-6` against its `h-5`. A pill reads as a status
                          ("finalized", "overdue"), which is what the shape is
                          spent on everywhere else in the app; these two are a
                          filing code and a count, so a squarer container stops
                          them claiming a meaning they do not carry. Both quiet:
                          the code sits on the muted fill with no border and the
                          count carries a border with none, so each reads as a
                          label on the card rather than as a mark on it. */}
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="h-6 rounded-sm bg-muted px-2 text-xs font-normal text-muted-foreground tabular-nums"
                        >
                          {service.code}
                        </Badge>
                        {/* Absent rather than zero: a Service with no items yet
                            is a frame with nothing under it, and a chip reading
                            0 is a count that looks like a failure to load. */}
                        {service.items?.length ? (
                          <Badge
                            variant="outline"
                            className="ml-auto h-6 gap-1.5 rounded-sm bg-transparent px-2 text-xs font-normal text-muted-foreground tabular-nums [&>svg]:size-3!"
                          >
                            <LayoutGrid aria-hidden />
                            {service.items.length}
                            <span className="sr-only">
                              {service.items.length === 1 ? "item" : "items"}
                            </span>
                          </Badge>
                        ) : null}
                      </div>

                      {/* `-mt-1` against the card's own `gap-3`: the badge row
                          and the name are one block (what this is, and what it
                          is called), where the rule below separates that from
                          the card's furniture. The gap is tightened here rather
                          than on the card, which would have pulled the rule and
                          the SAC line up with it. */}
                      <div className="-mt-1 flex flex-col gap-1">
                        {/* The title is the way in, and now the only one: the
                            menu names the same destination in words for anyone
                            who does not think to click a heading. */}
                        <Link
                          href={`/client/services/${service.code}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {service.name}
                        </Link>
                        {/* One line, clipped. The full overview is contract
                            source material and belongs to the dialog; here it
                            is only enough to tell two similar names apart. */}
                        {service.overview[0] ? (
                          <span className="line-clamp-1 text-xs text-muted-foreground">
                            {service.overview[0]}
                          </span>
                        ) : null}
                        {/* The price last in the block, directly above the rule
                            and so directly above the SAC line under it: the
                            classification and what it costs end up adjacent,
                            which is the pair a quote is read off.

                            `mt-5` (24px counting the block's own `gap-1`)
                            rather than a wider gap on the block: the name and
                            its one-line description belong tight together, and
                            only the figure wants the air. Set at the
                            description's size, weight-carried rather than
                            size-carried, so it reads as the answer the name
                            asks for rather than as a second heading competing
                            with it. */}
                        <span className="mt-5 text-xs font-medium tabular-nums">
                          {service.ratePaise === undefined
                            ? "Quoted"
                            : service.scheduleKey === "retainer"
                              ? `${formatINR(service.ratePaise)} / mo`
                              : formatINR(service.ratePaise)}
                        </span>
                      </div>

                      <Separator />

                      {/* SAC left, actions right. The classification is the
                          quiet fact a card ends on, and the menu sits opposite
                          it rather than on the title row, where it would have
                          been a target beside the link that opens the page. */}
                      <div className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
                        <span>
                          {service.sacCode ? `SAC ${service.sacCode}` : NIL}
                        </span>
                        <ServiceCardMenu
                          service={service}
                          onEdit={() => setEditing(service)}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {editing ? (
        <ServiceEditDialog
          key={editing.code}
          service={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {adding ? (
        <ServiceEditDialog
          key={`add-${adding}`}
          scheduleKey={adding}
          startFrom={services}
          onClose={() => setAdding(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * A card's actions, behind one button in its bottom right corner.
 *
 * **It exists because "open" and "edit" are two different places and a card
 * had one target for both.** The title goes to the Service's own page, where
 * the items, the wording and the libraries are; the dialog is the five-field
 * pass over the name, the description, the rate and the SAC. A pencil on hover
 * said "edit" for both and named neither, so which one a click reached was
 * something a reader learned by being surprised once. The menu says them in
 * words: **Open page** is the title's own destination written down, and
 * **Quick edit** is the dialog, named for being the small pass rather than the
 * whole record.
 *
 * Three things about it are rules rather than this board's taste:
 *
 * - **The trigger names the Service, not just the action.** Reached out of the
 *   card's visual context, "More" could be about anything on a board of forty.
 *   `design-system.test.ts` fails an icon-only button that announces nothing.
 * - **The dialog is a sibling of the menu, never inside it.** An `AlertDialog`
 *   rendered within a menu item unmounts with the menu the instant the item is
 *   chosen, so it never opens. Hoisting it to component state is what makes it
 *   survive.
 * - **`AlertDialog`, not `Dialog`, for anything destructive** (`AGENTS.md`).
 *   Archiving is reversible and still confirms, because it takes a Service off
 *   every new contract and the way back is a route this board does not offer.
 */
function ServiceCardMenu({
  service,
  onEdit,
}: {
  service: ContractService;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const archive = () =>
    startTransition(async () => {
      const result = await removeService(service.code);
      if (result.success) router.refresh();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          /*
            **Opens on hover, and the two delays are what make that usable on a
            board rather than a nuisance.** These triggers sit in the same
            corner of every card in a packed column, so a pointer travelling to
            a card further down crosses the ones above it on the way. At
            base-ui's defaults (`delay` 100, `closeDelay` 0) that reads as menus
            flashing open and shut under a pointer that was only passing
            through.

            `delay: 250` is longer than a pass-through and shorter than a
            deliberate rest, so crossing a card costs nothing and stopping on
            one opens without a wait. `closeDelay: 150` covers the gap between
            the trigger and the popup: at 0, the diagonal from the button to the
            first item leaves the trigger before it reaches the menu, and the
            menu closes mid-reach.

            Click still works and is still what the keyboard uses, so nothing
            here is reachable by hover alone.
          */
          openOnHover
          delay={250}
          closeDelay={150}
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm" icon
              aria-label={`Actions for ${service.name}`}
              // `ml-auto` here rather than on a wrapper: the trigger is the
              // last thing in the row, so it is the one that pushes.
              className="-my-1 ml-auto size-7 text-muted-foreground"
            />
          }
        >
          <MoreHorizontal aria-hidden />
        </DropdownMenuTrigger>
        {/* Aligned to the trigger's right edge so the menu grows inward from
            the card rather than off the column, and opens upward where the
            card is near the bottom of a scrolling list. */}
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil aria-hidden />
            Quick edit
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<Link href={`/client/services/${service.code}`} />}
          >
            <ArrowUpRight aria-hidden />
            Open page
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirming(true)}
          >
            <Archive aria-hidden />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this service?</AlertDialogTitle>
            <AlertDialogDescription>
              It leaves the catalogue and stops being offered on new contracts.
              Contracts already holding it keep their own copy, and it stays
              readable for audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={archive}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
