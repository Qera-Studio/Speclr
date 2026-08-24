"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye } from "lucide-react";
import { useEditorPanel } from "@/components/admin/EditorPanel";

/**
 * Every printed *word* of a document, behind one row and an eye.
 *
 * The rail had four collapsed cards for it — declarations, terms, heading,
 * footer — and they sat under the fields that are actually edited: the client,
 * the dates, the lines and the tax. That is the wrong ratio. The wording is
 * right on almost every document and wrong on almost none, so four cards spend
 * four rows of a 384px rail saying "not this one" and push the ones that matter
 * up out of reach.
 *
 * It was a dialog first, and a dialog was wrong for a reason worth writing
 * down: it covered the preview. Every field in here changes a word that is
 * printed a few centimetres to the left, and a sheet drawn over the document
 * hides the only thing that says whether the edit was right. So it is a
 * **drawer over the rail** instead — the form slides left, the wording slides
 * in over it, and the document stays where it was.
 *
 * Nothing about how they save changes: the fields inside still write straight
 * through `patchContent` to the same draft autosave as everything else, so
 * closing the drawer is not a commit and there is no cancel to get wrong.
 *
 * With no rail to slide over — a test, or the signed-out layout — it falls back
 * to rendering in place, the same degradation `EditorPanelContent` makes.
 */
export default function WordingDrawer({
  label,
  description,
  children,
}: {
  /** The row's own name — what this document calls its wording. */
  label: string;
  /** One line under it, naming what is inside. */
  description: string;
  children: React.ReactNode;
}) {
  const panel = useEditorPanel();
  const host = panel?.overlayHost ?? null;
  const [inline, setInline] = useState(false);
  const open = host ? panel?.drawer === label : inline;

  // A drawer belongs to the editor that opened it. Leaving the page without
  // this leaves the rail showing an empty drawer over the next page's form.
  const setDrawer = panel?.setDrawer;
  useEffect(() => () => setDrawer?.(null), [setDrawer]);

  return (
    <>
      {/* The whole row, not the icon alone. The eye is what says the row opens
          something, and a 16px target inside a full-width row that does nothing
          is a row people click twice. */}
      <button
        type="button"
        onClick={() => (host ? panel?.setDrawer(label) : setInline(!inline))}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{label}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {description}
          </span>
        </span>
        <Eye aria-hidden="true" className="size-4 text-muted-foreground" />
      </button>

      {!open ? null : host ? (
        createPortal(
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Every word this document prints that is not a fixed label. Edits
              save as you type and are frozen onto the document when it is
              finalized.
            </p>
            {children}
          </div>,
          host,
        )
      ) : (
        <div className="flex flex-col gap-3">{children}</div>
      )}
    </>
  );
}
