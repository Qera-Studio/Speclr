import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Where a value came from, said under the field that holds it.
 *
 * The app derives four things the operator used to type: an invoice's place of
 * supply, its due date, the zero-rating label, and a client's PAN out of their
 * GSTIN. Each is a real improvement over asking (`PRINCIPLES.md` rule 3) and
 * each one arrives on screen the same way a bug does: a value the reader did
 * not enter, in a field they were about to. **A derivation with no explanation
 * reads as a guess**, and the operator's only options are to trust it or retype
 * it, which is the field they were spared coming back with less information.
 *
 * So it is said in place rather than behind the info icon. The icon is right
 * for the standing rule (what place of supply *is*, which is the same on every
 * document); it is wrong for the answer on this one, because a reader checking
 * a value should not have to discover that there is something to open. The two
 * split along that line everywhere this is used.
 *
 * One component rather than a muted `<p>` per site, for the reason
 * `CONTEXT.md` §5e gives about `DateCell`: three hand-written versions of the
 * same note become three weights of the same fact. It also stays out of
 * `FieldDescription`, which is banned outside `ui/` and is standing helper text
 * for a field, not a statement about its current value.
 *
 * Not announced. The value it explains is in the input beside it and is read
 * out with the field; a live region here would interrupt the form on every
 * keystroke that changed a date.
 */
export function DerivedNote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      data-slot="derived-note"
      className={cn("text-xs/relaxed text-muted-foreground", className)}
    >
      {children}
    </p>
  );
}
