"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * What kind of document the page is showing, published to the header.
 *
 * `breadcrumbForPath` derives the whole trail from the path, which is right
 * for every route whose path says what it is. A document's does not: it is
 * `/client/docs/<uuid>`, and the uuid is the only thing distinguishing a
 * contract from a pay slip. So the trail read **"Documents / Documents /
 * 7505ad80-…"** — the profile's home, then a grouping crumb wearing the same
 * word, then thirty-six characters of hex.
 *
 * The type lives in the database, so the page is the only thing that can
 * answer. This publishes it upward, exactly as `PageHeaderSlot` publishes the
 * pager: a value registered by the chrome and filled from inside the page.
 *
 * **It names the type, never the trail.** The header still decides what the
 * crumbs are and how they link; this only supplies the fact the path could not
 * carry. A page that sets nothing gets the derived trail unchanged.
 */

interface DocumentCrumbValue {
  /** The type's label ("Contract"), or null on a page that is not a document. */
  label: string | null;
  setLabel: (label: string | null) => void;
}

const DocumentCrumbContext = createContext<DocumentCrumbValue | null>(null);

export function DocumentCrumbProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  const value = useMemo(() => ({ label, setLabel }), [label]);
  return <DocumentCrumbContext value={value}>{children}</DocumentCrumbContext>;
}

export function useDocumentCrumb(): string | null {
  return useContext(DocumentCrumbContext)?.label ?? null;
}

/**
 * Declares the document type for the trail above. Renders nothing.
 *
 * Cleared on unmount, or navigating from a contract to a page with no type
 * would leave the contract's word in the trail — the stale-value bug every
 * publish-upward context has, and the reason this is a component with an
 * effect rather than a call in a render body.
 */
export function DocumentCrumbLabel({ label }: { label: string }) {
  const ctx = useContext(DocumentCrumbContext);
  const setLabel = ctx?.setLabel;
  useEffect(() => {
    if (!setLabel) return;
    setLabel(label);
    return () => setLabel(null);
  }, [label, setLabel]);
  return null;
}
