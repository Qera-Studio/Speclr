'use client';

import type { ContractDocument } from '@/lib/domain/types';
import { contractBlocks, contractPageProps } from './sheets/ContractSheet';
import DocumentWorkspace from './DocumentWorkspace';
import PrintPages from './PrintPages';

/**
 * The contract's two read-only surfaces, on the client side of the boundary.
 *
 * A contract page carries a running header and footer, and the footer prints
 * the page number — so the chrome is a *function* of the page, and functions
 * cannot cross from a Server Component into a client one. Both routes that
 * render a finalized contract are server components, so the call to
 * `contractPageProps` happens here instead. The document itself is plain data
 * and crosses fine.
 *
 * The editor does not need either of these: it is already a client component
 * and spreads `contractPageProps` itself, because its preview is one of three
 * things the card might be showing.
 */

/** A finalized contract, previewed in the workspace with an actions rail. */
export function ContractWorkspace({
  doc,
  title,
  children,
}: {
  doc: ContractDocument;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <DocumentWorkspace title={title} preview={contractBlocks(doc)} {...contractPageProps(doc)}>
      {children}
    </DocumentWorkspace>
  );
}

/** The same pages, unscaled, for print and PDF export. */
export function ContractPrint({ doc }: { doc: ContractDocument }) {
  return <PrintPages {...contractPageProps(doc)}>{contractBlocks(doc)}</PrintPages>;
}
