'use client';

import { useState, type ComponentType } from 'react';
import * as Lucide from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { CycleArrowIcon, TrayArrowIcon } from '@/components/ui/tray-arrow-icon';
import { Spinner } from '@/components/ui/spinner';
import { BlueCheck } from '@/components/ui/blue-check';
import { AddButton } from '@/components/ui/add-button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import ResetProgressButton from '@/components/spec/ResetProgressButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Specimen } from './Specimen';
import { ICON_USES } from './iconInventory.generated';
import type { LibraryEntry } from './catalogue';

/**
 * Every icon in the app, split by whether it moves.
 *
 * **The static list is generated, and that is the whole design of this page.**
 * A hand-kept icon gallery is wrong the first time somebody adds an icon
 * without opening it, and nothing about the page looks wrong while it is: a
 * reader cannot tell a complete list from a stale one by looking. So
 * `iconInventory.generated.ts` is written by `scripts/icon-inventory.ts`, and
 * `__tests__/iconInventory.test.ts` re-walks the tree and fails while the two
 * disagree. Adding an icon and not regenerating is a red build.
 *
 * **The animated list is hand-written, because it cannot be derived.** Motion
 * lives in the component that uses the icon (a `group-hover` transform, a
 * Motion variant, `animate-spin`), not in the icon, so the same `Plus` is
 * static in one place and turns in another. What is enforced instead is that
 * each entry names the file its motion lives in, and the test checks that file
 * exists and still contains the animation, so an entry cannot outlive what it
 * describes.
 */

/** Everything Lucide exports, by name, so the generated list can be rendered. */
const GLYPHS = Lucide as unknown as Record<string, ComponentType<{ className?: string }>>;

interface Animated {
  /** What the reader should call it. */
  name: string;
  /** The motion in as few words as possible. */
  motion: string;
  /** Where the motion is written. Checked by the test. */
  source: string;
  /** A string the test greps for in that file, proving the motion is still there. */
  proof: string;
  /** Rendered live, wrapped in whatever group the motion hooks onto. */
  render: () => React.ReactNode;
}

/**
 * The hover group the tray icons hook onto.
 *
 * `group/tray` is the contract those icons are written against, so a specimen
 * has to provide it or the icon renders correct and dead, which would be a
 * gallery lying about the one thing it is for.
 */
function TrayHover({ children }: { children: React.ReactNode }) {
  return (
    <span className="group/tray inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-border">
      {children}
    </span>
  );
}

/** A generic hover host for motion keyed to an arbitrary group name. */
function Hover({ group, children }: { group: string; children: React.ReactNode }) {
  return (
    <span
      className={`${group} inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-border`}
    >
      {children}
    </span>
  );
}

const ANIMATED: Animated[] = [
  {
    name: 'Tray arrow, down',
    motion: 'Hover: the arrow accelerates into the tray and a fresh one arrives from above',
    source: 'src/components/ui/tray-arrow-icon.tsx',
    proof: 'group-hover/tray:translate-y-[18px]',
    render: () => (
      <TrayHover>
        <TrayArrowIcon direction="down" />
      </TrayHover>
    ),
  },
  {
    name: 'Tray arrow, up',
    motion: 'The same cycle upward, for an upload',
    source: 'src/components/ui/tray-arrow-icon.tsx',
    proof: 'group-hover/tray:-translate-y-[18px]',
    render: () => (
      <TrayHover>
        <TrayArrowIcon direction="up" />
      </TrayHover>
    ),
  },
  {
    name: 'Cycle arrow, right',
    motion: 'The tray cycle sideways, with the svg box doing the clipping',
    source: 'src/components/ui/tray-arrow-icon.tsx',
    proof: 'group-hover/tray:translate-x-[300px]',
    render: () => (
      <TrayHover>
        <CycleArrowIcon direction="right" />
      </TrayHover>
    ),
  },
  {
    name: 'Cycle arrow, left',
    motion: 'The same, leaving by the other edge',
    source: 'src/components/ui/tray-arrow-icon.tsx',
    proof: 'group-hover/tray:-translate-x-[300px]',
    render: () => (
      <TrayHover>
        <CycleArrowIcon direction="left" />
      </TrayHover>
    ),
  },
  {
    name: 'Add',
    motion: 'A spring quarter-turn, clockwise so it leans into the page',
    source: 'src/components/ui/add-button.tsx',
    proof: 'hover: { rotate: 90 }',
    render: () => <AddButton>Add</AddButton>,
  },
  {
    name: 'Plus, on a row',
    motion: 'The same quarter-turn as a plain CSS transition, on a row that is itself the target',
    source: 'src/components/admin/clients/onboarding/ServicesStep.tsx',
    proof: 'group-hover/service:rotate-90',
    render: () => (
      <Hover group="group/service">
        <Lucide.Plus className="size-4 transition-transform group-hover/service:rotate-90" />
      </Hover>
    ),
  },
  {
    name: 'Upload, on a drop zone',
    motion: 'A quarter-turn when the zone beneath the pointer is the drop target',
    source: 'src/components/admin/clients/onboarding/AttachmentsStep.tsx',
    proof: 'group-hover/tray:rotate-90',
    render: () => (
      <TrayHover>
        <Lucide.Plus className="size-5 text-muted-foreground transition-transform group-hover/tray:rotate-90" />
      </TrayHover>
    ),
  },
  {
    name: 'Reset',
    motion: 'A full turn anticlockwise over half a second, undoing itself',
    source: 'src/components/spec/ResetProgressButton.tsx',
    proof: 'group-hover/button:-rotate-[360deg]',
    /*
      The real button, not a copy of its rotation.

      Copying the classes here put an off-scale duration in this file and
      failed `design-system.test.ts`: the motion scale is enforced, and that
      half-second turn is on a two-file exemption list as a signature motion.
      Adding a third file to that list to hold a *reproduction* would be
      widening an exemption to accommodate a copy, which is backwards.
      Rendering the real component keeps the motion in the one file allowed to
      own it.
    */
    render: () => <ResetProgressButton onReset={() => {}} />,
  },
  {
    name: 'Confirm swap, down',
    motion: 'The icon bobs 2px on hover, then swaps for a tick when the action lands',
    source: 'src/components/ui/confirm-button.tsx',
    proof: "'bob-down': { rest: { y: 0 }, hover: { y: 2 } }",
    render: () => <SwapSample direction="down" />,
  },
  {
    name: 'Confirm swap, up',
    motion: 'The same, bobbing the other way for a send',
    source: 'src/components/ui/confirm-button.tsx',
    proof: "'bob-up': { rest: { y: 0 }, hover: { y: -2 } }",
    render: () => <SwapSample direction="up" />,
  },
  {
    name: 'Spinner',
    motion: 'A continuous turn while something is in flight. The one icon that moves unprompted',
    source: 'src/components/ui/spinner.tsx',
    proof: 'animate-spin',
    render: () => <Spinner />,
  },
  {
    name: 'Spinner, in a button',
    motion: 'The same turn, in front of a label that does not change',
    source: 'src/components/ui/button.tsx',
    proof: 'animate-spin',
    render: () => <Loader2 aria-hidden="true" className="size-4 animate-spin" />,
  },
  {
    name: 'Chevron, disclosure',
    motion: 'A half-turn when the thing it points at opens',
    source: 'src/components/spec/ReviewedItem.tsx',
    proof: "open && 'rotate-180'",
    render: () => <DisclosureSample />,
  },
];

/**
 * The real `AddButton` and `ConfirmButton`, not a copy of their motion.
 *
 * Same reason every other specimen on this page is the real thing: a
 * reproduction here is a second place for the spring to be decided, and the
 * first symptom would be the library looking right while the app did not.
 */
function SwapSample({ direction }: { direction: 'down' | 'up' }) {
  return (
    <ConfirmButton
      idleIcon={direction === 'down' ? Lucide.Download : Lucide.Send}
      idleLabel={direction === 'down' ? 'Download' : 'Send'}
      confirmIcon={Lucide.Check}
      confirmLabel={direction === 'down' ? 'Downloaded' : 'Sent'}
      iconMotion={direction === 'down' ? 'bob-down' : 'bob-up'}
      onAction={() => {}}
      variant="outline"
    />
  );
}

/** A chevron that really turns, driven by a real open state. */
function DisclosureSample() {
  const [open, setOpen] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={open ? 'Collapse' : 'Expand'}
      aria-expanded={open}
      onClick={() => setOpen((o) => !o)}
    >
      <Lucide.ChevronDown className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
    </Button>
  );
}

export function IconSpecimens({ entry }: { entry: LibraryEntry }) {
  const [animated, still] = entry.variants;
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? ICON_USES.filter(([name]) => name.toLowerCase().includes(needle))
    : ICON_USES;

  return (
    <>
      <Specimen name={animated.name} note={animated.note} fill>
        <div className="flex w-full flex-wrap gap-x-6 gap-y-5">
          {ANIMATED.map((icon) => (
            <div key={icon.name} className="flex w-44 flex-col items-start gap-1.5">
              {icon.render()}
              <span className="text-xs font-medium">{icon.name}</span>
              <span className="text-[11px] leading-snug text-muted-foreground">{icon.motion}</span>
            </div>
          ))}
        </div>
      </Specimen>

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
            <span className="text-xs text-muted-foreground" role="status">
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
                  <span className="font-mono text-[11px] leading-tight break-all">{name}</span>
                  {/*
                    How many files import it, which is the one fact that tells a
                    reader whether an icon is the house answer for something or
                    a one-off somebody reached for once.
                  */}
                  <span className="text-[10px] text-muted-foreground">
                    {files} {files === 1 ? 'file' : 'files'}
                  </span>
                </li>
              );
            })}
          </ul>

          {matches.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No icon by that name. The app has {ICON_USES.length}, and Lucide has far more: an
              icon missing here is one nothing imports yet.
            </p>
          ) : null}
        </div>
      </Specimen>

      {/*
        The two custom icons, kept apart from the Lucide grid because they are
        not Lucide. §1.5 says Lucide only, and these are the deliberate
        exceptions: one is Lucide geometry split into layers so it can animate,
        the other is a container that takes a Lucide glyph.
      */}
      <Specimen
        name="Not from Lucide"
        note="The two exceptions to §1.5, and why each is one."
        fill
      >
        <div className="flex w-full flex-wrap gap-x-6 gap-y-5">
          <div className="flex w-44 flex-col items-start gap-1.5">
            <TrayHover>
              <TrayArrowIcon direction="down" />
            </TrayHover>
            <span className="text-xs font-medium">TrayArrowIcon</span>
            <span className="text-[11px] leading-snug text-muted-foreground">
              Lucide’s own download geometry, split into tray and arrow so the arrow can move
              behind the bar. Renders identically at rest.
            </span>
          </div>
          <div className="flex w-44 flex-col items-start gap-1.5">
            <span className="inline-flex size-9 items-center justify-center">
              <BlueCheck aria-label="Passed" />
            </span>
            <span className="text-xs font-medium">BlueCheck</span>
            <span className="text-[11px] leading-snug text-muted-foreground">
              Not an icon but a ring around one: the app’s passed marker, taking a Lucide glyph
              so the same container serves a tick or an alert.
            </span>
          </div>
        </div>
      </Specimen>
    </>
  );
}

export { ANIMATED as ANIMATED_ICONS };
