import { AddLink } from "@/components/ui/add-button";
import { Shortcut } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { shortcutForSlug } from "./nav";
import DocumentsBrowser from "./DocumentsBrowser";
import ReceiptForInvoiceButton from "./ReceiptForInvoiceButton";
import { isHrDocType, type DocTypeSpec } from "@/lib/domain/registry";
import type { AdminDocument } from "@/lib/domain/types";
import { newDocHref } from "@/lib/profile";

/**
 * One document type's own list — drafts and issued together, newest first.
 *
 * The nav's document links land here rather than straight in a blank editor:
 * most visits are to find something already made, and "new" is one button away.
 *
 * The receipt list gets an extra shortcut to receipt the last invoice issued.
 *
 * The services library used to hang off the foot of the contract list, on the
 * argument that a Service exists to be pulled into a contract. It now has its
 * own page at `/client/services` — the list of what the studio sells is a thing
 * you go and read, not a footnote to however many contracts happen to exist.
 */
export default function DocumentTypeList({
  spec,
  documents,
  latestInvoice,
}: {
  spec: DocTypeSpec;
  documents: AdminDocument[];
  /** Only passed for the receipt list, and only when an invoice has been issued. */
  latestInvoice?: AdminDocument | null;
}) {
  const label = spec.label.toLowerCase();
  const newHref = newDocHref(spec.code, spec.slug);
  const newLabel = `New ${label}`;
  const shortcut = shortcutForSlug(spec.slug);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold">{spec.label}s</h1>
        <div className="flex flex-wrap items-start gap-2">
          {latestInvoice?.number ? (
            <ReceiptForInvoiceButton
              invoiceId={latestInvoice.id}
              invoiceNumber={latestInvoice.number}
            />
          ) : null}
          {shortcut ? (
            <Tooltip>
              <TooltipTrigger render={<AddLink href={newHref}>{newLabel}</AddLink>} />
              <TooltipContent>
                {newLabel}
                <Shortcut keys={["alt", shortcut]} />
              </TooltipContent>
            </Tooltip>
          ) : (
            <AddLink href={newHref}>{newLabel}</AddLink>
          )}
        </div>
      </div>

      <DocumentsBrowser
        documents={documents}
        emptyTitle={`No ${label}s yet`}
        emptyDescription={`Nothing here yet — create the first ${label}.`}
        // Every row here is already this type, so that filter would do nothing.
        hideTypeFilter
        partyLabel={isHrDocType(spec.code) ? "Employee" : "Client"}
      />
    </div>
  );
}
