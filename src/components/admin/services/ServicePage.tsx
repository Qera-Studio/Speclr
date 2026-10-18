'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Archive, ArrowUpRight, ChevronRight, Circle, MoreHorizontal, Pencil, Plus } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DrawerSheet } from '@/components/ui/drawer-sheet';
import { DrawerToolbar } from '@/components/patterns/DrawerToolbar';
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SCHEDULE_BY_KEY } from '@/lib/domain/contract/schedules';
import { hasOwnTerms, type ContractService, type LibraryLine } from '@/lib/domain/service';
import { accentBadge } from '@/lib/accent';
import { cn } from '@/lib/utils';
import { removeService, restoreService, saveServiceSection } from '@/server/actions/services';
import ItemsManager from './ItemsManager';
import LibrariesForm from './LibrariesForm';
import ServiceEditDialog from './ServiceEditDialog';
import TermsView from './TermsView';
import WordingForm from './WordingForm';
import { INK, QUIET, TEXT_BUTTON } from './quiet';

/**
 * One Service on its own page, redrawn 16 October 2026 in the catalogue's
 * quiet style and around what a person comes here to do, most often first:
 *
 *   1. read the price list, and change a price (in place, two seconds);
 *   2. add or edit an item (the side panel);
 *   3. say in one sentence what the service is (the description, which the
 *      catalogue card and the quotation print, and which nothing could edit);
 *   4. check what the contract promises (the terms, in a side sheet).
 *
 * **Contract terms are not part of a service.** A sold service names the
 * terms it uses (`partCodes`) and `frameOf` replaces its own sections with
 * them when a contract is drafted, so this page links to the terms and never
 * edits them. The forms that used to sit here edited the service's own
 * sections, which on every sold service no document reads.
 *
 * A row that *is* a set of terms (other services name it) opens as a terms
 * page instead: the editors, and which services share them.
 */
export default function ServicePage({
  service,
  terms,
  users,
  sharedWith = {},
  exclusions,
  clientInputs,
}: {
  service: ContractService;
  /** The terms this service names, in its own order (`termsOf`). */
  terms: ContractService[];
  /** The services that name this row as their terms (`termsUsers`). */
  users: ContractService[];
  /** Each terms row's other users, keyed by its code, for the "shared with" line. */
  sharedWith?: Record<string, ContractService[]>;
  exclusions: LibraryLine[];
  clientInputs: LibraryLine[];
}) {
  const isTerms = users.length > 0;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  /** The open terms sheet: a terms row's code, `'own'` for this row's own, or null. */
  const [sheet, setSheet] = useState<string | null>(null);

  const schedule = SCHEDULE_BY_KEY[service.scheduleKey];
  const live = (service.items ?? []).filter((item) => !item.archived);
  const ownTerms = hasOwnTerms(service);

  // The first thing missing, if anything is. One next step, never a checklist.
  const gap = isTerms || service.archived
    ? null
    : !service.blurb?.trim()
      ? { text: 'Add a description, so quotations can introduce this service.', go: () => setEditingDescription(true) }
      : live.length === 0
        ? { text: 'Add the first item to price this service.', go: () => setEditingId('') }
        : terms.length === 0 && !ownTerms
          ? { text: 'Add contract terms, or a contract for this service has no scope.', go: () => setSheet('own') }
          : null;

  const openTerms = sheet && sheet !== 'own' ? terms.find((t) => t.code === sheet) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-12 pt-12 pb-16">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-display font-medium">{service.name}</h1>
          <div className="flex items-center gap-3">
            {isTerms || service.archived ? null : (
              <Button variant="primary" className={INK} onClick={() => setEditingId('')}>
                <Plus aria-hidden />
                Add item
              </Button>
            )}
            <PageMenu service={service} isTerms={isTerms} />
          </div>
        </div>

        {isTerms ? null : (
          <Description
            service={service}
            editing={editingDescription}
            onEditingChange={setEditingDescription}
          />
        )}

        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted-foreground">
          <span className={accentBadge(schedule.accent, 'h-4 px-1', true)}>{service.code}</span>
          {(isTerms
            ? ['Contract terms', schedule.name]
            : [schedule.name, service.sacCode && `SAC ${service.sacCode}`]
          )
            .filter(Boolean)
            .map((part, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 ? <span aria-hidden className="text-tab-label">·</span> : null}
                {part}
              </span>
            ))}
        </p>

        {service.archived ? <ArchivedNotice code={service.code} /> : null}

        {gap ? (
          <Button
            variant="ghost"
            onClick={gap.go}
            className={cn(TEXT_BUTTON, 'w-fit gap-2 text-muted-foreground')}
          >
            <Circle aria-hidden className="size-3.5 text-tab-label" />
            {gap.text}
          </Button>
        ) : null}
      </header>

      {isTerms ? (
        <TermsPage service={service} users={users} exclusions={exclusions} clientInputs={clientInputs} />
      ) : (
        <>
          <ItemsManager service={service} editingId={editingId} onEditingChange={setEditingId} />

          <section aria-labelledby="terms-heading" className="flex flex-col gap-4">
            <h2 id="terms-heading" className="flex h-7 items-center text-lead font-normal text-muted-foreground">
              Contract terms
            </h2>
            {terms.length > 0 || ownTerms ? (
              <ul className="divide-y divide-border/50 rounded-lg border border-border/50">
                {(terms.length > 0 ? terms : [service]).map((t) => (
                  <li key={t.code}>
                    <TermsRow
                      terms={t}
                      label={terms.length > 0 ? t.name : 'This service’s own terms'}
                      sharedWith={sharedWith[t.code] ?? []}
                      onOpen={() => setSheet(terms.length > 0 ? t.code : 'own')}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-border/50 px-4 py-3">
                <p className="text-body text-tab-label">
                  No contract terms yet. A contract for this service would have no scope, limits or handover.
                </p>
                <Button size="sm" className={QUIET} onClick={() => setSheet('own')}>
                  Add terms
                </Button>
              </div>
            )}
          </section>
        </>
      )}

      {/* A linked set of terms: read here, edited on its own page. */}
      {openTerms ? (
        <DrawerSheet
          open
          onOpenChange={(next) => {
            if (!next) setSheet(null);
          }}
          float
          size="lg"
          title={openTerms.name}
          description="The terms a contract for this service uses."
          toolbar={
            <DrawerToolbar
              onBack={() => setSheet(null)}
              backLabel="Back to the service"
              actions={
                // A link drawn as a button, the house way (`not-found.tsx`):
                // `Button` with a `render` link loses native button semantics.
                <Link
                  href={`/client/services/${openTerms.code}`}
                  className={cn(buttonVariants({ size: 'sm' }), QUIET)}
                >
                  <ArrowUpRight aria-hidden />
                  Open terms page
                </Link>
              }
            />
          }
        >
          <TermsView terms={openTerms} exclusions={exclusions} clientInputs={clientInputs} />
        </DrawerSheet>
      ) : null}

      {/* A service that names no terms carries its own, and edits them here. */}
      {sheet === 'own' ? (
        <DrawerSheet
          open
          onOpenChange={(next) => {
            if (!next) setSheet(null);
          }}
          float
          size="lg"
          title="Contract terms"
          description="This service names no shared terms, so a contract uses these. Changes reach the next contract; drafted and signed ones keep their own copy."
          toolbar={<DrawerToolbar onBack={() => setSheet(null)} backLabel="Back to the service" />}
        >
          <div className="flex flex-col gap-10">
            <WordingForm service={service} />
            <LibrariesForm service={service} exclusions={exclusions} clientInputs={clientInputs} />
          </div>
        </DrawerSheet>
      ) : null}
    </div>
  );
}

/** How many points each section of a set of terms holds, in a line. */
function summaryOf(terms: ContractService): string {
  const parts = [
    [terms.included.length, 'included'],
    [terms.limits.length, terms.limits.length === 1 ? 'limit' : 'limits'],
    [terms.exclusionIds.length, 'not included'],
    [terms.clientInputIds.length, 'from the client'],
    [terms.receives.length, 'handed over'],
  ] as const;
  return parts
    .filter(([n]) => n > 0)
    .map(([n, label]) => `${n} ${label}`)
    .join(' · ');
}

function TermsRow({
  terms,
  label,
  sharedWith,
  onOpen,
}: {
  terms: ContractService;
  label: string;
  /** Other services using the same terms: a change to them reaches these too. */
  sharedWith: ContractService[];
  onOpen: () => void;
}) {
  return (
    <div className="relative flex min-h-10 items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Button variant="ghost" onClick={onOpen} className={cn(TEXT_BUTTON, 'min-w-0 after:absolute after:inset-0')}>
          <span className="truncate">{label}</span>
        </Button>
        <span className="truncate text-meta text-tab-label">{summaryOf(terms) || 'Nothing written yet'}</span>
      </div>
      {sharedWith.length > 0 ? (
        <span className="shrink-0 text-meta text-tab-label">
          Shared with {sharedWith.map((s) => s.name).join(', ')}
        </span>
      ) : null}
      <ChevronRight aria-hidden className="size-3.5 text-tab-label" />
    </div>
  );
}

/**
 * The description: the one sentence the catalogue card and the quotation
 * print, edited where it is read. Enter or click away saves, Shift+Enter is a
 * new line, Escape cancels.
 */
function Description({
  service,
  editing,
  onEditingChange,
}: {
  service: ContractService;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(service.blurb ?? '');
  const [shown, setShown] = useState<string | null>(null);
  /** Escape was pressed: the blur that follows must not save. A ref, because
   *  that blur runs in the same event, before state could update. */
  const cancelled = useRef(false);
  const text = shown ?? service.blurb ?? '';

  const commit = async () => {
    onEditingChange(false);
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(text);
      return;
    }
    const next = draft.trim();
    if (next === text.trim()) return;
    setShown(next);
    const result = await saveServiceSection(service.code, 'description', { blurb: next });
    if (!result.success) {
      setShown(null);
      setDraft(service.blurb ?? '');
      toast.error(result.error ?? 'Failed to save the description.');
      return;
    }
    router.refresh();
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <Textarea
          autoFocus
          aria-label="Description"
          value={draft}
          placeholder="What this service is, in a sentence a client would read"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Escape') {
              e.preventDefault();
              cancelled.current = e.key === 'Escape';
              e.currentTarget.blur();
            }
          }}
          onBlur={() => void commit()}
          className="min-h-0 border-border/50 text-lead"
        />
        <span className="text-meta text-tab-label">Shown on the catalogue and on quotations.</span>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={() => {
        setDraft(text);
        onEditingChange(true);
      }}
      aria-label={text ? `Edit the description: ${text}` : 'Add a description'}
      className={cn(
        TEXT_BUTTON,
        'w-fit max-w-[720px] text-lead whitespace-normal',
        text ? 'text-muted-foreground' : 'text-tab-label hover:text-muted-foreground',
      )}
    >
      {text || 'Add a description'}
    </Button>
  );
}

/**
 * Quick edit and archive, kept off the page and in a menu: neither is why
 * anyone opens it. Archive confirms and is not styled as a delete, because
 * it is reversible.
 */
function PageMenu({ service, isTerms }: { service: ContractService; isTerms: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const archive = () =>
    startTransition(async () => {
      const result = await removeService(service.code);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to archive the service.');
        return;
      }
      router.push('/client/services');
    });

  if (service.archived && isTerms) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button icon aria-label={`Actions for ${service.name}`} className={QUIET} />}
        >
          <MoreHorizontal aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          {isTerms ? null : (
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <Pencil aria-hidden />
              Quick edit
            </DropdownMenuItem>
          )}
          {service.archived ? null : (
            <DropdownMenuItem onClick={() => setConfirming(true)}>
              <Archive aria-hidden />
              Archive
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {editing ? <ServiceEditDialog service={service} onClose={() => setEditing(false)} /> : null}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Archive service"
        consequence="It leaves the catalogue and stops being offered on new contracts. Contracts already holding it keep their own copy, and it can be restored from the Archived tab."
        confirmLabel="Archive service"
        pending={pending}
        onConfirm={archive}
      />
    </>
  );
}

function ArchivedNotice({ code }: { code: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex w-fit items-center gap-3 text-body text-tab-label">
      Archived. It is not offered on new contracts.
      <Button
        size="sm"
        className={QUIET}
        pending={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await restoreService(code);
            if (!result.success) {
              toast.error(result.error ?? 'Failed to restore the service.');
              return;
            }
            router.refresh();
          })
        }
      >
        Restore
      </Button>
    </div>
  );
}

/**
 * A row that other services use as their contract terms: the editors, and
 * which services share them, said before anything is changed.
 */
function TermsPage({
  service,
  users,
  exclusions,
  clientInputs,
}: {
  service: ContractService;
  users: ContractService[];
  exclusions: LibraryLine[];
  clientInputs: LibraryLine[];
}) {
  return (
    <div className="flex flex-col gap-12">
      <p className="text-body text-muted-foreground">
        Used as the contract terms for{' '}
        {users.map((u, i) => (
          <span key={u.code}>
            {i > 0 ? (i === users.length - 1 ? ' and ' : ', ') : null}
            <Link href={`/client/services/${u.code}`} className="text-foreground underline-offset-4 hover:underline">
              {u.name}
            </Link>
          </span>
        ))}
        . A change here reaches the next contract for {users.length === 1 ? 'it' : 'each of them'}; drafted and
        signed contracts keep their own copy.
      </p>
      <WordingForm service={service} />
      <section aria-labelledby="libraries-heading" className="flex flex-col gap-4">
        <h2 id="libraries-heading" className="text-lead font-normal text-muted-foreground">
          Not included, and what the client provides
        </h2>
        <LibrariesForm service={service} exclusions={exclusions} clientInputs={clientInputs} />
      </section>
    </div>
  );
}
