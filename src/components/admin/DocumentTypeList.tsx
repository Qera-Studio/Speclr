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
import ServiceCards from "./services/ServiceCards";
import { isHrDocType, type DocTypeSpec } from "@/lib/domain/registry";
import type { ContractService } from "@/lib/domain/contract/service";
import type { AdminDocument } from "@/lib/domain/types";

/**
 * One document type's own list — drafts and issued together, newest first.
 *
 * The nav's document links land here rather than straight in a blank editor:
 * most visits are to find something already made, and "new" is one button away.
 *
 * The receipt list gets an extra shortcut to receipt the last invoice issued.
 * The contract list carries the services library below it: a Service exists to
 * be pulled into a contract as a Part, so it belongs beside the contracts
 * rather than off in its own nav entry under Records.
 */
export default function DocumentTypeList({
  spec,
  documents,
  latestInvoice,
  services,
}: {
  spec: DocTypeSpec;
  documents: AdminDocument[];
  /** Only passed for the receipt list, and only when an invoice has been issued. */
  latestInvoice?: AdminDocument | null;
  /** Only passed for the contract list, which hosts the services section. */
  services?: ContractService[];
}) {
  const label = spec.label.toLowerCase();
  const newHref = `/docs/new/${spec.slug}`;
  const newLabel = `New ${label}`;
  const shortcut = shortcutForSlug(spec.slug);

  return (
    // `min-h-full` fills the inset's scroll area even when the list is short,
    // which is what gives the services section's `mt-auto` something to push
    // against. Without it the page would only be as tall as its content and
    // "bottom" would mean directly under the table.
    <div className="flex min-h-full flex-col gap-6 p-6">
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

      {/*
        Pinned to the foot of the card rather than trailing the contract list on
        a fixed margin: the gap a margin leaves depends on how many contracts
        there are, so it reads as wrong at most list lengths. `mt-auto` takes up
        whatever slack is left and collapses to nothing once the list is long
        enough to fill the card — at which point `pt-12` keeps the two sections
        apart. Separated by space alone; a rule read as one page split in two.
      */}
      {services ? (
        <div className="mt-auto pt-12">
          {/* The heading lives inside ServiceCards — it shares a row with the tabs. */}
          <ServiceCards services={services} />
        </div>
      ) : null}
    </div>
  );
}
