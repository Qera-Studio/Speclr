'use client';

import { Info } from 'lucide-react';
import { FieldLabel } from '@/components/ui/field';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
 */
export default function FieldInfo({
  htmlFor,
  label,
  info,
  infoLabel,
}: {
  htmlFor: string;
  label: string;
  /** The explanation. Omit it and no icon is rendered. */
  info?: string;
  /** Accessible name for the icon button, e.g. "Why is this required?". */
  infoLabel?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {info ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={infoLabel ?? `About ${label}`}
                className="text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground"
              />
            }
          >
            <Info className="size-3.5" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>{info}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
