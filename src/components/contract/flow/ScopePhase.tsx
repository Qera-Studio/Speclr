"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { assemble } from "@/lib/domain/contract/assembly";
import { FEE_SECTION, unfilledByPart } from "@/lib/domain/contract/ledger";
import { addClientService } from "@/server/actions/clients";
import { cn } from "@/lib/utils";
import type { ClientRecord, ContractData } from "@/lib/domain/types";

/**
 * The row's chrome: present, and quiet until the row is approached.
 *
 * `opacity` rather than conditional rendering, so the row does not reflow as
 * the pointer crosses it and nothing under the cursor moves out from under it.
 *
 * **`group-focus-within` is the load-bearing half.** Opacity leaves a button
 * clickable and in the tab order, so hover alone would give a keyboard user
 * three invisible stops per row. Focusing any of them lights all three, which
 * is the same affordance the pointer gets.
 *
 * The size is stated here rather than taken from the `size` prop because this
 * list is not inside a `form`-sized `FieldGroup`, so `icon`'s own upscale
 * never fires and it resolves to a 28px box around a 14px glyph.
 *
 * The glyph rule repeats `size`'s own `:not([class*='size-'])` selector
 * verbatim, and that is not decoration: a plain `[&_svg]` loses to it on
 * specificity whatever order the classes land in, which is a measured 14px
 * rather than a guess.
 *
 * **32, not 36.** The box is the tallest thing in the row now that a done row
 * carries no second line, so it sets the row's height rather than fitting
 * inside it. At 36 the rows were visibly taller than their one line of text
 * needed, which is what made a centred row look top-aligned.
 */
const REVEALED =
  "size-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [&_svg:not([class*='size-'])]:size-4";

/**
 * What each chosen service covers, one row at a time.
 *
 * **Split back out of Services on 18 September 2026**, which is the second
 * move of this seam and worth recording so it is not made a third time. The
 * two were merged a week earlier on the argument that choosing a service and
 * saying what it covers are one job on one list. In use the merged phase was
 * one screen doing two things: the four Schedule tiles and their browse list
 * are a catalogue, and these rows are a checklist, and each was in the other's
 * way. The tiles moved as rows landed under them, and the rows were a running
 * commentary on a list nobody had finished reading.
 *
 * What the merge got right is kept: **the gate is still one question asked in
 * two halves**, and it lives here now rather than on Services. The counts say
 * nothing is missing; the acknowledgement says somebody looked. A Part seeded
 * from the client record arrives with its blanks already filled and never
 * passes through the sheet, so it reads as done before the operator has seen
 * it, which is exactly what `reviewedAll` is for (`contract/ledger.ts`).
 *
 * Nothing is stored twice across the split. Both phases render
 * `contract.parts`, so Services adding a row *is* this list growing
 * (`PRINCIPLES.md` rule 3).
 */
export default function ScopePhase({
  contract,
  client,
  onRemove,
  onOpen,
  onConfirm,
}: {
  contract: ContractData;
  /** Absent only if the client was archived or deleted after the draft began. */
  client?: ClientRecord;
  onRemove: (code: string) => void;
  /** Opens a service's scope sheet, which is where the blanks are filled. */
  onOpen: (code: string) => void;
  /** "Nothing to change" — the acknowledgement, for a row with no edits to make. */
  onConfirm: (code: string) => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);

  const assembled = assemble(contract.parts);
  const engaged = new Set(
    (client?.commercial?.services ?? []).map((s) => s.code),
  );
  /*
    The fee is left out and stays with the terms phase: a count here that
    included it would send the reader hunting for a field on another screen.
  */
  const counts = unfilledByPart(contract, { except: FEE_SECTION });
  const reviewed = new Set(contract.reviewed ?? []);

  /**
   * Put this service on the client's record too, at the rate agreed here.
   *
   * Idempotent and additive — see `addClientService`. The toast is the whole
   * feedback: the row is already on the contract, and what changed is somewhere
   * the operator is not looking.
   */
  const alsoAddToClient = async (code: string) => {
    if (!client) return;
    setSaving(code);
    const result = await addClientService(client.id, { code });
    setSaving(null);
    if (!result.success) {
      toast.error(result.error ?? "Failed to update the client.", {
        duration: 10000,
      });
      return;
    }
    toast(`Added to ${client.name}'s record`);
  };

  /*
    Nothing chosen yet, which is only reachable by arriving here directly or by
    removing the last row. It names the phase that fixes it rather than
    restating that the list is empty: the four Schedule tiles are one step back
    and are the way in.
  */
  if (contract.parts.length === 0) {
    return (
      <p className="text-body text-muted-foreground">
        No services on this contract yet. Pick them on the Services step, then
        come back to say what each one covers.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body text-muted-foreground">
        Open each service to say what it covers, or confirm the ones with
        nothing to change.
      </p>

      <ul className="flex flex-col gap-2">
        {assembled.flatMap(({ parts }) =>
          parts.map(({ part }) => {
            const unfilled = counts.get(part.code) ?? 0;
            const confirmed = reviewed.has(part.code);
            const done = unfilled === 0 && confirmed;

            return (
              <li
                key={part.code}
                className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
              >
                {/*
                The ledger's tick. It is the one thing neither the merge nor
                the split could drop: a Part seeded from the client record
                arrives with its blanks already filled and reads as done
                without anybody having opened it, so "nothing is missing" and
                "somebody looked" are two different questions
                (`contract/ledger.ts`).

                Centred on the row, with no nudge of its own. It was pulled to
                the top while a row could run to two lines and the tick had to
                find the *name's* line; a done row carries no second line any
                more, so the row's own centring is the answer and an `mt` on
                top of it would push the tick off that line.
              */}
                <span
                  aria-hidden
                  className={
                    done
                      ? "flex size-3 shrink-0 items-center justify-center rounded-[3px] bg-primary text-primary-foreground"
                      : "flex size-3 shrink-0 items-center justify-center rounded-[3px] bg-muted text-muted-foreground"
                  }
                >
                  {/* `stroke-[3]` because the glyph is now 10px: at the default
                    1.5 weight a tick that small reads as a smudge. */}
                  {done ? <Check className="size-2.5 stroke-[3]" /> : null}
                </span>

                {/* The code is gone from under the name. It took a row of its own
                  to print two digits that identify a service to this app and to
                  nobody reading the contract. What stands there now is what the
                  row still needs, which is the thing worth a second line. */}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="min-w-0 truncate text-body font-medium">
                    {part.name}
                  </span>
                  {/*
                  A done row says so with the tick and nothing else. "Ready"
                  under every finished name was a second line repeating what
                  the blue box already states, on the rows that need the least
                  said about them.

                  The other two states keep their line, because neither is
                  derivable from an empty checkbox: one names *how many* blanks
                  are left, and the other distinguishes "nothing missing" from
                  "not yet looked at", which is the whole reason the
                  acknowledgement exists (`contract/ledger.ts`).
                */}
                  {done ? null : (
                    <span className="min-w-0 truncate text-meta text-muted-foreground">
                      {unfilled > 0
                        ? `${unfilled} to fill`
                        : "Nothing missing, not yet confirmed"}
                    </span>
                  )}
                </span>

                {/*
                The three controls are one cluster, not three items in the
                row's own `gap-3`. That gap is there to separate the tick from
                the name and the name from the chrome; applied *between* the
                icons as well it spaced them as if each were a different kind
                of thing. Their 36px boxes already carry the padding they need,
                so the cluster sets no gap at all.
              */}
                <span className="flex shrink-0 items-center">
                  {/*
                Offered only where the record does not already say it. A service
                the client is engaged for has nothing to add, and a button that
                writes what is already there is a button that teaches nothing.

                An icon rather than a labelled button: it is the secondary act
                on the row (what matters here is what this contract covers, not
                what the client's record says), and four words of chrome on
                every card said so louder than the service's own name. The
                tooltip carries the sentence the label used to, and the
                `aria-label` carries it for a screen reader, which never sees
                the hover this button waits for.
              */}
                  {client && !engaged.has(part.code) ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm" icon
                            // Subtle blue: it is an offer, not a warning, and it
                            // sits beside a destructive bin that owns the row's one
                            // strong colour.
                            className={cn(
                              REVEALED,
                              "text-primary/70 hover:text-primary",
                            )}
                            disabled={saving === part.code}
                            aria-label={`Also add ${part.name} to ${client.name}'s record`}
                            onClick={() => alsoAddToClient(part.code)}
                          />
                        }
                      >
                        <UserPlus />
                      </TooltipTrigger>
                      <TooltipContent>connect service to client</TooltipContent>
                    </Tooltip>
                  ) : null}

                  {client && engaged.has(part.code) ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          // Not in `REVEALED`: this is a *state*, not an
                          // affordance, and a state that appears only under the
                          // pointer is a state nobody can survey.
                          <span
                            className="flex size-8 shrink-0 items-center justify-center text-muted-foreground"
                            aria-label={`Already on ${client.name}'s record`}
                          />
                        }
                      >
                        <Check className="size-4" />
                      </TooltipTrigger>
                      <TooltipContent>On their record</TooltipContent>
                    </Tooltip>
                  ) : null}

                  {/*
                Offered only where it is the whole remaining job. A row with
                blanks still empty is confirmed by filling them, and a button
                that could tick a row while it is short would be a way to walk
                past the guard rather than through it.
              */}
                  {unfilled === 0 && !confirmed ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      // Visible always, unlike the three icons: it is the row's
                      // one remaining job stated in words, and a job that hides
                      // until hovered is a job nobody knows is outstanding.
                      //
                      // `mr-2` because it shares the icons' gapless cluster: a
                      // labelled button butting straight against the pencil reads
                      // as part of the same control.
                      className="mr-2 shrink-0"
                      onClick={() => onConfirm(part.code)}
                    >
                      Nothing to change
                    </Button>
                  ) : null}

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm" icon
                          className={REVEALED}
                          aria-label={`Open ${part.name}`}
                          onClick={() => onOpen(part.code)}
                        />
                      }
                    >
                      <Pencil />
                    </TooltipTrigger>
                    {/* "Edit", not "What it covers": the sentence was the phase's
                    instruction rather than this control's name, and it is
                    already the paragraph above the list. A tooltip restating
                    the screen is a tooltip nobody reads twice. */}
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>

                  {/*
                Removing stays on this row as well as being a click on the
                Services list. A service that turns out not to belong is
                usually found here, while reading what it would commit the
                studio to, and sending that discovery back a step to act on
                would be the merge's problem in reverse.

                A bin in `RemoveButton`'s colours rather than that component
                itself, and the difference is the confirmation. `RemoveButton`
                asks before it destroys, which is right for a row of typed
                figures; this takes a service back off a contract, and the
                Services list one step away puts it back in one click. A
                dialog guarding a reversible act teaches the reader to dismiss
                dialogs.
              */}
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm" icon
                          className={cn(
                            REVEALED,
                            "text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive",
                          )}
                          aria-label={`Remove ${part.name}`}
                          onClick={() => onRemove(part.code)}
                        />
                      }
                    >
                      <Trash2 />
                    </TooltipTrigger>
                    <TooltipContent>Remove</TooltipContent>
                  </Tooltip>
                </span>
              </li>
            );
          }),
        )}
      </ul>
    </div>
  );
}
