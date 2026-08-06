"use client";

import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/**
 * One collapsible block of the editor rail.
 *
 * The rail is 384px wide and every document now has an input for every word it
 * prints, so a flat form would be a scroll of forty fields with the three you
 * actually change buried in it. Sections that are edited on every document
 * (client, dates, line items, body) open by default; the ones that are right
 * almost always — terms, masthead, footer, the signatory block — stay closed
 * until you want them.
 *
 * Uncontrolled: `defaultOpen` seeds it and the user's toggling is theirs. That
 * matters because the preview re-renders on every keystroke, and a controlled
 * open state would have to survive each of those.
 *
 * Mirrors the trigger pattern in `LineItemsEditor` — a real `<button>` with
 * `aria-expanded` (Base UI's `Collapsible.Trigger` supplies it), so the
 * sections are reachable by keyboard and announced as what they are.
 */
export default function EditorSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  /** One short line under the title — what this section governs. */
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="group/section rounded-lg border border-border"
      data-slot="editor-section"
    >
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex w-full items-top gap-2 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            <ChevronRight
              aria-hidden="true"
              className="size-3 shrink-0 mt-[4px] text-muted-foreground transition-transform duration-200 group-data-[open]/section:rotate-90"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {title}
              </span>
              {description ? (
                <span className="block truncate text-xs text-muted-foreground">
                  {description}
                </span>
              ) : null}
            </span>
          </button>
        }
      />
      <CollapsibleContent>
        <div className="flex flex-col gap-4 border-t border-border p-3">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
