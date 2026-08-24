'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * The app-level edit surface.
 *
 * `AdminShell` renders one right-hand rail for the whole admin area; any page
 * can fill it by rendering `<EditorPanelContent>`. The content is *portalled*
 * into a shell-owned node rather than passed up as props, because the page
 * always sits below the shell in the React tree — a document editor computes
 * its live preview and its form fields from the same state, so the form has to
 * stay in the editor's own tree while its DOM lands in the rail.
 *
 * Panels register on mount so the rail knows whether the current page has
 * anything editable; with none, its expand button is disabled.
 */

type DirtyGuard = () => boolean;

type EditorPanelContextValue = {
  /** The rail's portal target. Null until the rail mounts (or when absent). */
  host: HTMLElement | null;
  setHost: (node: HTMLElement | null) => void;
  /**
   * A second target, below the scrolling area. A page's primary actions belong
   * here: in the rail proper they scroll away under a long form, and the one
   * control someone is looking for is the one they cannot reach.
   */
  footerHost: HTMLElement | null;
  setFooterHost: (node: HTMLElement | null) => void;
  /**
   * A third target: a drawer that slides over the rail from the right, for a
   * body of editing that is its own subject rather than one more field. The
   * document wording uses it — thirty inputs that are read together when they
   * are read at all, and that used to be a dialog over the preview they change.
   */
  overlayHost: HTMLElement | null;
  setOverlayHost: (node: HTMLElement | null) => void;
  /** The open drawer's title, shown beside its back arrow. Null when closed. */
  drawer: string | null;
  setDrawer: (title: string | null) => void;
  /** How many panels are currently mounted — drives the rail's enabled state. */
  count: number;
  register: () => () => void;
  /** Title shown in the rail header, set by the mounted panel. */
  title: string | null;
  setTitle: (title: string | null) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  /**
   * Registered by a panel that owns unsaved input. Returns true when it is safe
   * to close/switch; a panel with pending edits confirms with the user first.
   */
  setDirtyGuard: (guard: DirtyGuard | null) => void;
  requestClose: () => void;
};

const EditorPanelContext = createContext<EditorPanelContextValue | null>(null);

export function EditorPanelProvider({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [footerHost, setFooterHost] = useState<HTMLElement | null>(null);
  const [overlayHost, setOverlayHost] = useState<HTMLElement | null>(null);
  const [drawer, setDrawer] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [title, setTitle] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const dirtyGuard = useRef<DirtyGuard | null>(null);

  const register = useCallback(() => {
    setCount((n) => n + 1);
    return () => setCount((n) => Math.max(0, n - 1));
  }, []);

  const setDirtyGuard = useCallback((guard: DirtyGuard | null) => {
    dirtyGuard.current = guard;
  }, []);

  // Closing is routed through the guard so a panel with unsaved input can veto
  // it (and prompt) rather than silently discarding what the user typed.
  const requestClose = useCallback(() => {
    if (dirtyGuard.current && !dirtyGuard.current()) return;
    // A collapsed rail must not keep a drawer open behind it, or expanding it
    // again lands on the drawer rather than on the form.
    setDrawer(null);
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      host,
      setHost,
      footerHost,
      setFooterHost,
      overlayHost,
      setOverlayHost,
      drawer,
      setDrawer,
      count,
      register,
      title,
      setTitle,
      open,
      setOpen,
      setDirtyGuard,
      requestClose,
    }),
    [
      host,
      footerHost,
      overlayHost,
      drawer,
      count,
      register,
      title,
      open,
      setDirtyGuard,
      requestClose,
    ],
  );

  return <EditorPanelContext.Provider value={value}>{children}</EditorPanelContext.Provider>;
}

/**
 * Read the panel context. Returns null outside a provider — the signed-out
 * layout renders no shell, so consumers must degrade rather than throw.
 */
export function useEditorPanel(): EditorPanelContextValue | null {
  return useContext(EditorPanelContext);
}

/**
 * Fills the app rail with `children`.
 *
 * When there is no rail — the signed-out layout renders no shell, and a
 * component may be rendered on its own in a test — the content falls back to
 * rendering *in place* rather than disappearing. Dropping it would mean a
 * missing shell silently costs the page its form; rendering in place degrades
 * to the pre-rail layout instead.
 *
 * `autoOpen` expands the rail on mount; document editors want this (the form is
 * the point of the page), record managers do not (the rail opens on "Add").
 *
 * `footer` lands below the scrolling area instead, so a page's primary action
 * stays on screen however long its form runs.
 */
export function EditorPanelContent({
  children,
  footer,
  title,
  autoOpen = false,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  title?: string;
  autoOpen?: boolean;
}) {
  const panel = useEditorPanel();
  const register = panel?.register;
  const setTitle = panel?.setTitle;
  const setOpen = panel?.setOpen;

  useEffect(() => {
    if (!register) return;
    return register();
  }, [register]);

  useEffect(() => {
    if (!setTitle) return;
    setTitle(title ?? null);
    return () => setTitle(null);
  }, [setTitle, title]);

  useEffect(() => {
    if (autoOpen) setOpen?.(true);
  }, [autoOpen, setOpen]);

  if (!panel?.host) {
    return (
      <>
        {children}
        {footer}
      </>
    );
  }
  return (
    <>
      {createPortal(children, panel.host)}
      {/* Before the rail's footer node exists there is nowhere to put it; it
          arrives on the same commit, so this is one frame at most. */}
      {footer && panel.footerHost ? createPortal(footer, panel.footerHost) : null}
    </>
  );
}
