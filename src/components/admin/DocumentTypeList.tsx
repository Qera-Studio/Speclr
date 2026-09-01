import { AddLink } from "@/components/ui/add-button";
import { Shortcut } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { shortcutForSlug } from "./nav";
import DocumentsBrowser from "./DocumentsBrowser";
import { PageBody, PageHeader } from "./Page";
import ReceiptForInvoiceButton from "./ReceiptForInvoiceButton";
import type { DocTypeSpec } from "@/lib/domain/registry";
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
    // Full height for the same reason as the profile homes: see `HomeRoute`.
    <PageBody className="h-full min-h-0">
      <PageHeader title={`${spec.label}s`}>
        {latestInvoice?.number ? (
          <ReceiptForInvoiceButton
            invoiceId={latestInvoice.id}
            invoiceNumber={latestInvoice.number}
          />
        ) : null}
        {shortcut ? (
          <Tooltip>
            <TooltipTrigger render={<AddLink href={newHref} variant="outline">
                {newLabel}
              </AddLink>} />
            <TooltipContent>
              {newLabel}
              <Shortcut keys={["alt", shortcut]} />
            </TooltipContent>
          </Tooltip>
        ) : (
          <AddLink href={newHref} variant="outline">
                {newLabel}
              </AddLink>
        )}
      </PageHeader>

      <DocumentsBrowser
        documents={documents}
        emptyTitle={`No ${label}s yet`}
        emptyDescription={`Nothing here yet — create the first ${label}.`}
        // Every row here is already this type, so that filter would do nothing.
        // What the party field is *called* used to be passed from here too; it
        // is derived from the rows now, so the profile homes get it right as
        // well (`partyFieldLabel`).
        hideTypeFilter
      />
    </PageBody>
  );
}
