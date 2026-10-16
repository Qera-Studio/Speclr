'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { FieldSet } from '@/components/ui/field';
import { LegendInfo } from '@/components/patterns/FieldInfo';
import type { StudioMember } from '@/lib/profile';
import { StepForm, type StepProps } from './stepKit';
import { saveClientSection } from '@/server/actions/clients';
import type { ClientRecord } from '@/lib/domain/types';

/**
 * Who at Qera owns this client, and who is working with them.
 *
 * Two questions that look alike and are not. The **lead** is who brought the
 * client in: one person, and a fact that rarely changes. The **team** is who is
 * working with them right now: several people, and a fact that changes with
 * every engagement. They are asked together because they are answered together,
 * and because the lead is almost always on the team.
 *
 * **Ids are stored, never names** (`CONTEXT.md` §5d-i). A name copied onto a
 * client is wrong the first time somebody is renamed, and these cards resolve
 * from the live employee list on every render.
 *
 * **The people come from the admin profile**, which is the one place the two
 * halves of the app genuinely have to meet. They arrive already narrowed to
 * `StudioMember` by `lib/profile.ts`: an `EmployeeRecord` carries salary, PAN
 * and UAN, and a clients page has no business holding any of it. The narrowing
 * is the seam doing its job rather than a formality.
 *
 * **Neither field is required.** A client added before anybody thought about
 * ownership has neither, and an engagement genuinely between the studio and a
 * client with nobody named yet is a real state rather than an unfinished one.
 */
export default function TeamStep({
  client,
  onSaved,
  submitLabel,
  people,
}: StepProps & {
  /** Everyone in the studio, narrowed by the profile seam. */
  people: StudioMember[];
}) {
  const [lead, setLead] = useState<string | undefined>(client?.leadEmployeeId);
  const [team, setTeam] = useState<string[]>(client?.teamEmployeeIds ?? []);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /**
   * Somebody who has left still shows where they are already assigned, and is
   * never offered anywhere else. Removing them from a client they genuinely
   * worked on would rewrite history to tidy a list; offering them on a new one
   * would be assigning work to somebody who is gone.
   */
  const assignable = people.filter((p) => !p.departed);
  const visible = (id: string) => people.some((p) => p.id === id);
  const leadOptions = assignable.concat(
    people.filter((p) => p.departed && p.id === lead),
  );
  const teamOptions = assignable.concat(
    people.filter((p) => p.departed && team.includes(p.id)),
  );

  const toggle = (id: string) =>
    setTeam((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!client) return;
    setServerError(null);
    setSaving(true);
    const result = await saveClientSection(client.id, 'team', {
      leadEmployeeId: lead,
      // Only ids that still resolve. A person deleted between the page loading
      // and this submit would otherwise be refused by the server, which is the
      // right refusal in the wrong place: nothing the operator did was wrong.
      teamEmployeeIds: team.filter(visible),
    });
    setSaving(false);

    if (!result.success) {
      setServerError(result.error ?? 'Something went wrong.');
      return;
    }
    onSaved({
      ...(client as ClientRecord),
      leadEmployeeId: lead,
      teamEmployeeIds: team.filter(visible),
      updatedAt: Date.now(),
    });
  };

  return (
    <StepForm
      onSubmit={onSubmit}
      submitLabel={submitLabel}
      submitting={saving}
      serverError={serverError}
      // Both fields are genuinely optional: a client between engagements has
      // no team, and one added before anybody thought about ownership has
      // neither. Said once here rather than on two labels.
      allOptional
    >
      <FieldSet>
        <LegendInfo
          label="About the lead"
          info="Who brought this client in and owns the relationship. One person. It is a fact about Qera rather than about the client, so it never appears on a document."
        >
          Lead
        </LegendInfo>
        {leadOptions.length === 0 ? (
          <EmptyNote />
        ) : (
          /*
            A radiogroup, because exactly one person can be the lead and that is
            what a radiogroup means to a screen reader. The cards are the radios
            rather than decoration around them, so arrow keys move between them
            for free.
          */
          <div role="radiogroup" aria-label="Lead" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {leadOptions.map((person) => (
              <PersonCard
                key={person.id}
                role="radio"
                person={person}
                selected={lead === person.id}
                // Clicking the chosen lead again clears it, because there is
                // otherwise no way back to "nobody" once anybody is picked, and
                // the field is optional.
                onClick={() => setLead(lead === person.id ? undefined : person.id)}
              />
            ))}
          </div>
        )}
      </FieldSet>

      <FieldSet>
        <LegendInfo
          label="About the team"
          info="Who is currently on the engagement. Several people, and it changes as work moves. The lead is usually one of them, so they are listed here too."
        >
          Working on this
        </LegendInfo>
        {teamOptions.length === 0 ? (
          <EmptyNote />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {teamOptions.map((person) => (
              <PersonCard
                key={person.id}
                role="checkbox"
                person={person}
                selected={team.includes(person.id)}
                onClick={() => toggle(person.id)}
              />
            ))}
          </div>
        )}
      </FieldSet>
    </StepForm>
  );
}

/**
 * What the step says when the studio has nobody to assign.
 *
 * A real sentence rather than an empty grid, and it names the fix: the page
 * that adds employees is on the other profile, which is not somewhere an
 * operator on the clients side would think to look.
 */
function EmptyNote() {
  return (
    <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
      Nobody to assign yet. People added under Employees, on the studio side,
      appear here.
    </p>
  );
}

/**
 * One person, as a card that is really a radio or a checkbox.
 *
 * `role` is passed rather than inferred so the two lists above read correctly
 * to a screen reader: the same card means "one of these" in the first group and
 * "any of these" in the second, and only the caller knows which.
 *
 * `aria-checked` rather than `aria-pressed`, because both roles are checkable
 * rather than toggleable, and a button claiming to be a radio without it is a
 * control assistive tech cannot report the state of.
 */
function PersonCard({
  person,
  selected,
  onClick,
  role,
}: {
  person: StudioMember;
  selected: boolean;
  onClick: () => void;
  role: 'radio' | 'checkbox';
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected ? 'border-primary bg-accent' : 'border-border hover:bg-accent/50'
      }`}
    >
      {/*
        Initials rather than an avatar: there are no photographs anywhere in
        this app, and a generic person glyph repeated four times distinguishes
        nobody from anybody.
      */}
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
      >
        {initialsOf(person.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{person.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {person.departed ? 'No longer here' : person.role}
        </span>
      </span>
      {selected ? <Check aria-hidden className="size-4 shrink-0 text-primary" /> : null}
    </button>
  );
}

/** First and last initial. Two letters is what fits legibly in 32px. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}
