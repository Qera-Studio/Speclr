'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import {
  createDraft,
  deleteDraftAction,
  finalizeDocument,
  updateDraft,
} from '@/server/actions/documents';
import { todayISO } from '@/lib/domain/dates';
import { DOC_TYPES } from '@/lib/domain/registry';
import { assemble } from '@/lib/domain/contract/assembly';
import {
  blankValue,
  blanksOf,
  disagreeingRows,
  isUnfilled,
  type BlankValues,
} from '@/lib/domain/contract/blanks';
import { contractScopes } from '@/lib/domain/contract/completeness';
import { MSA_CLAUSES } from '@/lib/domain/contract/msa';
import type { ContractService, LibraryLine } from '@/lib/domain/contract/service';
import type { StudioInfo } from '@/lib/domain/studio';
import {
  clientSnapshotOf,
  type ClientRecord,
  type ClientSnapshot,
  type ContractData,
  type ContractDocument,
} from '@/lib/domain/types';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import PartCard from '@/components/contract/PartCard';
import ServiceDialog from '@/components/contract/ServiceDialog';
import ServicePicker from '@/components/contract/ServicePicker';
import { contractBlocks, COVER_CLASSNAME } from '@/components/docs/sheets/ContractSheet';
import DocumentWorkspace from '@/components/docs/DocumentWorkspace';
import EditorSection from './EditorSection';
import { ClauseFields, ContentText, shown, type ContentPatch } from './ContentFields';
import { contentOf, type DocContent } from '@/lib/domain/docContent';
import { workspaceTitle } from '../workspaceTitle';

const EMPTY_SNAPSHOT: ClientSnapshot = { name: '', address: '', email: '', phone: '' };
const EMPTY_CONTRACT: ContractData = { parts: [], blanks: {}, library: {} };

interface ContractEditorProps {
  clients: ClientRecord[];
  /** The live services library — the source a Part is copied from. */
  services: ContractService[];
  exclusions: LibraryLine[];
  clientInputs: LibraryLine[];
  doc?: ContractDocument | null;
  /** Live studio details, for a draft's preview. See the note in DocumentEditor. */
  studio?: StudioInfo;
  /** Shown in the workspace bar; supplied by the route page. */
  title: string;
}

/**
 * Building a contract, in two passes.
 *
 * **Services first, then the contract.** Everything used to live in one rail —
 * client, a twenty-two row list, one collapsible per Part holding its blanks
 * *and* its twenty-odd exclusions *and* its client inputs, then the standing
 * terms, the cover and twenty-eight clauses. Four services made it unreadable.
 * Now a Service is picked and configured on its own in a dialog, and only what
 * belongs to the contract as a whole is left for the second screen.
 *
 * The step is local state rather than a route: the A4 preview is computed from
 * this component's state and must stay mounted across the change.
 */
export default function ContractEditor({
  clients,
  services,
  exclusions,
  clientInputs,
  doc,
  studio,
  title,
}: ContractEditorProps) {
  const router = useRouter();
  const [clientId, setClientId] = useState(doc?.clientId ?? '');
  const [issueDate, setIssueDate] = useState(doc?.issueDate ?? todayISO());
  const [contract, setContract] = useState<ContractData>(doc?.contract ?? EMPTY_CONTRACT);
  /** Text overrides — see the note in `DocumentEditor`. */
  const [content, setContent] = useState<DocContent>(doc?.content ?? {});
  const patchContent: ContentPatch = (patch) => setContent((prev) => ({ ...prev, ...patch }));
  const [serviceQuery, setServiceQuery] = useState('');
  /** Which Service the dialog is showing, by code. */
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [step, setStep] = useState<'services' | 'details'>(
    doc?.contract.parts.length ? 'details' : 'services',
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const client = clients.find((c) => c.id === clientId);
  const heading = workspaceTitle(title, DOC_TYPES.CON.label, client?.name);
  const clientSnapshot: ClientSnapshot = client
    ? clientSnapshotOf(client)
    : (doc?.clientSnapshot ?? EMPTY_SNAPSHOT);

  const previewDoc: ContractDocument = {
    id: doc?.id ?? 'preview',
    studioSnapshot: doc?.studioSnapshot ?? studio,
    type: 'CON',
    status: doc?.status ?? 'draft',
    clientId,
    clientSnapshot,
    issueDate,
    lineItems: [],
    gstRatePercent: 0,
    contract,
    content,
    createdAt: doc?.createdAt ?? 0,
    updatedAt: 0,
  };

  const assembled = assemble(contract.parts);
  const added = new Set(contract.parts.map((p) => p.code));

  /**
   * Committing copies the Service onto the contract, with the text of every
   * library line it names. From this moment the contract owns its words:
   * editing the library afterwards cannot change them, and — because blank keys
   * are derived from the text — cannot move this draft's fields either.
   */
  const commitPart = (part: ContractService, partBlanks: BlankValues) => {
    const library = { ...contract.library };
    for (const line of [...exclusions, ...clientInputs]) {
      if (part.exclusionIds.includes(line.id) || part.clientInputIds.includes(line.id)) {
        library[line.id] = line.text;
      }
    }
    setContract((prev) => ({
      parts: prev.parts.some((p) => p.code === part.code)
        ? prev.parts.map((p) => (p.code === part.code ? part : p))
        : [...prev.parts, part],
      blanks: { ...prev.blanks, ...partBlanks },
      library,
    }));
    setOpenCode(null);
  };

  /**
   * Removing drops the Part but leaves its blank values and library lines in
   * place. Adding it again then restores what was typed, which is what someone
   * who removed it by accident expects; the stale keys are inert and are
   * dropped at finalize, when only the resolved contract is materialised.
   */
  const removePart = (code: string) =>
    setContract((prev) => ({ ...prev, parts: prev.parts.filter((p) => p.code !== code) }));

  const setBlank = (key: string, value: string) =>
    setContract((prev) => ({ ...prev, blanks: { ...prev.blanks, [key]: value } }));

  const scopes = useMemo(() => contractScopes(contract), [contract]);
  const unfilled = scopes.flatMap((scope) =>
    blanksOf(scope.parsed).filter((blank) => isUnfilled(contract.blanks, blank)),
  );
  const unfilledIn = (code: string) =>
    scopes
      .filter((s) => s.scope.startsWith(`part.${code}.`))
      .flatMap((s) => blanksOf(s.parsed))
      .filter((blank) => isUnfilled(contract.blanks, blank)).length;

  /**
   * The only cross-check per-occurrence blanks allow. See `disagreeingRows` —
   * it compares labelled figures across Parts, which is where the same number
   * genuinely repeats.
   */
  const disagreements = disagreeingRows(
    assembled.flatMap(({ parts }) =>
      parts.flatMap(({ part, label }) =>
        [...part.limits, ...part.fee].map((row, i) => ({
          label: row.label,
          value: blankValue(contract.blanks, {
            key: `part.${part.code}.${part.limits.includes(row) ? 'limits' : 'fee'}#${i}`,
            fallback: row.value,
          }),
          source: `Part ${label}`,
        })),
      ),
    ),
  );

  const buildPayload = () => ({ issueDate, contract, content });

  // What the contract will print — the source for every content input's value.
  const resolved = contentOf(previewDoc, DOC_TYPES.CON);

  const onSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSaved(false);
    setIsSubmitting(true);
    try {
      const payload = buildPayload();
      const result = doc
        ? await updateDraft(doc.id, clientId, payload)
        : await createDraft('CON', clientId, payload);

      if (!result.success) {
        setServerError(result.error ?? 'Something went wrong.');
        return;
      }
      if (doc) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/docs/${result.id}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFinalize = async () => {
    if (!doc) return;
    setServerError(null);
    setIsSubmitting(true);
    try {
      const saveResult = await updateDraft(doc.id, clientId, buildPayload());
      if (!saveResult.success) {
        setServerError(saveResult.error ?? 'Something went wrong.');
        return;
      }
      const result = await finalizeDocument(doc.id);
      if (!result.success) {
        setServerError(result.error ?? 'Something went wrong.');
        return;
      }
      router.push(`/docs/${doc.id}/print`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!doc) return;
    setServerError(null);
    setIsSubmitting(true);
    try {
      const result = await deleteDraftAction(doc.id);
      if (!result.success) {
        setServerError(result.error ?? 'Something went wrong.');
        return;
      }
      router.push('/');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * What the contract holds, in the order it prints. Repeated on both screens:
   * on the first it is what you are assembling, on the second it is how you get
   * back into a Part to correct a fee.
   */
  const partCards = (
    <div className="flex flex-col gap-2">
      <PartCard
        title="Master Service Agreement"
        subtitle={`${MSA_CLAUSES.length} clauses · always included`}
      />
      {assembled.flatMap(({ letter, schedule, parts }) =>
        parts.map(({ part, label }) => (
          <PartCard
            key={part.code}
            label={`Part ${label}`}
            title={part.name}
            subtitle={`Schedule ${letter} · ${schedule.name}`}
            unfilled={unfilledIn(part.code)}
            onOpen={() => setOpenCode(part.code)}
            onRemove={() => removePart(part.code)}
          />
        )),
      )}
      {contract.parts.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          No services yet. Pick one below to add the first Part.
        </p>
      ) : null}
    </div>
  );

  const openService = openCode ? services.find((s) => s.code === openCode) : undefined;

  return (
    <DocumentWorkspace
      title={heading}
      coverFirst
      firstPageClassName={COVER_CLASSNAME}
      preview={contractBlocks(previewDoc)}
    >
      <form onSubmit={onSaveDraft} className="flex flex-col gap-4" noValidate>
        <FieldGroup size="form">
          {step === 'services' ? (
            <>
              <EditorSection title="Client & date" description="Who it is with, and when" defaultOpen>
                <Field>
                  <FieldLabel htmlFor="con-client">Client</FieldLabel>
                  <Combobox
                    id="con-client"
                    size="form"
                    options={clients.map((c) => ({ value: c.id, label: c.name }))}
                    value={clientId}
                    onValueChange={setClientId}
                    placeholder="Select a client…"
                    emptyMessage="No matching clients."
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="con-issue-date">Agreement date</FieldLabel>
                  <DatePicker
                    id="con-issue-date"
                    size="form"
                    value={issueDate}
                    onValueChange={setIssueDate}
                  />
                </Field>
              </EditorSection>

              <EditorSection
                title="In this contract"
                description={`${contract.parts.length} of ${services.length} services`}
                defaultOpen
              >
                {partCards}
              </EditorSection>

              {/*
                One tab per Schedule, so the list is a handful of choices rather
                than twenty-two. Which Schedule a Service belongs to is still
                not a decision to make (contract-system.md §10) — it is where
                the Service already lives, and the tabs say so.
              */}
              <EditorSection title="Add a service" description="Search or browse by Schedule" defaultOpen>
                <ServicePicker
                  services={services}
                  query={serviceQuery}
                  onQueryChange={setServiceQuery}
                  added={added}
                  onPick={(service) => setOpenCode(service.code)}
                />
              </EditorSection>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setStep('details')}
                  disabled={contract.parts.length === 0}
                >
                  Contract details
                  <ArrowRight />
                </Button>
                {contract.parts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Add a service first.</p>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setStep('services')}>
                  <ArrowLeft />
                  Services
                </Button>
                <Badge variant="outline">
                  {assembled.length} schedule{assembled.length === 1 ? '' : 's'} ·{' '}
                  {contract.parts.length} part{contract.parts.length === 1 ? '' : 's'}
                </Badge>
              </div>

              <EditorSection
                title="In this contract"
                description="Open a Part to change its figures"
                defaultOpen
              >
                {partCards}
              </EditorSection>

              {/* The Agreement's and Schedules' own blanks, kept away from the Parts. */}
              <EditorSection
                title="Agreement & schedule terms"
                description="Periods, rates and splits in the standing text"
              >
                {scopes
                  .filter((s) => !s.scope.startsWith('part.'))
                  .map((scope) => (
                    <div key={scope.scope} className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {scope.group} · {scope.label}
                      </p>
                      {scope.parsed.flatMap((parsed) =>
                        parsed.blanks.map((blank) => (
                          <Field key={blank.key}>
                            <FieldLabel htmlFor={blank.key} className="sr-only">
                              {scope.label}
                            </FieldLabel>
                            <Input
                              id={blank.key}
                              size="form"
                              aria-invalid={isUnfilled(contract.blanks, blank) || undefined}
                              value={blankValue(contract.blanks, blank)}
                              onChange={(e) => setBlank(blank.key, e.target.value)}
                            />
                          </Field>
                        )),
                      )}
                    </div>
                  ))}
              </EditorSection>

              <EditorSection title="Cover" description="Masthead, intro and the parties preamble">
                <ContentText
                  id="con-masthead"
                  label="Masthead"
                  value={shown(content, resolved, 'masthead')}
                  onChange={(masthead) => patchContent({ masthead })}
                />
                <ContentText
                  id="con-intro"
                  label="Cover intro"
                  rows={5}
                  value={shown(content, resolved, 'intro')}
                  onChange={(intro) => patchContent({ intro })}
                />
                <ContentText
                  id="con-preamble"
                  label="Parties preamble"
                  rows={3}
                  value={shown(content, resolved, 'preamble')}
                  onChange={(preamble) => patchContent({ preamble })}
                />
              </EditorSection>

              <EditorSection
                title="Clauses"
                description={`The Master Service Agreement — ${MSA_CLAUSES.length} clauses`}
              >
                <ClauseFields
                  clauses={shown(content, resolved, 'clauses')}
                  onChange={(clauses) => patchContent({ clauses })}
                />
              </EditorSection>

              {unfilled.length > 0 ? (
                <Alert role="status">
                  <AlertTitle>
                    {unfilled.length} blank{unfilled.length === 1 ? '' : 's'} still to fill
                  </AlertTitle>
                  <AlertDescription>
                    They show in the preview. The contract cannot be issued until every one
                    is filled.
                  </AlertDescription>
                </Alert>
              ) : null}

              {disagreements.length > 0 ? (
                <Alert role="status">
                  <AlertTitle>Same figure, two values</AlertTitle>
                  <AlertDescription>
                    <ul className="flex flex-col gap-1">
                      {disagreements.map((d) => (
                        <li key={d.label}>
                          <span className="font-medium">{d.label}</span>{' '}
                          {d.values.map((v) => `${v.source}: ${v.value}`).join(' · ')}
                        </li>
                      ))}
                    </ul>
                    Deliberate is fine — this is a warning, not a block.
                  </AlertDescription>
                </Alert>
              ) : null}

              {serverError ? (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              ) : null}
              {saved ? (
                <p role="status" className="text-sm text-muted-foreground">
                  Draft saved.
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : 'Save draft'}
                </Button>
                {doc ? (
                  <>
                    <ConfirmActionButton
                      label="Finalize"
                      title="Finalize this contract?"
                      description="The contract becomes immutable and takes its number. Corrections after this mean duplicating it as a new draft."
                      confirmLabel="Finalize"
                      onConfirm={onFinalize}
                      disabled={
                        isSubmitting || unfilled.length > 0 || contract.parts.length === 0
                      }
                    />
                    <ConfirmActionButton
                      label="Delete draft"
                      title="Delete this draft?"
                      description="This cannot be undone."
                      confirmLabel="Delete"
                      variant="destructive"
                      confirmVariant="destructive"
                      onConfirm={onDelete}
                      disabled={isSubmitting}
                    />
                  </>
                ) : null}
              </div>
            </>
          )}
        </FieldGroup>
      </form>

      {openService ? (
        <ServiceDialog
          key={openService.code}
          service={openService}
          part={contract.parts.find((p) => p.code === openService.code)}
          blanks={contract.blanks}
          exclusions={exclusions}
          clientInputs={clientInputs}
          onClose={() => setOpenCode(null)}
          onCommit={commitPart}
        />
      ) : null}
    </DocumentWorkspace>
  );
}
