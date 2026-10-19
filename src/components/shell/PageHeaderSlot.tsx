"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/**
 * A portal host on the app header's row, for what a page wants to put beside
 * its breadcrumbs.
 *
 * The document workspace is the caller: its title and page controls used to be
 * a bar of their own directly under the breadcrumb row, which put two headers
 * on one screen saying where you were. They are one row now, and this is how
 * content from inside the page reaches it.
 *
 * Same mechanism as `EditorPanel`'s rail, and deliberately so: a host node
 * registered by the chrome, filled by a portal from the page. A second way of
 * doing the same thing is a second thing to keep in step.
 *
 * Nothing here is state the page owns twice. `DocumentWorkspace` still holds
 * the page count and the current page; only the DOM lands up here.
 */

interface PageHeaderContextValue {
  setHost: (node: HTMLElement | null) => void;
  host: HTMLElement | null;
}

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderSlotProvider({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ host, setHost }), [host]);
  return <PageHeaderContext value={value}>{children}</PageHeaderContext>;
}

export function usePageHeaderSlot(): PageHeaderContextValue | null {
  return useContext(PageHeaderContext);
}

/**
 * Puts `children` on the header row.
 *
 * With no host it renders **in place**, the same degradation
 * `EditorPanelContent` makes and for the same reason: a missing shell must not
 * silently cost the page its content. What travels through here is the
 * document's title, its autosave line and its pager, and an autosave indicator
 * that quietly disappears is worse than one in the wrong place. Every
 * production route renders inside `AdminShell`, so the fallback is for the
 * signed-out layout and for a component rendered on its own in a test.
 */
export function PageHeaderSlot({ children }: { children: ReactNode }) {
  const slot = usePageHeaderSlot();
  if (!slot?.host) return <>{children}</>;
  return createPortal(children, slot.host);
}
