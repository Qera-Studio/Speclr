'use client';

import { useState, type ComponentType } from 'react';
import * as Lucide from 'lucide-react';
import { BlueCheck } from '@/components/ui/blue-check';
import { Input } from '@/components/ui/input';
import { Specimen } from './Specimen';
import { ICON_USES } from './iconInventory.generated';
import type { LibraryEntry } from './catalogue';

/**
 * Every icon in the app.
 *
 * **The list is generated, and that is the whole design of this page.**
 * A hand-kept icon gallery is wrong the first time somebody adds an icon
 * without opening it, and nothing about the page looks wrong while it is: a
 * reader cannot tell a complete list from a stale one by looking. So
 * `iconInventory.generated.ts` is written by `scripts/icon-inventory.ts`, and
 * `__tests__/iconInventory.test.ts` re-walks the tree and fails while the two
 * disagree. Adding an icon and not regenerating is a red build.
 *
 * There was an animated half once. It went with the rest of the decorative
 * motion (`docs/design.md` §1.6): an icon here does not move.
 */

/** Everything Lucide exports, by name, so the generated list can be rendered. */
const GLYPHS = Lucide as unknown as Record<string, ComponentType<{ className?: string }>>;

export function IconSpecimens({ entry }: { entry: LibraryEntry }) {
  const [still] = entry.variants;
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? ICON_USES.filter(([name]) => name.toLowerCase().includes(needle))
    : ICON_USES;

  return (
    <>
      <Specimen name={still.name} note={still.note} fill>
        <div className="flex w-full flex-col gap-4">
          {/*
            A filter, because 102 icons is past the number a person can scan.
            It matches the export name, which is what somebody has in hand when
            they are deciding whether the app already has an icon for a thing.
          */}
          <div className="flex items-center gap-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by name"
              aria-label="Filter icons by name"
              className="max-w-56"
            />
            <span className="text-meta text-muted-foreground" role="status">
              {matches.length} of {ICON_USES.length}
            </span>
          </div>

          {/*
            Hairlines drawn per cell rather than as a painted `gap-px` over a
            `bg-border` parent. That trick draws the grid's *unfilled* track too,
            so the last row ends in a grey block wherever the count does not
            divide evenly, which reads as a broken cell rather than as the end
            of a list. Negative margins collapse the doubled edges.
          */}
          <ul className="grid w-full grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] overflow-hidden rounded-sm border-t border-l border-border">
            {matches.map(([name, files]) => {
              const Glyph = GLYPHS[name];
              return (
                <li
                  key={name}
                  className="flex flex-col items-center gap-1.5 border-r border-b border-border bg-background px-2 py-3 text-center"
                >
                  {Glyph ? <Glyph className="size-5" /> : null}
                  <span className="font-mono text-caption break-all">{name}</span>
                  {/*
                    How many files import it, which is the one fact that tells a
                    reader whether an icon is the house answer for something or
                    a one-off somebody reached for once.
                  */}
                  <span className="text-caption text-muted-foreground">
                    {files} {files === 1 ? 'file' : 'files'}
                  </span>
                </li>
              );
            })}
          </ul>

          {matches.length === 0 ? (
            <p className="text-meta text-muted-foreground">
              No icon by that name. The app has {ICON_USES.length}, and Lucide has far more: an
              icon missing here is one nothing imports yet.
            </p>
          ) : null}
        </div>
      </Specimen>

      {/*
        The one custom icon, kept apart from the Lucide grid because it is not
        Lucide. §1.5 says Lucide only, and this is the deliberate exception: a
        container that takes a Lucide glyph.
      */}
      <Specimen name="Not from Lucide" note="The one exception to §1.5, and why it is one." fill>
        <div className="flex w-full flex-wrap gap-x-6 gap-y-5">
          <div className="flex w-44 flex-col items-start gap-1.5">
            <span className="inline-flex size-9 items-center justify-center">
              <BlueCheck aria-label="Passed" />
            </span>
            <span className="text-meta font-medium">BlueCheck</span>
            <span className="text-caption text-muted-foreground">
              Not an icon but a ring around one: the app’s passed marker, taking a Lucide glyph
              so the same container serves a tick or an alert.
            </span>
          </div>
        </div>
      </Specimen>
    </>
  );
}
