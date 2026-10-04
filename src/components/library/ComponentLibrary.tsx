"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CATALOGUE, entryOf, type LibraryEntry } from "./catalogue";
import { Archive, Download, Trash2 } from "lucide-react";
import { ButtonSpecimens } from "./ButtonSpecimens";
import { IconSpecimens } from "./IconSpecimens";
import { TableSpecimens } from "./TableSpecimens";
import { DrawerTrigger, LivePager, Specimen } from "./Specimen";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import IconAction from "@/components/ui/icon-action";
import { Button } from "@/components/ui/button";
import { DrawerSheet } from "@/components/ui/drawer-sheet";
import { DrawerToolbar } from "@/components/ui/drawer-toolbar";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * The component library: every component the app is allowed to use, with every
 * variation of it, live.
 *
 * **This is where a component is decided.** A change to a primitive is made,
 * looked at and tried here first, and because the page imports the real thing
 * from `src/components/ui/`, there is no second step where it "ships": the four
 * callers of `Pagination` and this page are one import of one file. A library
 * that held its own copies would be a place for the app to disagree with its
 * own documentation, which is the failure `CONTEXT.md` §5e describes one layer
 * down.
 *
 * It supersedes `/admin/kit`, which is a flat scroll of static examples with no
 * way to drive any of them. The three things that page could not do are the
 * three reasons this one exists: a component is addressable (so a variant can
 * be linked to in a review), every variant is named and explained rather than
 * merely shown, and the specimens are wired to real state, which is the only
 * way behaviour rather than appearance can be finalised.
 *
 * **The rule is not restated here.** Each component points at its section of
 * `docs/design.md`, which is the law, and at its source file. A page that
 * paraphrased the rule would be a second copy to fall out of step with it.
 */
export default function ComponentLibrary() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const entry = entryOf(params.get("component") ?? undefined);

  /*
    `replace`, not `push`, and `scroll: false`. Moving between components is
    changing what the page is showing rather than navigating away from it, so it
    should not fill the back button with one entry per component looked at. Same
    call the onboarding flow makes for its step.
  */
  const select = (slug: string) =>
    router.replace(`${pathname}?component=${slug}`, { scroll: false });

  return (
    <div className="flex h-full min-h-0 w-full">
      {/*
        The rail. A fixed 13rem rather than a fraction: it holds one short word
        per row at every window size, and a percentage would make the reading
        column narrower on exactly the wide screens where the specimens want the
        room.
      */}
      <nav
        aria-label="Components"
        className="flex w-52 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border bg-sidebar p-2"
      >
        {/* Sentence case at 12px muted, not small caps. The hierarchy is
            carried by colour, which is how every other group heading in the app
            says "this is a name, not a value" (§1.4, enforced). */}
        <h2 className="px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground">
          Components
        </h2>
        {CATALOGUE.map((item) => {
          const current = item.slug === entry.slug;
          return (
            <button
              key={item.slug}
              type="button"
              onClick={() => select(item.slug)}
              /*
                `aria-current="true"`, not `"page"`. Nothing here is a page: the
                rail switches what the one page shows, and the URL it writes is
                a parameter rather than a route. `"page"` would tell a screen
                reader this is the document they are on, which the pager's own
                numbers in the pane below already say about something else.
              */
              aria-current={current || undefined}
              className={cn(
                "rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                current
                  ? "bg-sidebar-active font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-hover hover:text-sidebar-accent-foreground",
              )}
            >
              {item.name}
            </button>
          );
        })}
      </nav>

      {/* The only thing that scrolls. `min-h-0` or the flex child is floored at
          its content height and the rail scrolls the whole page instead. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <EntryPane entry={entry} />
      </div>
    </div>
  );
}

/** One component: what it is, where it lives, and every variant of it. */
function EntryPane({ entry }: { entry: LibraryEntry }) {
  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">{entry.name}</h1>
        <p className="text-sm text-muted-foreground">{entry.blurb}</p>
        {/*
          The two ways out of this page: the file to edit, and the rule that
          governs it. Both as text rather than links: the source is a repo path
          with no URL in this app, and `docs/design.md` is a file in the editor
          beside it. A link that went nowhere would be worse than a path that
          can be pasted into a search.
        */}
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Source</dt>
            <dd className="font-mono">{entry.source}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt>Rule</dt>
            <dd>
              <code className="font-mono">docs/design.md {entry.rule}</code>
            </dd>
          </div>
        </dl>
      </header>

      <div className="flex flex-col gap-4">
        {entry.slug === "pagination" ? (
          <PaginationSpecimens entry={entry} />
        ) : null}
        {entry.slug === "button" ? <ButtonSpecimens entry={entry} /> : null}
        {entry.slug === "icons" ? <IconSpecimens entry={entry} /> : null}
        {entry.slug === "table" ? <TableSpecimens entry={entry} /> : null}
        {entry.slug === "drawer" ? <DrawerSpecimens entry={entry} /> : null}
      </div>
    </article>
  );
}

/**
 * The four shapes a pager takes, each at the length that produces it.
 *
 * The lengths are not illustrative, they are the boundaries: 1 and 6 and 7 are
 * where the component changes shape, so a variant drawn at 20 pages would show
 * the windowed form without showing *why* six is where it starts. The windowed
 * one opens mid-list because both anchors and a full window only coexist away
 * from the ends, which is the case the merge rule is the exception to.
 */
function PaginationSpecimens({ entry }: { entry: LibraryEntry }) {
  const [single, short, windowed, merged] = entry.variants;

  return (
    <>
      <Specimen name={single.name} note={single.note} empty>
        <LivePager pageCount={1} />
      </Specimen>
      <Specimen name={short.name} note={short.note} stage="sidebar">
        <LivePager pageCount={6} />
      </Specimen>
      <Specimen name={windowed.name} note={windowed.note} stage="sidebar">
        <LivePager pageCount={23} start={9} />
      </Specimen>
      {/*
        The last page, not the first. Both merges are the same rule, but the
        leading one is what every long list shows on open, so a specimen sitting
        there would be demonstrating the shape the reader already knows. The
        trailing one is only reached by walking to the end, which is exactly
        what a library is for.
      */}
      <Specimen name={merged.name} note={merged.note} stage="sidebar">
        <LivePager pageCount={23} start={22} />
      </Specimen>
    </>
  );
}

/**
 * The drawer, opened over the page it would really cover.
 *
 * **One frame, not a row of variants.** There is only one drawer in this app
 * and the library should say so: the toolbar, the pager, the expand and the
 * two kinds of footer are all things *this* frame does, not five drawers to
 * choose between. Showing them as separate specimens made the component look
 * like a family it is not.
 *
 * It opens into the real inset card, through `InsetContext`, exactly as every
 * drawer in the app does. An earlier version gave each specimen its own
 * bounded stage so several could sit on one page; with one frame that is no
 * longer needed, and a drawer shown at a made-up size is a drawer nobody has
 * actually looked at. The scrim, the float, the width and the way expanding
 * moves it are all the real ones.
 *
 * The switch under the trigger picks which footer the frame carries, because
 * that is the one axis with two legitimate answers: a row of controls for a
 * drawer saved on a button, a quiet status line for one that saves as you
 * type. Same frame either way.
 */
function DrawerSpecimens({ entry }: { entry: LibraryEntry }) {
  const [only] = entry.variants;
  return (
    <Specimen name={only.name} note={only.note}>
      <DrawerSpecimen />
    </Specimen>
  );
}

/** How the one frame saves, which is the only thing there is to choose. */
type SaveStyle = "button" | "auto";

/** The list the pager walks, so "3 of 5" is walking something real. */
const RECORDS = [
  "Definitions and Interpretation",
  "Structure and Order of Precedence",
  "Mutual Obligations",
  "Scope and Additional Work",
  "Communication and Notices",
];

function DrawerSpecimen() {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<SaveStyle>("button");
  const [expanded, setExpanded] = useState(false);
  const [at, setAt] = useState(2);

  const [value, setValue] = useState(RECORDS[2]);
  const saved = useRef(value);
  const [state, setState] = useState<"idle" | "unsaved" | "saved">("idle");
  const dirty = value !== saved.current;

  /*
    The debounce is real, so the status line moves through "Unsaved changes"
    and settles on "Saved" a moment after the typing stops. Nothing is written
    anywhere: what is on show is the footer's behaviour, which is that it
    takes no room at all when it has nothing to say.
  */
  useEffect(() => {
    if (style !== "auto" || state !== "unsaved") return;
    const timer = setTimeout(() => setState("saved"), 800);
    return () => clearTimeout(timer);
  }, [style, state, value]);

  const page = (by: -1 | 1) => {
    const to = Math.min(RECORDS.length - 1, Math.max(0, at + by));
    setAt(to);
    setValue(RECORDS[to]);
    saved.current = RECORDS[to];
    setState("idle");
  };

  const type = (next: string) => {
    setValue(next);
    if (style === "auto") setState("unsaved");
  };

  return (
    <>
      <div className="flex items-center gap-3">
        {/*
          Which footer the frame carries. A radio group rather than two
          triggers, because these are two answers to one question about one
          component, and two buttons would read as two components again.
        */}
        <fieldset className="flex items-center gap-1.5">
          <legend className="sr-only">How it saves</legend>
          {(["button", "auto"] as const).map((option) => (
            <label
              key={option}
              className={cn(
                "cursor-pointer rounded-md px-2 py-1 text-xs transition-colors",
                style === option
                  ? "bg-sidebar-active font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-hover",
              )}
            >
              <input
                type="radio"
                name="drawer-save"
                className="sr-only"
                checked={style === option}
                onChange={() => {
                  setStyle(option);
                  setState("idle");
                  saved.current = value;
                }}
              />
              {option === "button" ? "Saved on a button" : "Saved as you type"}
            </label>
          ))}
        </fieldset>

        <DrawerTrigger label="Open the drawer" onClick={() => setOpen(true)} />
      </div>

      <DrawerSheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          // Closing is the end of the read, so the next one opens as a drawer
          // rather than remembering it was expanded. The clause library makes
          // the same call.
          if (!next) setExpanded(false);
        }}
        /*
          The clause drawer's own sizes and scrim weights, because they are the
          decision worth looking at. The scrim follows the panel's size: both
          answer the same question, which is how much of the page behind is
          still being read. `lg` is nine tenths of the card, and floating in
          both states is what makes expanding a resize rather than a change of
          kind.
        */
        size={expanded ? "lg" : "md"}
        float
        overlayClassName={cn(
          "supports-backdrop-filter:backdrop-blur-none",
          expanded ? "bg-black/40" : "bg-black/10",
        )}
        // Titled from the field below it, so the header tracks what is typed.
        title={value || "Untitled"}
        titleAside={
          <Badge variant="outline" className="tabular-nums">
            {at + 1}
          </Badge>
        }
        toolbar={
          <DrawerToolbar
            onBack={() => setOpen(false)}
            backLabel="Back to the list"
            expanded={expanded}
            onExpandedChange={setExpanded}
            expandLabel="this record"
            /*
              By position, never by arithmetic on an identifier: a number that
              is never reissued leaves gaps, so `id + 1` pages into nothing.
            */
            paging={{
              onPage: page,
              hasPrevious: at > 0,
              hasNext: at < RECORDS.length - 1,
              position: `${at + 1} of ${RECORDS.length}`,
            }}
            /*
              The clause library's own right-hand group, in its order: rising
              consequence, with the destructive one last and furthest from the
              back arrow. They do nothing here; what they are showing is the
              row's shape and the tooltips.
            */
            actions={
              <>
                <IconAction
                  icon={Download}
                  label="Download the list"
                  tooltip="Download as MD"
                  onClick={() => {}}
                />
                <IconAction
                  icon={Archive}
                  label="Archive this record"
                  tooltip="Archive"
                  onClick={() => {}}
                />
                <ConfirmActionButton
                  variant="ghost"
                  size="icon-sm"
                  label="Delete this record"
                  tooltip="Delete"
                  icon={<Trash2 className="size-3.5" />}
                  title="Delete this record"
                  description="Nothing is deleted here: this is the library. On a real drawer this is the one action that cannot be undone, which is why it is confirmed and sits furthest from the back arrow."
                  confirmLabel="Delete"
                  confirmVariant="destructive"
                  onConfirm={() => {}}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                />
              </>
            }
          />
        }
        quietFooter={style === "auto"}
        footer={
          style === "auto" ? (
            <p
              role="status"
              aria-live="polite"
              className="px-4 py-2 text-xs text-muted-foreground empty:hidden"
            >
              {state === "unsaved"
                ? "Unsaved changes"
                : state === "saved"
                  ? "Saved"
                  : ""}
            </p>
          ) : (
            <>
              <p
                className="mr-auto text-xs text-muted-foreground"
                role="status"
              >
                {dirty ? "Unsaved changes" : "Nothing to save"}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!dirty}
                onClick={() => {
                  saved.current = value;
                  setOpen(false);
                }}
              >
                Save
              </Button>
            </>
          )
        }
        bodyClassName="flex flex-col gap-4"
      >
        <Field>
          <FieldLabel htmlFor="specimen-title">Title</FieldLabel>
          <Input
            id="specimen-title"
            value={value}
            placeholder="A title, at the size a drawer title is set"
            onChange={(e) => type(e.target.value)}
          />
        </Field>

        {/* Enough to scroll, because a body that fits says nothing about the
            one property this frame is built around: the header and footer
            stay put while this column moves. */}
        <div className="flex flex-col gap-3 text-xs text-muted-foreground">
          {Array.from({ length: 14 }, (_, i) => (
            <p key={i}>
              Paragraph {i + 1}. Placeholder body copy, here to give the drawer
              something to scroll. The toolbar above and the footer below do not
              move with it.
            </p>
          ))}
        </div>
      </DrawerSheet>
    </>
  );
}
