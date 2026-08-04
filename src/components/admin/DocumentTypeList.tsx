import { AddLink } from '@/components/ui/add-button';
import DocumentsBrowser from './DocumentsBrowser';
import ReceiptForInvoiceButton from './ReceiptForInvoiceButton';
import type { DocTypeSpec } from '@/lib/domain/registry';
import type { AdminDocument } from '@/lib/domain/types';

/**
 * One document type's own list — drafts and issued together, newest first.
 *
 * The nav's document links land here rather than straight in a blank editor:
 * most visits are to find something already made, and "new" is one button away.
 *
 * The receipt list gets an extra shortcut to receipt the last invoice issued.
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
  const newHref = `/docs/new/${spec.slug}`;
  const newLabel = `New ${label}`;

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
          <AddLink href={newHref}>{newLabel}</AddLink>
        </div>
      </div>

      <DocumentsBrowser
        documents={documents}
        emptyTitle={`No ${label}s yet`}
        emptyDescription={`Nothing here yet — create the first ${label}.`}
        // Every row here is already this type, so that filter would do nothing.
        hideTypeFilter
        partyLabel={spec.kind === 'hr-letter' || spec.code === 'STP' ? 'Employee' : 'Client'}
      />
    </div>
  );
}
