'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ConfirmActionButton } from '@/components/patterns/ConfirmAction';
import { PageHeader } from '@/components/admin/Page';
import { SCHEDULE_BY_KEY } from '@/lib/domain/contract/schedules';
import type { ContractService, LibraryLine } from '@/lib/domain/service';
import { removeService } from '@/server/actions/services';
import LibrariesForm from './LibrariesForm';
import ItemsManager from './ItemsManager';
import WordingForm from './WordingForm';

/** A section's heading, and the standing note under it where one is earned. */
interface Section {
  id: 'items' | 'wording' | 'libraries';
  heading: string;
  note?: string;
}

const SECTIONS: Section[] = [
  {
    id: 'items',
    heading: 'Items',
    /*
      **No note, deliberately**, where the other two have one. What it said is
      already on the screen: the table's own columns say an item is a priced
      line with a group and a rate, and the empty state says the rest for a
      service that has none. The two sections below describe wording and
      libraries that a reader cannot see until they open a form, so theirs earn
      their place.

      It also bought back the row `ItemsManager` needs: the heading and "Add
      item" now sit on one line directly above the table, instead of a heading,
      a paragraph, and a third row carrying a count the pager already prints.
    */
  },
  {
    id: 'wording',
    heading: 'Wording',
    note: 'What every Part of this service says. Changes reach the next contract; anything already drafted or signed keeps its own copy.',
  },
  {
    id: 'libraries',
    heading: 'Libraries',
    note: 'Which shared exclusions and client inputs this service names. Exclusions are pre-ticked as excluded on a contract; unticking there brings one into scope.',
  },
];

/**
 * One Service on its own page: the items, the wording and the libraries, each
 * its own form posting only its own section, and the one way to retire it.
 *
 * A page rather than a second tab in the details dialog. That dialog is five
 * scalar fields by design, and a Service also carries thirteen list fields
 * and a list of items. Two surfaces writing one row is how a section quietly
 * goes missing, which is the call CONTEXT §5d already made for clients. The
 * dialog keeps the five-field pass; everything with a list comes here.
 *
 * **Editing here cannot reach a contract already written.** A Part is copied
 * onto the contract when the Service is ticked and frozen at finalize
 * (CONTEXT §5c), which is what makes every form on this page safe to use.
 */
export default function ServicePage({
  service,
  exclusions,
  clientInputs,
}: {
  service: ContractService;
  exclusions: LibraryLine[];
  clientInputs: LibraryLine[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const schedule = SCHEDULE_BY_KEY[service.scheduleKey];

  const archive = () =>
    startTransition(async () => {
      setError(null);
      const result = await removeService(service.code);
      if (!result.success) {
        setError(result.error ?? 'Failed to archive the service.');
        return;
      }
      router.push('/client/services');
    });

  const forms = {
    items: <ItemsManager service={service} />,
    wording: <WordingForm service={service} />,
    libraries: (
      <LibrariesForm service={service} exclusions={exclusions} clientInputs={clientInputs} />
    ),
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <PageHeader title={service.name}>
          <ConfirmActionButton
            label="Archive service"
            title="Archive this service?"
            description="It leaves the catalogue and stops being offered on new contracts. Contracts already holding it keep their own copy, and it stays readable for audit."
            confirmLabel="Archive"
            confirmVariant="destructive"
            onConfirm={archive}
            disabled={pending}
          />
        </PageHeader>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{service.code}</span>
          <Badge variant="outline">{schedule.name}</Badge>
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      {SECTIONS.map((section) => (
        <section key={section.id} aria-labelledby={`${section.id}-heading`} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id={`${section.id}-heading`} className="text-base font-medium">
              {section.heading}
            </h2>
            {/* Optional, so a section whose table explains itself does not
                carry a paragraph restating it. */}
            {section.note ? (
              <p className="text-sm text-muted-foreground">{section.note}</p>
            ) : null}
          </div>
          {forms[section.id]}
        </section>
      ))}
    </div>
  );
}
