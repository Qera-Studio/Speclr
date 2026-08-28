'use client';

import type { QuotationDocument } from '@/lib/domain/types';
import { quotationBlocks, quotationPageProps } from './sheets/QuotationSheet';
import DocumentWorkspace from './DocumentWorkspace';
import PrintPages from './PrintPages';

/**
 * The quotation's two read-only surfaces, mirroring `ContractPages.tsx` for
 * the same reason: `quotationPageProps` is plain data and both the workspace
 * preview and the print route need the identical pairing, or paper and screen
 * could disagree about where a page breaks.
 */

/** A finalized quotation, previewed in the workspace with an actions rail. */
export function QuotationWorkspace({
  doc,
  title,
  children,
}: {
  doc: QuotationDocument;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <DocumentWorkspace title={title} preview={quotationBlocks(doc)} {...quotationPageProps(doc)}>
      {children}
    </DocumentWorkspace>
  );
}

/** The same pages, unscaled, for print and PDF export. */
export function QuotationPrint({ doc }: { doc: QuotationDocument }) {
  return <PrintPages {...quotationPageProps(doc)}>{quotationBlocks(doc)}</PrintPages>;
}
