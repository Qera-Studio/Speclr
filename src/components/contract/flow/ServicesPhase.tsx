'use client';

import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { SCHEDULE_ICONS } from '@/components/contract/scheduleIcons';
import { SCHEDULES, type ScheduleKey } from '@/lib/domain/contract/schedules';
import { cn } from '@/lib/utils';
import type { ContractService } from '@/lib/domain/service';
import type { ClientRecord, ContractData } from '@/lib/domain/types';

/**
 * One icon per Schedule, chosen for how the money and the ownership behave
 * rather than for the subject matter, because that is what a Schedule is
 * (`schedules.ts`).
 *
 * Setup configures something and hands it over; Build is struck once; Retainer
 * comes round every month; Audit's deliverable is a document with findings in
 * it. Nothing here is decorative: these four are the only tiles on the screen,
 * so each one is carrying the distinction on its own.
 */

/**
 * What the contract covers, seeded from the client record.
 *
 * **The services arrive rather than being chosen.** Onboarding already recorded
 * what this client engaged (`commercial.services`), and asking for the same
 * answer a second time is how the two come to disagree — the invoice has seeded
 * from that list since `CONTEXT.md` §5i, and the contract was the last place
 * still starting from a blank catalogue (`PRINCIPLES.md` rule 3).
 *
 * **The contract takes a copy, and telling the record is a separate act.**
 * Adding a service here changes this contract. It does not change who the
 * client is, so it does not write to them silently; "Also add to the client"
 * is the explicit second step on the Scope phase, and it never removes,
 * because unticking a service on one contract says nothing about an engagement
 * under another.
 *
 * **This phase is the picker and nothing else, since 18 September 2026.** What
 * each chosen service covers is `ScopePhase.tsx`, which is where the ledger
 * and its gate live. The two were one phase for a week; see that file for why
 * the seam moved back.
 *
 * **The four tiles are the only way in, and no second route is to be added
 * here.** An "Add a service" button sat in the top right opening the full
 * catalogue, and it was removed three times before it stayed removed. Each
 * argument for keeping it was the same one and it was wrong every time: a
 * cross-Schedule search is not worth a permanent control on a screen whose
 * whole job is the four tiles. If searching across Schedules is ever genuinely
 * needed, it belongs *inside* an open Schedule's list, not above it.
 */
export default function ServicesPhase({
  contract,
  client,
  services,
  onAdd,
  onRemove,
}: {
  contract: ContractData;
  /** Absent only if the client was archived or deleted after the draft began. */
  client?: ClientRecord;
  services: ContractService[];
  onAdd: (service: ContractService) => void;
  /** Takes one back off, which is what a chosen row's second click does. */
  onRemove: (code: string) => void;
}) {
  /**
   * Which Schedule's services are listed under the four tiles, if any.
   *
   * The tiles used to jump into the full catalogue, which meant leaving the
   * phase to answer a question the phase could answer in place. They open a
   * list underneath instead, so choosing a Schedule and choosing a service
   * happen on one screen and the second click does not cost a change of
   * surface. Null closes the list and leaves the four tiles standing.
   */
  const [browsing, setBrowsing] = useState<ScheduleKey | null>(null);

  const added = new Set(contract.parts.map((p) => p.code));
  const engaged = new Set((client?.commercial?.services ?? []).map((s) => s.code));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body text-muted-foreground">
        {engaged.size > 0
          ? 'Taken from what this client is engaged for. Add or remove what this contract covers.'
          : 'This client has no services on their record yet. Add what this contract covers.'}
      </p>

      {/*
        The four Schedules, as the way in.

        "Nothing on this contract yet" was a sentence restating an empty list,
        on the one screen where the reader has nothing to act on and most needs
        somewhere to start. The four are the whole catalogue's top level
        (`schedules.ts`, canonical order Setup, Build, Retainer, Audit) and they
        are how a service is paid for, approved and owned rather than what it is
        about, so picking one is a real narrowing rather than a filter chip.

        **Always, now that this phase is only the picker.** They were gated on
        an empty contract or an open browse, because the ledger stood below
        them and the two were fighting for the screen. The ledger is the Scope
        phase's (`ScopePhase.tsx`), so there is nothing left to yield to: these
        four are what the phase is.
      */}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SCHEDULES.map((schedule) => {
              const Icon = SCHEDULE_ICONS[schedule.key];
              const count = services.filter((s) => s.scheduleKey === schedule.key).length;
              const open = browsing === schedule.key;
              // Whether anything under this Schedule is on the contract, so the
              // four tiles say what has been chosen without being opened. A
              // closed tile was identical whether it held nothing or held
              // everything, which is the one question this screen exists to
              // answer, and the counts underneath are the catalogue's size
              // rather than the contract's.
              const chosen = services.some(
                (s) => s.scheduleKey === schedule.key && added.has(s.code),
              );
              return (
                <li key={schedule.key}>
                  {/*
                    A toggle, so a second click closes what the first opened and
                    the tile is never a one-way door. `aria-expanded` and
                    `aria-controls` are what say so to a screen reader, which
                    cannot see the list appear underneath.
                  */}
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={open ? 'schedule-services' : undefined}
                    onClick={() => setBrowsing(open ? null : schedule.key)}
                    className={cn(
                      'group flex h-full w-full flex-col items-center gap-2 rounded-lg border px-3 py-4 text-center transition-colors focus-visible:border-ring focus-visible:outline-none',
                      // Three states, and they are on two different axes, which
                      // is why `chosen` colours the border and `open` fills the
                      // tile rather than both competing for the background. A
                      // Schedule can be both: chosen and currently browsed.
                      //
                      // The open tile is what the list below belongs to, so it
                      // holds the accent rather than merely having been
                      // clicked. Without it the rows read as belonging to all
                      // four.
                      open && 'bg-accent',
                      chosen
                        ? 'border-primary'
                        : open
                          ? 'border-ring/60'
                          : 'hover:border-ring/60',
                      !open && 'bg-card',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-5 transition-colors',
                        chosen
                          ? 'text-primary'
                          : open
                            ? 'text-foreground'
                            : 'text-muted-foreground group-hover:text-foreground',
                      )}
                      aria-hidden
                    />
                    <span className="text-body font-medium">{schedule.name}</span>
                    <span className="text-meta text-muted-foreground tabular-nums">
                      {count} service{count === 1 ? '' : 's'}
                    </span>
                    {/*
                      Colour is never the only signal (`docs/design.md`, and the
                      same rule the chosen *rows* below already follow with
                      their tick). A sighted reader gets the blue border and
                      icon; a screen reader gets this.
                    */}
                    {chosen ? (
                      <span className="sr-only">(on this contract)</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          {/*
            The chosen Schedule's services, title only.

            One line each, because at this point the only decision is which of
            these to put on the contract: the overview, the code and the
            Schedule badge the catalogue's cards carry are all answers to
            questions nobody is asking yet, and the service's own sheet is
            where they get asked.

            The plus appears on hover and on keyboard focus. `opacity` rather
            than conditional rendering, so the row does not reflow as the
            pointer crosses it, and `group-focus-visible` alongside
            `group-hover` so the affordance is not pointer-only.
          */}
          {/*
            Two columns, so Build's twelve services are six rows rather than
            twelve. One column ran the list far past the four tiles above it
            and turned a choice you should be able to take in at a glance into
            a scroll. The row is a title and an icon, so half the width is
            still more than either needs.

            One column on a narrow window, where two would truncate the titles
            this list exists to show.
          */}
          {browsing ? (
            <ul id="schedule-services" className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {services
                .filter((s) => s.scheduleKey === browsing)
                .map((service) => {
                  // On the contract already. `added` is derived from the Parts
                  // rather than tracked here, so the mark cannot disagree with
                  // what the contract holds.
                  const chosen = added.has(service.code);
                  return (
                  <li key={service.code}>
                    {/*
                      `aria-label` rather than an `sr-only` span beside the
                      title: a span would be *appended* to the visible name, so
                      the button announced "Domain and DNS Add Domain and DNS
                      to this contract" — the service named twice in one
                      breath. The label replaces the computed name instead of
                      adding to it.

                      A chosen row says so in its name too. The tick is the
                      visible half and colour is never the only signal: a
                      screen reader gets "On this contract. Remove …" where a
                      sighted reader gets the blue.

                      **The row is a toggle**, so a service picked by mistake
                      comes off the same way it went on. Cancel on the sheet
                      does not undo the add and should not: the Part lands on
                      the click, and Cancel means "keep it as it is" for the
                      scope being edited rather than "forget the service". That
                      left a wrong pick with nowhere to go but the ledger, one
                      surface away, which is a long walk back from a misclick.
                    */}
                    <button
                      type="button"
                      aria-label={
                        chosen
                          ? `On this contract. Remove ${service.name}`
                          : `Add ${service.name} to this contract`
                      }
                      onClick={() => (chosen ? onRemove(service.code) : onAdd(service))}
                      className={cn(
                        'group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:border-ring focus-visible:outline-none',
                        chosen
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-card hover:border-ring/60',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate text-body font-medium">
                        {service.name}
                      </span>
                      {chosen ? (
                        // The tick is always shown, where the plus waits for a
                        // hover: it is a *state*, not an affordance, and a
                        // state that appears only under the pointer is a state
                        // nobody can survey. The X takes its place under the
                        // pointer, which is how the row says the click will
                        // undo rather than repeat.
                        <span className="relative size-4 shrink-0" aria-hidden>
                          <Check className="absolute inset-0 size-4 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0" />
                          <X className="absolute inset-0 size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                        </span>
                      ) : (
                        <Plus
                          className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                          aria-hidden
                        />
                      )}
                    </button>
                  </li>
                  );
                })}
            </ul>
          ) : null}
    </div>
  );
}
