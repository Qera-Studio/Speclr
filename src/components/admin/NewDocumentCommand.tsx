'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Kbd, KbdGroup, Shortcut } from '@/components/ui/kbd';
import { MagicMove, useMagicMove } from '@/components/ui/magic-move';
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
  /**
   * What moved the selection last, and it exists only to decide whether the
   * focus ring is drawn.
   *
   * Selecting a card focuses it, which is what makes Enter open the one the
   * fill is sitting on. But `.focus()` called from code inherits the modality
   * the dialog was entered with, so Chromium reports `:focus-visible` and
   * paints the 2px ring even when a mouse caused the move. Measured in both
   * themes, with the ring chasing the pointer across the grid. That is a
   * keyboard affordance shown to a mouse user, and a second thing saying what
   * the travelling fill already says.
   */
  const [movedBy, setMovedBy] = useState<'keyboard' | 'pointer'>('keyboard');
  const cards = useRef<(HTMLButtonElement | null)[]>([]);

  /**
   * One highlight behind the cards, moved rather than repainted: the same
   * surface the menus, the select and the combobox use (`ui/magic-move.tsx`).
   *
   * `marked` mode, not `hover`, and the difference matters here. The rail
   * follows the pointer because a nav row has nothing in the DOM to watch; a
   * card does, because this grid already tracks a selection for the arrow keys
   * and roving tabindex. Watching `data-highlighted` therefore covers the
   * pointer, the arrow keys and Tab with one answer, where `hover` mode would
   * have left the keyboard's own moves unlit.
   *
   * **The cursor and the pointer are one highlight**, which is the opposite
   * call from the nav rail and for a reason that does not apply here: the
   * rail's active fill says which page you are on and must not travel, while
   * this one is only a cursor. So hovering a card selects it, and Enter opens
   * whatever the fill is sitting on.
   */
  const { track, highlight } = useMagicMove();

  const go = useCallback(
    (link: NavLink) => {
      onOpenChange(false);
      router.push(newDocumentHref(link.href));
    },
    [onOpenChange, router],
  );

  // Reset between visits so ⌘D always opens on the first card, ringed: the
  // palette is opened by a shortcut, so the keyboard is where the reader is.
  useEffect(() => {
    if (!open) {
      setActive(0);
      setMovedBy('keyboard');
    }
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
    if (!open) return;
    const card = cards.current[active];
    if (!card) return;

    /*
      `preventScroll`, then the scroll by hand, and the order is the fix.

      Five cards do not fit, so the bottom row is clipped and reaching it has to
      lift it into view. Focusing an element makes the browser scroll it into
      view, and that scroll is **instant**: measured at two scroll positions one
      frame apart, 0 then 51. The fill glided while the floor under it jumped.

      `scroll-behavior: smooth` on the grid does not fix it, which was checked
      rather than assumed: the class lands, `getComputedStyle` reports `smooth`,
      the grid is the only scroller in the ancestry, and it still snapped.
      Chromium's scroll-into-view-if-needed on focus does not consult the
      property. So the browser's scroll is suppressed and the same move is made
      through `scrollTo`, which does animate: 8 distinct positions over the same
      51px.

      `block: 'nearest'` is the whole intent: lift a clipped card just far
      enough to be whole, and leave a card already in view exactly where it is,
      which is what the browser's own "if needed" was getting right.
    */
    card.focus({ preventScroll: true });
    /*
      The behavior is passed as an argument, so it overrides the property, and
      `globals.css`'s blanket `scroll-behavior: auto !important` under
      `prefers-reduced-motion` cannot reach it. Measured: every CSS transition
      in the app stopped correctly and this one kept animating. So the media
      query is read here (WCAG 2.3.3), the way `useProfileDrag` already does.
    */
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
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
    setMovedBy('keyboard');
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
          {...track}
          role="listbox"
          aria-label="Document types"
          onKeyDown={onKeyDown}
          className={cn(
            track.className,
            // The lifting of a clipped row is done by the selection effect
            // above, not by `scroll-smooth` here: that class was tried and
            // measured doing nothing, because a focus scroll ignores it.
            'grid max-h-[60vh] grid-cols-3 justify-items-center gap-3 overflow-y-auto p-4',
          )}
        >
          {/* The card's own radius, and the fill the cards used to paint each
              for themselves. `-z-10` puts it behind them: a card is a plain
              button with no stacking of its own, so without it the fill would
              cover the thumbnail it is meant to sit under. */}
          <MagicMove {...highlight} className="-z-10 rounded-md bg-foreground/8" />
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
                // What the magic move watches. The selection is the one answer
                // for the pointer and the arrow keys alike, so there is exactly
                // one of these in the grid at any moment.
                data-highlighted={position === active ? '' : undefined}
                // What the ring above hangs off, exposed so it can be asserted:
                // jsdom cannot resolve `:focus-visible` against a real input
                // modality, so the mark is the testable half of the rule.
                data-moved-by={position === active ? movedBy : undefined}
                // Roving: one stop in the grid, so Tab leaves the grid rather
                // than walking every card in it.
                tabIndex={position === active ? 0 : -1}
                // Tab and Shift+Tab land here without passing through either
                // handler below, and they are the keyboard.
                onFocus={() => setActive(position)}
                // The pointer moves the selection rather than painting a fill
                // of its own, so pointing at a card and pressing Enter open the
                // same one. `pointerenter` rather than `mouseenter` for the
                // usual reason: it covers pen and touch as well.
                //
                // Ordered so the modality wins: this fires before the `focus`
                // the selection effect triggers, and React batches both into
                // one render, so the later `setMovedBy('pointer')` here would
                // be overwritten if `onFocus` set 'keyboard'. It does not:
                // `onFocus` only sets the index, and the two are separate
                // state for exactly that reason.
                onPointerEnter={() => {
                  setMovedBy('pointer');
                  setActive(position);
                }}
                onClick={() => go(link)}
                className={cn(
                  'group/card relative flex w-full cursor-pointer flex-col items-center gap-2 rounded-md p-2 text-center outline-none',
                  // No fill of its own: the fill is the travelling one above,
                  // and a card that painted its own would appear instantly
                  // underneath, leaving nothing to watch (`magic-move.tsx`).
                  // The tint the fill carries is still `bg-foreground/8`, a
                  // step darker than --accent, which gets the same step in both
                  // themes: darker on light, lighter on dark.
                  //
                  // The ring is ours rather than `focus-visible:`, because the
                  // browser's answer is wrong here: programmatic focus inherits
                  // the modality the dialog was entered with, so a mouse move
                  // drew a keyboard ring. See `movedBy`.
                  position === active &&
                    movedBy === 'keyboard' &&
                    'ring-2 ring-ring',
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
