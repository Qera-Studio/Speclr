'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Shortcut } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import { DOCUMENT_SECTIONS, type NavLink } from './nav';

/**
 * ⌘D — start a new document.
 *
 * The app exists to issue documents, so the fastest possible path to a blank
 * one is the shortcut worth spending. It is deliberately *not* the ⌘K header
 * search: ⌘K finds a document that exists, ⌘D makes one that doesn't, and
 * merging them would make both vaguer.
 *
 * Nothing here writes to the database. Every row navigates to
 * `/docs/new/<slug>`, which renders a blank editor; `createDraft` still owns
 * row creation when the editor is saved, so no abandoned palette visit can
 * burn a document number.
 *
 * The type list is read from `DOCUMENT_SECTIONS` rather than the registry so
 * the palette's groups, labels, icons and order can never drift from the nav's.
 */

type NewDocumentContextValue = { open: () => void };

const NewDocumentContext = createContext<NewDocumentContextValue | null>(null);

export function useNewDocument(): NewDocumentContextValue {
  const ctx = useContext(NewDocumentContext);
  if (!ctx) throw new Error('useNewDocument must be used within NewDocumentProvider');
  return ctx;
}

/** The list page href (`/docs/invoice`) → the create href (`/docs/new/invoice`). */
export const newDocumentHref = (href: string) => href.replace('/docs/', '/docs/new/');

const ALL_LINKS: NavLink[] = DOCUMENT_SECTIONS.flatMap((section) => section.children);

/**
 * Is the caret somewhere the user is composing text?
 *
 * Alt-shortcuts are suppressed there. On macOS ⌥+letter produces accented and
 * dead characters, and this app's documents carry legal wording the user types
 * by hand — stealing that keystroke mid-clause would be a data-entry bug, not a
 * convenience.
 */
function isTypingInto(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function NewDocumentProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const value = useMemo(() => ({ open: () => setOpen(true) }), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Keys are compared as `code`, never `key`: on macOS ⌥I arrives as the
      // dead char "ˆ", and synthetic events from component libraries and
      // autofill can carry no `key` at all (see SearchCommand for the crash
      // that taught us this).
      if (typeof event.code !== 'string') return;

      if (event.code === 'KeyD' && (event.metaKey || event.ctrlKey) && !event.altKey) {
        // Also stops the browser's bookmark dialog.
        event.preventDefault();
        setOpen((wasOpen) => !wasOpen);
        return;
      }

      if (!event.altKey || event.metaKey || event.ctrlKey) return;
      if (isTypingInto(event.target)) return;

      const link = ALL_LINKS.find((item) => item.shortcut && event.code === `Key${item.shortcut}`);
      if (!link) return;
      event.preventDefault();
      setOpen(false);
      router.push(newDocumentHref(link.href));
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [router]);

  return (
    <NewDocumentContext value={value}>
      {children}
      <NewDocumentCommand open={open} onOpenChange={setOpen} />
    </NewDocumentContext>
  );
}

function NewDocumentCommand({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  // Filtering is local — seven strings, no server round-trip, no debounce.
  // Each row carries its index in the *flattened* list, so arrow keys can walk
  // across group boundaries without the render pass counting as it goes.
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let position = 0;
    return DOCUMENT_SECTIONS.map((section) => ({
      heading: section.label,
      rows: section.children
        .filter((link) => !needle || link.label.toLowerCase().includes(needle))
        .map((link) => ({ link, position: position++ })),
    })).filter((group) => group.rows.length > 0);
  }, [query]);

  const matches = useMemo(() => groups.flatMap((group) => group.rows.map((row) => row.link)), [groups]);

  const go = useCallback(
    (link: NavLink) => {
      onOpenChange(false);
      router.push(newDocumentHref(link.href));
    },
    [onOpenChange, router],
  );

  // Reset between visits so ⌘D always opens on the full list at the top.
  useEffect(() => {
    if (!open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!matches.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (i - 1 + matches.length) % matches.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const link = matches[active];
      if (link) go(link);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-lg"
        showCloseButton={false}
        aria-label="New document"
      >
        <DialogTitle className="sr-only">New document</DialogTitle>
        <DialogDescription className="sr-only">
          Choose a document type to open a blank editor.
        </DialogDescription>

        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search document types…"
            aria-label="Search document types"
            aria-controls="new-document-list"
            aria-activedescendant={matches[active] ? `new-document-${active}` : undefined}
            autoComplete="off"
            className="h-11 w-full bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
          />
        </div>

        <div className="max-h-80 overflow-y-auto p-1">
          {matches.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground" role="status">
              No document type matches “{query.trim()}”.
            </p>
          ) : (
            <div id="new-document-list" role="listbox" aria-label="Document types">
              {groups.map((group) => (
                <div key={group.heading} role="group" aria-label={group.heading}>
                  <p className="px-2 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {group.heading}
                  </p>
                  {group.rows.map(({ link, position }) => {
                    const Icon = link.icon;
                    return (
                      <button
                        key={link.href}
                        type="button"
                        id={`new-document-${position}`}
                        role="option"
                        aria-selected={position === active}
                        onMouseEnter={() => setActive(position)}
                        onClick={() => go(link)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm',
                          position === active && 'bg-accent text-accent-foreground',
                        )}
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="truncate">{link.label}</span>
                        {link.shortcut ? (
                          <Shortcut className="ml-auto" keys={['alt', link.shortcut]} />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-t px-3 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ to move</span>
          <span>↵ to open</span>
          <span>esc to close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
