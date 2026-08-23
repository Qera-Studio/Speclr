'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Shortcut } from '@/components/ui/kbd';
import { isTypingInto } from './NewDocumentCommand';
import { NAV_BY_PROFILE, jumpsForProfile } from './nav';
import type { Profile } from '@/lib/profile';

/**
 * Two things that only make sense together: `g` then a letter to jump between
 * sections, and `?` to show every binding the app has.
 *
 * They ship in one file because a shortcut nobody can find is a shortcut nobody
 * has. Before this, ⌘K was discoverable (its cap sits in the search field), ⌘D
 * was discoverable (it is printed in the rail), and the five ⌥ letters were
 * visible only if you happened to open the ⌘D palette. `?` is the one binding
 * that has to be guessable, and it is, because every application with keyboard
 * shortcuts uses it for exactly this.
 *
 * **The list is derived, never written down twice.** The jump rows come from
 * `jumpsForProfile` and the create rows from the same `documents` list the ⌘D
 * palette reads, so a page that moves takes its row with it and a cheatsheet
 * that has gone stale is not a state this can reach.
 */

/** How long a bare `g` waits for its second key. */
const SEQUENCE_MS = 1500;

export default function KeyboardShortcuts({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  /**
   * Whether `g` is armed.
   *
   * A ref, not state: nothing renders differently while it is held, and making
   * it state would re-render the whole shell on the way through a two-key
   * sequence. The timer disarms it, so a `g` typed and then abandoned does not
   * silently capture whatever letter is pressed a minute later.
   */
  const armed = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const jumps = jumpsForProfile(profile);

    const disarm = () => {
      if (armed.current) clearTimeout(armed.current);
      armed.current = null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      // `code`, not `key`, for the reason `NewDocumentCommand` gives: synthetic
      // events can carry no `key` at all, and a dead-key layout renames it.
      if (typeof event.code !== 'string') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingInto(event.target)) return;

      // `?` is Shift-/ on a US layout and somewhere else on most others, so
      // this one is matched on the character produced rather than the physical
      // key. Guarded, because `key` is what may be missing.
      if (typeof event.key === 'string' && event.key === '?') {
        event.preventDefault();
        disarm();
        setOpen((wasOpen) => !wasOpen);
        return;
      }

      if (!armed.current) {
        if (event.code !== 'KeyG') return;
        event.preventDefault();
        armed.current = setTimeout(disarm, SEQUENCE_MS);
        return;
      }

      disarm();
      const target = jumps.find((link) => event.code === `Key${link.jump}`);
      if (!target) return;
      event.preventDefault();
      setOpen(false);
      router.push(target.href);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      disarm();
    };
  }, [profile, router]);

  return <ShortcutHelp open={open} onOpenChange={setOpen} profile={profile} />;
}

function Row({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-6 py-1.5">
      <span className="truncate text-sm text-foreground">{label}</span>
      <Shortcut className="shrink-0" keys={keys} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col">
      <h3 className="pb-1 text-xs font-medium text-muted-foreground">{title}</h3>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function ShortcutHelp({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
}) {
  const nav = NAV_BY_PROFILE[profile];
  const jumps = jumpsForProfile(profile);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          {/* Says which half of the app the letters below belong to. The two
              profiles have different sections and different document types, so
              a cheatsheet that listed both would be listing bindings that do
              nothing where you are standing. */}
          <DialogDescription>
            On the {nav.label.toLowerCase()} side. Press ? again to close.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Section title="Anywhere">
            <Row keys={['mod', 'K']} label="Search" />
            <Row keys={['mod', 'D']} label="New document" />
            <Row keys={['mod', 'B']} label="Show or hide the rail" />
            <Row keys={['?']} label="This list" />
          </Section>

          <Section title="Go to">
            {jumps.map((link) => (
              <Row key={link.href} keys={['G', link.jump!]} label={link.label} />
            ))}
          </Section>

          <Section title="New">
            {nav.documents.map((link) =>
              link.shortcut ? (
                <Row key={link.href} keys={['alt', link.shortcut]} label={link.label} />
              ) : null,
            )}
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
