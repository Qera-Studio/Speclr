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
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      host,
      setHost,
      count,
      register,
      title,
      setTitle,
      open,
      setOpen,
      setDirtyGuard,
      requestClose,
    }),
    [host, count, register, title, open, setDirtyGuard, requestClose],
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
 */
export function EditorPanelContent({
  children,
  title,
  autoOpen = false,
}: {
  children: React.ReactNode;
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

  if (!panel?.host) return <>{children}</>;
  return createPortal(children, panel.host);
}
