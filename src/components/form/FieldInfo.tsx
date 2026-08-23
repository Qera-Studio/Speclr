"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { FieldLabel, FieldLegend } from "@/components/ui/field";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * A field label with an optional explanation behind an info icon.
 *
 * Standing helper text under a field pushes the layout around and shouts at
 * someone who has done nothing wrong; the icon says "there is something to know
 * here" without taking a row.
 *
 * Two things it gets right that are easy to get wrong:
 *
 *  - The icon sits **beside** the `<label>`, never inside it. Anything within a
 *    label becomes part of the input's accessible name, so an icon in there
 *    would rename the field.
 *  - It is a real `<button>`, not a hover-only affordance, so the explanation
 *    is reachable by keyboard. Where the message is also *news* (a field that
 *    just became read-only, say), the caller should still put it in a
 *    `role="status"` region — a tooltip is not announced.
 *
 * `optional` is the one marker a field carries, and it is deliberately the
 * *minority* mark rather than the conventional required asterisk. Which
 * minority that is depends on the form: on the identity step roughly half the
 * fields are required, so the handful that are not say so; on the tax, contacts,
 * commercial and access steps **every field is optional** (`domain/client.ts`
 * says so at the top and means it), and there the marker would land on all of
 * them, which is no marker at all. Those steps say it once, in prose, at the
 * top. So: mark the few, never the many, and never both ways in one app.
 *
 * The word sits *inside* the `<label>`, unlike the icon beside it. It is part
 * of what the field is, so "Phone, optional" is the correct announcement; an
 * icon in there would rename the field with something unreadable instead.
 */
export default function FieldInfo({
  htmlFor,
  label,
  info,
  infoLabel,
  optional,
}: {
  htmlFor: string;
  label: string;
  /** The explanation. Omit it and no icon is rendered. */
  info?: string;
  /** Accessible name for the icon button, e.g. "Why is this required?". */
  infoLabel?: string;
  /** Say so, on a form where most fields are not. See above. */
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <FieldLabel htmlFor={htmlFor}>
        {label}
        {optional ? <OptionalMark /> : null}
      </FieldLabel>
      <InfoTip info={info} label={infoLabel ?? `About ${label}`} />
    </div>
  );
}

/**
 * The marker itself, for the few labels that are not a `FieldInfo`: a
 * `FieldLabel` written out by hand beside a switch, say.
 *
 * Muted and at rest: it is a permission, not an instruction, and a field that
 * asks for nothing should not be the loudest thing in the column.
 */
export function OptionalMark() {
  return (
    <span className="font-normal text-muted-foreground">, optional</span>
  );
}

/**
 * The same thing for a `FieldSet` legend, which names a section rather than a
 * control.
 *
 * It exists because six callers were hand-rolling the same row, and every one
 * of them had the icon sitting low — `FieldLegend` carried a bottom margin and
 * flex centres the *margin* box, so the text rode four pixels above the icon.
 * The margin is gone from the legend itself; this is here so the next section
 * heading does not rebuild the row a seventh time.
 *
 * `action` puts a control on the far right of the heading, for a section that
 * is switched on and off as a whole. A `<legend>` is not a `<label>`, so
 * whatever goes in there carries its own `aria-label` containing the visible
 * heading text (WCAG 2.5.3): the heading names the section for a sighted
 * reader, and the control has to name itself for everyone else.
 */
export function LegendInfo({
  children,
  info,
  label,
  action,
}: {
  children: ReactNode;
  info?: string;
  label: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-6 items-center gap-1.5">
      <FieldLegend variant="label">{children}</FieldLegend>
      <InfoTip info={info} label={label} />
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}

/**
 * The icon on its own, for headings a `FieldLabel` cannot serve — a `FieldSet`
 * legend, a section title.
 *
 * Same contract as above: a real `<button>` so the explanation is reachable by
 * keyboard, and `info` omitted renders nothing at all rather than an icon that
 * says nothing.
 */
export function InfoTip({
  info,
  label,
  className,
}: {
  info?: string;
  label: string;
  /** Positioning only, for a heading that is not a row of its own. */
  className?: string;
}) {
  if (!info) return null;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            className={cn(
              "text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground",
              className,
            )}
          />
        }
      >
        <Info className="size-3.5" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>{info}</TooltipContent>
    </Tooltip>
  );
}
