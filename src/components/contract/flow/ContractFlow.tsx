'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmActionButton } from '@/components/patterns/ConfirmAction';
import FlowShell, { useActionsSlot } from '@/components/patterns/flow/FlowShell';
import { DocumentCrumbLabel } from '@/components/shell/DocumentCrumb';
import { resumeStep, stepIndex } from '@/components/patterns/flow/steps';
import { deleteDraftAction, finalizeDocument } from '@/server/actions/documents';
import { todayISO } from '@/lib/domain/dates';
import { DELETE_DRAFT_CONSEQUENCE, DOC_TYPES } from '@/lib/domain/registry';
import { blanksOf, isUnfilled, type BlankValues } from '@/lib/domain/contract/blanks';
import { contractScopes } from '@/lib/domain/contract/completeness';
import { copyPart, seedable, seedFromClient, withPart } from '@/lib/domain/contract/copy';
import type { MsaClause } from '@/lib/domain/contract/msa';
import type { ContractService, LibraryLine } from '@/lib/domain/service';
import type { StudioInfo } from '@/lib/domain/studio';
import {
  clientSnapshotOf,
  type ClientRecord,
  type ClientSnapshot,
  type ContractData,
  type ContractDocument,
} from '@/lib/domain/types';
import { contentOf, type DocContent } from '@/lib/domain/docContent';
import ServiceSheet from '@/components/contract/ServiceSheet';
import TermsForm from '@/components/contract/TermsForm';
import { contractBlocks, contractPageProps } from '@/components/docs/sheets/ContractSheet';
import DocumentWorkspace from '@/components/docs/DocumentWorkspace';
import { useDraftAutosave } from '@/components/docs/editors/useDraftAutosave';
import { UnsavedChangesDialog } from '@/components/docs/editors/draftStatus';
import { workspaceTitle } from '@/components/docs/workspaceTitle';
import { useProfile } from '@/lib/useProfile';
import { CONTRACT_PHASES, FIRST_PHASE, type ContractDraft } from './phases';
// Both belong to the summary rail, which is commented out below.
// import { contractSummary } from './summary';
// import SummaryRail from './SummaryRail';
import ClientPhase, { CLIENT_PHASE_WIDTH } from './ClientPhase';
import ServicesPhase from './ServicesPhase';
import ScopePhase from './ScopePhase';
import PreviewPhase from './PreviewPhase';

const EMPTY_SNAPSHOT: ClientSnapshot = { name: '', address: '', email: '', phone: '' };
const EMPTY_CONTRACT: ContractData = { parts: [], blanks: {}, library: {} };

interface ContractFlowProps {
  clients: ClientRecord[];
  /** The live services library — what the picker offers and a contract sells. */
  services: ContractService[];
  /**
   * Every service row including the archived, so a sold Service can resolve the
   * legal frames it names through `partCodes`.
   *
   * The two lists are deliberately different: the 22 Parts carry the fee blanks,
   * scope, limits, completion criteria and handover, and seeding the 16 sales
   * Services archived all of them (`CONTEXT.md` §5h). Archived means "not sold",
   * never "not law". `frameOf` in `contract/copy.ts` is the only reader.
   */
  frames?: ContractService[];
  exclusions: LibraryLine[];
  clientInputs: LibraryLine[];
  /**
   * The live clause library, for a *new* contract only.
   *
   * A new draft copies this onto itself the moment it exists, exactly as it
   * copies a Part from `services`. From then on the contract carries its own
   * clauses and editing the library cannot reach it (`CONTEXT.md` §5, §5b).
   */
  clauseLibrary?: MsaClause[];
  doc?: ContractDocument | null;
  studio?: StudioInfo;
  title: string;
}

/**
 * Building a contract, in five phases.
 *
 * This replaced `ContractEditor`, which held the same job in a 384px rail with
 * three stages in local state. Two things changed and both are the point.
 *
 * **The phase is in the URL.** The old editor's comment argued against it, on
 * the grounds that "a remount between them would throw it away" — and that was
 * true of a component holding six `useState` values and nothing else. It is not
 * true here: `useDraftAutosave` writes the draft on every change, and
 * `router.replace` does not remount. A contract is an hour's work, and a flow
 * whose back button leaves it entirely is a flow people lose work in
 * (`docs/design.md` §2.12).
 *
 * **The services come from the client.** Onboarding already recorded what this
 * client engaged, so picking them again from a blank catalogue was one fact
 * stored twice (`PRINCIPLES.md` rule 3). What that cost, and how it is paid
 * for, is in `ServicesPhase`: seeded Parts never pass through the service form,
 * so the completeness guarantee moved from that form's commit button to the
 * ledger on each row.
 */
export default function ContractFlow({
  clients,
  services,
  frames = [],
  exclusions,
  clientInputs,
  clauseLibrary,
  doc,
  studio,
  title,
}: ContractFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profile = useProfile();

  /**
   * One draft, where the rail editor had six `useState` calls.
   *
   * The five phases are one document being built: a value set on phase 1 is
   * read on phase 5, and splitting them per phase would mean threading four
   * setters through four components.
   */
  const [draft, setDraft] = useState<ContractDraft>(() => ({
    clientId: doc?.clientId ?? '',
    issueDate: doc?.issueDate ?? todayISO(),
    contract: doc?.contract ?? EMPTY_CONTRACT,
    content: doc?.content ?? (clauseLibrary ? { clauses: clauseLibrary } : {}),
  }));
  const [openCode, setOpenCode] = useState<string | null>(null);
  /**
   * Whether the service sheet is expanded, held here rather than in the sheet.
   *
   * The sheet is keyed on the service so that paging brings a new one its own
   * draft; held one level down, this would be thrown away by that remount and
   * paging while expanded would drop the reader back into a side drawer
   * mid-read. Same bug, same fix, as the clause library's own `expanded`.
   */
  const [sheetExpanded, setSheetExpanded] = useState(false);
  /**
   * Which document action is running, not merely that one is.
   *
   * A boolean was enough while it only gated `disabled`, because both buttons
   * should go dead whichever is working. It stopped being enough the moment it
   * also drove the spinner: Finalize and Delete read the same flag, so clicking
   * one set both of them spinning and the bar claimed to be doing two things,
   * one of which destroys the document the other is issuing.
   *
   * Null means idle. Both buttons still disable on either action — that part
   * was right — but only the one named here says it is working.
   */
  const [running, setRunning] = useState<'finalize' | 'delete' | null>(null);
  const isSubmitting = running !== null;
  const [actions, setActions] = useActionsSlot();

  const autosave = useDraftAutosave({
    typeCode: 'CON',
    initialDocId: doc?.id,
    recipientId: draft.clientId,
    payload: {
      issueDate: draft.issueDate,
      contract: draft.contract,
      content: draft.content,
    },
  });
  const { docId, saveState, serverError, setServerError } = autosave;

  /**
   * Where an existing contract opens: the first phase it has nothing for.
   *
   * A contract is an hour's work across five phases, and the documents list
   * links to it with no `?phase=` at all. `stepIndex` answers 0 for an absent
   * key, so every half-built contract opened on *Client* — a screen whose one
   * question was answered before the draft existed — and the operator had to
   * remember how far they had got and click back to it. Onboarding already
   * solved this for clients (`ClientsTable` links carry `?step=resumeStep`),
   * and this is the same rule on the same helper.
   *
   * **Resumed here rather than in the link**, which is the one real choice in
   * this. `openDocHref` is handed `{ id, type, status }` and nothing else, so
   * it cannot see the contract's phases without loading the document; the flow
   * already holds the whole draft. Doing it here also covers every other way in
   * — a pasted URL, a bookmark, the ⌘K palette — rather than only the rows that
   * remembered to ask for it.
   *
   * **Only when the URL says nothing.** An explicit `?phase=` is an answer,
   * including one the reader typed or arrived at with the back button, and
   * overriding it would make the phase row's own links unusable on a contract
   * whose earlier phases are full. A *new* contract has no draft to read and
   * falls through to the first phase exactly as before.
   *
   * **Computed once, from the document as it arrived.** `resumeStep` reads the
   * draft, and the draft changes on every keystroke: recomputed per render, the
   * phase would move out from under somebody the moment their typing completed
   * the phase they were standing on. `useState`'s initialiser runs on the first
   * render only, which is exactly the life this answer should have.
   *
   * **A resume happens on arrival or not at all**, which is the other half of
   * that and was missing. Reported 21 September 2026: picking a client on a new
   * contract jumped to Scope, skipping the dates, the term and the whole
   * Services phase. Freezing the *value* was not enough, because `active` still
   * read it on every render — so the frozen answer, computed before there was a
   * document, was `FIRST_PHASE`, and the moment the save gave the flow a
   * `docId` the URL became `/docs/<id>` with no `?phase=` (`useDraftAutosave`
   * keeps `window.location.search`, and on `/docs/new/contract` that is empty).
   * From then on every render resolved the phase against a draft the seed had
   * already filled three phases of.
   *
   * So the resume is consumed once, into state the reader then owns. Selecting
   * a client is an answer to the phase you are standing on, never a request to
   * leave it.
   */
  const requested = searchParams.get('phase');
  const [landed] = useState(() =>
    requested ?? (doc ? resumeStep(CONTRACT_PHASES, draft) : FIRST_PHASE),
  );
  const active = stepIndex(CONTRACT_PHASES, requested ?? landed);
  const phase = CONTRACT_PHASES[active];

  /**
   * Put the phase in the URL once the draft has an id.
   *
   * A new contract starts at `/docs/new/contract` with no query string, and the
   * save rewrites the path to `/docs/<id>` keeping `window.location.search` —
   * which is empty. So the address bar ended up naming a document that exists
   * while saying nothing about where in it the reader was standing, and a
   * refresh resolved that silence through the resume: on a seeded contract,
   * three phases in.
   *
   * `replaceState` rather than the router, for the same reason
   * `useDraftAutosave` uses it: a navigation here would remount the flow and
   * take the half-typed document with it. This only ever *adds* the phase the
   * reader is already on, so it is not a move and leaves no history entry.
   */
  useEffect(() => {
    if (!docId || requested) return;
    const url = new URL(window.location.href);
    url.searchParams.set('phase', phase.key);
    window.history.replaceState(null, '', url);
  }, [docId, requested, phase.key]);

  const client = clients.find((c) => c.id === draft.clientId);

  /**
   * Move to a phase. **Nothing is saved here**: the draft writes itself, so a
   * phase change is a change of address and not a commit.
   */
  const goTo = useCallback(
    (index: number) => {
      const key = CONTRACT_PHASES[index]?.key;
      if (!key) return;
      const base = docId ? `/${profile}/docs/${docId}` : `/${profile}/docs/new/contract`;
      router.replace(`${base}?phase=${key}`, { scroll: false });
    },
    [active, docId, profile, router],
  );

  const patch = (next: Partial<ContractDraft>) => setDraft((prev) => ({ ...prev, ...next }));
  const patchContract = (next: Partial<ContractData>) =>
    setDraft((prev) => ({ ...prev, contract: { ...prev.contract, ...next } }));

  /**
   * Picking a client seeds the contract from their record.
   *
   * Guarded by `seedable`, which is the `DocumentEditor` rule: a contract that
   * already has Parts or typed blanks is somebody's work, and changing the
   * client on it must not throw that away.
   */
  const onClientChange = (patchValues: Parameters<typeof patch>[0] & { clientId?: string }) => {
    const nextId = patchValues.clientId;
    if (nextId === undefined || nextId === draft.clientId) {
      patch(patchValues);
      return;
    }
    const picked = clients.find((c) => c.id === nextId);
    if (!picked || !seedable(draft.contract)) {
      patch(patchValues);
      return;
    }
    const seeded = seedFromClient(picked, services, exclusions, clientInputs, frames);
    setDraft((prev) => ({
      ...prev,
      ...patchValues,
      contract: {
        ...prev.contract,
        parts: seeded.parts,
        library: seeded.library,
        // The fee the client record already agreed, written into each Part's
        // first fee blank. Under the typed blanks, not over them: `seedable`
        // has already refused to seed a contract with any, so there is nothing
        // to overwrite, and the order says which would win if that changed.
        blanks: { ...seeded.blanks, ...prev.contract.blanks },
        termMonths: seeded.termMonths ?? prev.contract.termMonths,
        effectiveDate: seeded.effectiveDate ?? prev.contract.effectiveDate,
      },
    }));
  };

  const onAddService = (service: ContractService) => {
    // No `agreed`: adding by hand is choosing the Service, and the scope phase
    // is where its items get narrowed. `frames` resolves its legal text.
    const { part, library } = copyPart(service, exclusions, clientInputs, undefined, frames);
    patchContract(withPart(draft.contract, part, library));
    setOpenCode(service.code);
  };

  /**
   * Removing drops the Part but leaves its blank values and library lines in
   * place. Adding it again then restores what was typed, which is what someone
   * who removed it by accident expects; the stale keys are inert and are
   * dropped at finalize, when only the resolved contract is materialised.
   */
  const onRemoveService = (code: string) =>
    patchContract({
      parts: draft.contract.parts.filter((p) => p.code !== code),
      reviewed: (draft.contract.reviewed ?? []).filter((c) => c !== code),
    });

  /**
   * Saving a Part from the sheet also records that it was looked at.
   *
   * **It does not close the sheet.** The pager commits and then opens the next
   * service, so closing here would slam the panel shut on every page. Closing
   * is the caller's act: the Save button and the back arrow both call
   * `onClose` themselves.
   */
  const onCommitPart = (part: ContractService, partBlanks: BlankValues) => {
    // Only `library` is taken: `part` arrives from the sheet already resolved
    // and possibly edited, so re-deriving it here would discard those edits.
    // `frames` still goes in, or a Part whose exclusion ids came from its frame
    // would resolve against an empty map and lose its "not included" text.
    const { library } = copyPart(part, exclusions, clientInputs, undefined, frames);
    const next = withPart(draft.contract, part, library, partBlanks);
    patchContract({
      ...next,
      reviewed: [...new Set([...(draft.contract.reviewed ?? []), part.code])],
    });
  };

  const onConfirmPart = (code: string) =>
    patchContract({
      reviewed: [...new Set([...(draft.contract.reviewed ?? []), code])],
    });

  const setBlank = (key: string, value: string) =>
    patchContract({ blanks: { ...draft.contract.blanks, [key]: value } });

  const clientSnapshot: ClientSnapshot = client
    ? clientSnapshotOf(client)
    : (doc?.clientSnapshot ?? EMPTY_SNAPSHOT);

  const previewDoc: ContractDocument = {
    id: docId ?? 'preview',
    studioSnapshot: doc?.studioSnapshot ?? studio,
    type: 'CON',
    status: doc?.status ?? 'draft',
    clientId: draft.clientId,
    clientSnapshot,
    issueDate: draft.issueDate,
    lineItems: [],
    gstRatePercent: 0,
    contract: draft.contract,
    content: draft.content,
    createdAt: doc?.createdAt ?? 0,
    updatedAt: 0,
  };

  const scopes = useMemo(() => contractScopes(draft.contract), [draft.contract]);
  const termScopes = scopes.filter((s) => !s.scope.startsWith('part.'));
  const unfilled = scopes.flatMap((scope) =>
    blanksOf(scope.parsed).filter((blank) => isUnfilled(draft.contract.blanks, blank)),
  );
  const resolved = contentOf(previewDoc, DOC_TYPES.CON);

  const onFinalize = async () => {
    if (!docId) return;
    setServerError(null);
    setRunning('finalize');
    // Freeze before flushing — see `DocumentEditor.onFinalize`. The flush goes
    // behind whatever autosave already has in flight, so the document being
    // frozen is the one on screen.
    autosave.freeze();
    try {
      if (!(await autosave.flush())) {
        autosave.thaw();
        return;
      }
      const result = await finalizeDocument(docId);
      if (!result.success) {
        setServerError(result.error ?? 'Something went wrong.');
        autosave.thaw();
        return;
      }
      router.push(`/${profile}/docs/${docId}/print`);
    } finally {
      setRunning(null);
    }
  };

  const onDelete = async () => {
    if (!docId) return;
    setServerError(null);
    setRunning('delete');
    autosave.freeze();
    try {
      const result = await deleteDraftAction(docId);
      if (!result.success) {
        setServerError(result.error ?? 'Something went wrong.');
        autosave.thaw();
        return;
      }
      router.push('/');
    } finally {
      setRunning(null);
    }
  };

  const openService = openCode ? services.find((s) => s.code === openCode) : undefined;

  /**
   * The forward button, which is the whole footer on every phase but the last.
   *
   * Disabled until the phase is complete rather than hidden: a control that
   * appears once you have earned it is a control you cannot plan around, and
   * the phase's own rows already say what is missing.
   */
  const advance =
    active < CONTRACT_PHASES.length - 1 ? (
      <Button variant="primary"
        type="button"
        size="md"
        className="group/tray hover:bg-primary"
        disabled={!phase.isComplete(draft)}
        onClick={() => goTo(active + 1)}
      >
        {CONTRACT_PHASES[active + 1].short}
        <ArrowRight aria-hidden="true" />
      </Button>
    ) : null;

  const back = active > 0 ? {
    label: `Back to ${CONTRACT_PHASES[active - 1].title}`,
    go: () => goTo(active - 1),
  } : undefined;

  /**
   * The preview's actions, floating over the document rather than on a bar.
   *
   * The pinned footer is gone with the rest of the shell's chrome on this phase
   * (`chrome={false}` below), so these draw themselves: a small container
   * centred near the foot of the band, over the page it acts on.
   *
   * **The back arrow is in here deliberately.** With the phase row off and the
   * editing rail off, it is the only way off this phase that is not Finalize,
   * and Finalize is irreversible when it is not refusing on an unfilled blank.
   * It was asked to leave the footer, and it did; what it could not do is stop
   * existing, or a contract whose preview shows a wrong figure would have
   * nowhere to go.
   *
   * `pointer-events-none` on the positioned wrapper with `auto` back on the bar
   * itself, or the container would swallow clicks on the document across the
   * full width of the band.
   *
   * **Rectangular, not a pill** (18 September 2026, on request). The radii
   * follow `docs/design.md` §1.3's nesting rule rather than being picked: the
   * bar is a floating panel, so `rounded-lg`, and its controls step down one to
   * the `rounded-md` every other button in the app carries. A pill inside a
   * pill read as one shape with a line through it, which is the same note §2.9
   * already makes about the pager.
   */
  const finalizeActions = docId ? (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-2">
      {/*
        The refusal, over the document, because this phase has nowhere else to
        put it.

        `finalizeDocument` answers a refusal in a sentence — an unfilled blank,
        a place of supply that does not match the client, a PO number the client
        requires — and `onFinalize` has always stored it. Nothing rendered it
        here. `SaveError` is the app's one reader of `serverError` and it lives
        in the editing rail, which this phase turns off (`rail={false}` in
        `PreviewPhase`), so every one of those sentences was written to state
        nobody could see: the button disabled itself for a moment, came back,
        and the contract silently did not issue.

        `role="alert"` so it is announced rather than merely drawn, and it
        clears itself on the next attempt (`onFinalize` nulls it first), so a
        stale reason cannot sit under a button that has since succeeded.
      */}
      {serverError ? (
        <div
          role="alert"
          className="pointer-events-auto max-w-lg rounded-lg border border-destructive/50 bg-card/95 px-3 py-2 text-body text-destructive shadow-lg backdrop-blur"
        >
          {serverError}
        </div>
      ) : null}
      <div className="pointer-events-auto flex items-center gap-2 rounded-lg border bg-card/95 p-2 shadow-lg backdrop-blur">
        {back ? (
          <Button
            type="button"
            variant="ghost"
            size="sm" icon
            aria-label={back.label}
            onClick={back.go}
          >
            <ArrowLeft aria-hidden />
          </Button>
        ) : null}
        <ConfirmActionButton
          label="Finalize"
          title="Finalize this contract?"
          description="The contract becomes immutable and takes its number. Corrections after this mean duplicating it as a new draft."
          confirmLabel="Finalize"
          variant="primary"
          size="md"
          className="px-6"
          onConfirm={onFinalize}
          /*
            `pending` rather than folding this into `disabled`: finalizing
            writes a document number and renders a PDF, so it is the one action
            here with a wait worth drawing. Disabled alone read as "you cannot
            do this" for the few seconds it was actually working.

            Keyed on *which* action is running, never on `isSubmitting`. Both
            buttons shared that flag once and both span together, so clicking
            Finalize showed the bin working too — the bar claiming to issue the
            document and destroy it at the same time.
          */
          pending={running === 'finalize'}
          disabled={isSubmitting || unfilled.length > 0 || draft.contract.parts.length === 0}
        />
        <ConfirmActionButton
          label="Delete draft"
          icon={<Trash2 />}
          size="sm"
          title="Delete this draft?"
          description={DELETE_DRAFT_CONSEQUENCE}
          confirmLabel="Delete"
          confirmVariant="destructive"
          className="shrink-0 text-destructive hover:text-destructive"
          onConfirm={onDelete}
          // Its own action, not `isSubmitting`. See the note on Finalize above.
          pending={running === 'delete'}
          disabled={isSubmitting}
        />
      </div>
    </div>
  ) : null;

  /*
    The summary rail is off for now, on request.

    It was beside the flow on every phase but the preview, carrying the earlier
    phases' decisions forward. Everything it needs is still here and still
    tested: `summary.ts` derives it per render and `SummaryRail.tsx` draws it,
    so turning it back on is uncommenting the `useMemo` below and the `aside`
    prop on `FlowShell`.

    Preview was the one phase that never had it. That phase is `fill`: it is a
    document beside its own page rail and takes the whole band, so a third
    column there would squeeze the thing being read.
  */
  // const summary = useMemo(
  //   () => contractSummary(draft, client?.name),
  //   [draft, client?.name],
  // );

  return (
    <>
      {/* Names the document's kind, which the path cannot say: the route is a
          uuid. The header row prints it twice over, as the trail's type crumb
          and as the title centred on the inset, from this one value. See
          `admin/DocumentCrumb.tsx`. */}
      <DocumentCrumbLabel label={DOC_TYPES.CON.label} />
      <FlowShell
        steps={CONTRACT_PHASES}
        active={active}
        // The draft is the record, and it exists once the row does. Before that
        // every phase but the first is locked, exactly as onboarding locks
        // everything until identity creates the client.
        record={docId ? draft : null}
        title={workspaceTitle(title, DOC_TYPES.CON.label, client?.name)}
        back={back}
        onSelect={goTo}
        onActionsSlot={setActions}
        fill={phase.key === 'preview'}
        // The client phase's controls carry their own widths, so its panel
        // narrows to them rather than the form floating in a wider card.
        width={phase.key === 'client' ? CLIENT_PHASE_WIDTH : undefined}
        // The services phase grows and shrinks as a Schedule is opened, so its
        // panel hangs from the top rather than re-centring under the tiles
        // that were just clicked. See `FlowShell`'s `anchor`.
        anchor={phase.key === 'services' ? 'top' : 'center'}
        // The preview is a document, not a step of a form: no progress track
        // over it and no bar under it. Its actions float instead, drawn below.
        chrome={phase.key !== 'preview'}
        // aside={
        //   phase.key === 'preview' ? undefined : (
        //     <SummaryRail groups={summary} activePhase={phase.key} />
        //   )
        // }
      >
        {phase.key === 'client' ? (
          <ClientPhase
            clients={clients}
            clientId={draft.clientId}
            issueDate={draft.issueDate}
            effectiveDate={draft.contract.effectiveDate}
            termMonths={draft.contract.termMonths}
            onChange={(values) => {
              const { clientId, issueDate, ...rest } = values;
              if (clientId !== undefined) onClientChange({ clientId });
              if (issueDate !== undefined) patch({ issueDate });
              if ('effectiveDate' in rest) patchContract({ effectiveDate: rest.effectiveDate });
              if ('termMonths' in rest) patchContract({ termMonths: rest.termMonths });
            }}
          />
        ) : null}

        {phase.key === 'services' ? (
          <ServicesPhase
            contract={draft.contract}
            client={client}
            services={services}
            onAdd={onAddService}
            onRemove={onRemoveService}
          />
        ) : null}

        {phase.key === 'scope' ? (
          <ScopePhase
            contract={draft.contract}
            client={client}
            onRemove={onRemoveService}
            onOpen={setOpenCode}
            onConfirm={onConfirmPart}
          />
        ) : null}

        {phase.key === 'terms' ? (
          <TermsForm scopes={termScopes} values={draft.contract.blanks} onChange={setBlank} />
        ) : null}

        {phase.key === 'preview' ? (
          // `relative` is what the floating bar positions against: the phase's
          // own box, so it sits over the document rather than over the app.
          <div className="relative flex min-h-0 flex-1 flex-col">
            <PreviewPhase
              doc={previewDoc}
              resolved={resolved}
              content={draft.content}
              unfilled={unfilled.length}
              saveState={saveState}
              autosave={autosave}
              onContentChange={(next) => patch({ content: { ...draft.content, ...next } })}
              onGoToPhase={(key) => goTo(stepIndex(CONTRACT_PHASES, key))}
            />
            {finalizeActions}
          </div>
        ) : null}
      </FlowShell>

      {/* The advance button lives in the shell's footer slot, portalled the way
          a step form's submit is, so it stays pinned while the phase slides. */}
      {actions && advance ? <FooterPortal node={actions}>{advance}</FooterPortal> : null}

      {openService ? (
        <ServiceSheet
          key={openService.code}
          service={openService}
          part={draft.contract.parts.find((p) => p.code === openService.code)}
          blanks={draft.contract.blanks}
          exclusions={exclusions}
          clientInputs={clientInputs}
          // The contract's own Parts, in the order the list shows them, so the
          // pager walks what is on this contract rather than the catalogue.
          siblings={draft.contract.parts}
          expanded={sheetExpanded}
          onExpandedChange={setSheetExpanded}
          onOpen={setOpenCode}
          onClose={() => {
            setOpenCode(null);
            // Closing is the end of the read, so the next one opens as a
            // drawer. Same reasoning as the clause library's `expanded`.
            setSheetExpanded(false);
          }}
          onCommit={onCommitPart}
        />
      ) : null}

      <UnsavedChangesDialog autosave={autosave} label="contract" />
    </>
  );
}

/** The footer slot, as a portal. See `flow/stepKit`'s `StepActionsSlot`. */
function FooterPortal({ node, children }: { node: HTMLElement; children: React.ReactNode }) {
  return createPortal(children, node);
}
