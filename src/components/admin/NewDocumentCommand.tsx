'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Kbd, KbdGroup, Shortcut } from '@/components/ui/kbd';
import SheetThumbnail from '@/components/docs/SheetThumbnail';
import { DOC_SAMPLES } from '@/components/docs/samples';
import { cn } from '@/lib/utils';
import type { Profile } from '@/lib/profile';
import { NAV_BY_PROFILE, type NavLink } from './nav';

/**
 * ⌘D — start a new document.
 *
 * The app exists to issue documents, so the fastest possible path to a blank
 * one is the shortcut worth spending. It is deliberately *not* the ⌘K header
 * search: ⌘K finds a document that exists, ⌘D makes one that doesn't, and
 * merging them would make both vaguer.
 *
 * **Scoped to the current profile.** It offers the three client documents or
 * the five admin ones, never both — the two halves of the app are otherwise
 * sealed, and a palette that ignored that would be the one place a stipend slip
 * turned up while you were invoicing.
 *
 * Nothing here writes to the database. Every row navigates to
 * `/<profile>/docs/new/<slug>`, which renders a blank editor; `createDraft`
 * still owns row creation when the editor is saved, so no abandoned palette
 * visit can burn a document number.
 *
 * The type list is read from the nav rather than the registry so the palette's
 * labels, icons and order can never drift from the nav's.
 *
 * Each card shows the document it would make, rendered small — see
 * `docs/SheetThumbnail.tsx`. That is worth the weight here in a way it would
 * not be in a list of eight: at three types a side, recognising the page is
 * faster than reading its name.
 */

type NewDocumentContextValue = { open: () => void };

const NewDocumentContext = createContext<NewDocumentContextValue | null>(null);

export function useNewDocument(): NewDocumentContextValue {
  const ctx = useContext(NewDocumentContext);
  if (!ctx) throw new Error('useNewDocument must be used within NewDocumentProvider');
  return ctx;
}

/**
 * The list page href (`/client/docs/invoice`) → the create href
 * (`/client/docs/new/invoice`). Matches on `/docs/`, so it carries whatever
 * profile prefix the link already had.
 */
export const newDocumentHref = (href: string) => href.replace('/docs/', '/docs/new/');

/**
 * Is the caret somewhere the user is composing text?
 *
 * Alt-shortcuts are suppressed there. On macOS ⌥+letter produces accented and
 * dead characters, and this app's documents carry legal wording the user types
 * by hand — stealing that keystroke mid-clause would be a data-entry bug, not a
 * convenience.
 */
export function isTypingInto(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function NewDocumentProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const links = NAV_BY_PROFILE[profile].documents;

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

      // Only this profile's letters. ⌥P in the client profile does nothing
      // rather than jumping across to a new pay slip — the shortcut belongs to
      // the side it is listed on.
      const link = links.find((item) => item.shortcut && event.code === `Key${item.shortcut}`);
      if (!link) return;
      event.preventDefault();
      setOpen(false);
      router.push(newDocumentHref(link.href));
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [router, links]);

  return (
    <NewDocumentContext value={value}>
      {children}
      <NewDocumentCommand open={open} onOpenChange={setOpen} links={links} />
    </NewDocumentContext>
  );
}

/**
 * Cards per row. Three, because the client profile has exactly three document
 * types and a full row is what makes the grid read as the whole offer rather
 * than the start of a list.
 */
const COLUMNS = 3;

function NewDocumentCommand({
  open,
  onOpenChange,
  links,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: NavLink[];
}) {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);

  const go = useCallback(
    (link: NavLink) => {
      onOpenChange(false);
      router.push(newDocumentHref(link.href));
    },
    [onOpenChange, router],
  );

  // Reset between visits so ⌘D always opens on the first card.
  useEffect(() => {
    if (!open) setActive(0);
  }, [open]);

  /**
   * Focus follows the selection, rather than the selection being tracked
   * separately with `aria-activedescendant`.
   *
   * There is no search field here any more, so there is nothing else for focus
   * to sit in — and a real focused button is what makes Enter, Space and the
   * focus ring work without any of them being re-implemented.
   */
  useEffect(() => {
    if (open) cards.current[active]?.focus();
  }, [open, active]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    // Clamped, not wrapped. On a grid a wrap moves the eye to the far end of
    // another row, which reads as a jump rather than a step.
    const step =
      event.key === 'ArrowRight' ? 1
      : event.key === 'ArrowLeft' ? -1
      : event.key === 'ArrowDown' ? COLUMNS
      : event.key === 'ArrowUp' ? -COLUMNS
      : 0;
    if (!step) return;
    event.preventDefault();
    setActive((i) => Math.max(0, Math.min(links.length - 1, i + step)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={false}
        aria-label="New document"
      >
        <DialogTitle className="border-b px-4 py-3 text-sm font-medium">New document</DialogTitle>
        <DialogDescription className="sr-only">
          Choose a document type to open a blank editor.
        </DialogDescription>

        {/* No search field: three types on one side and five on the other, all
            of them on screen at once. A box that filters a list you can already
            see whole is a keystroke asking to be spent on nothing. */}
        <div
          role="listbox"
          aria-label="Document types"
          onKeyDown={onKeyDown}
          className="grid max-h-[60vh] grid-cols-3 justify-items-center gap-3 overflow-y-auto p-4"
        >
          {links.map((link, position) => {
            const slug = link.href.slice(link.href.lastIndexOf('/') + 1);
            const sample = DOC_SAMPLES[slug];
            return (
              <button
                key={link.href}
                type="button"
                ref={(node) => {
                  cards.current[position] = node;
                }}
                role="option"
                aria-selected={position === active}
                // Roving: one stop in the grid, so Tab leaves the grid rather
                // than walking every card in it.
                tabIndex={position === active ? 0 : -1}
                onFocus={() => setActive(position)}
                onClick={() => go(link)}
                className={cn(
                  'group/card flex w-full cursor-pointer flex-col items-center gap-2 rounded-md p-2 text-center',
                  // A step darker than --accent, which is a 1% difference from
                  // the dialog behind it. Tinting the foreground gets the same
                  // step in both themes: darker on light, lighter on dark.
                  'transition-colors hover:bg-foreground/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  position === active && 'bg-foreground/8',
                )}
              >
                {sample ? (
                  <SheetThumbnail doc={sample.doc} />
                ) : (
                  <link.icon className="size-8 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {link.label}
                  {link.shortcut ? <Shortcut keys={['alt', link.shortcut]} /> : null}
                </span>
                {sample ? (
                  <span className="text-xs text-balance text-muted-foreground">{sample.blurb}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* The key is a keycap, the gloss is text. Run together as plain glyphs
            ("↑↓ to move") the two read as one string and the arrows stop
            looking pressable — `Kbd` is the same cap the cards already use. */}
        <div className="flex items-center gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <KbdGroup>
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              <Kbd>←</Kbd>
              <Kbd>→</Kbd>
            </KbdGroup>
            to move
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd>
            to open
          </span>
          <span className="flex items-center gap-1">
            <Kbd>esc</Kbd>
            to close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
