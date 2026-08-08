'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { SCHEDULE_TABS } from '@/lib/domain/contract/schedules';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePicker } from '@/components/ui/date-picker';
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
  /** The live services library — the source ticking copies from. */
  services: ContractService[];
  exclusions: LibraryLine[];
  clientInputs: LibraryLine[];
  doc?: ContractDocument | null;
  /** Live studio details, for a draft's preview. See the note in DocumentEditor. */
  studio?: StudioInfo;
  /** Shown in the workspace bar; supplied by the route page. */
  title: string;
}

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

  const ticked = new Set(contract.parts.map((p) => p.code));
  const assembled = assemble(contract.parts);

  /**
   * Ticking copies the Service onto the draft, with the text of every library
   * line it names. From this moment the contract owns its words: editing the
   * library afterwards cannot change them, and — because blank keys are derived
   * from the text — cannot move this draft's fields either.
   */
  const addPart = (service: ContractService) => {
    const library = { ...contract.library };
    for (const line of [...exclusions, ...clientInputs]) {
      if (service.exclusionIds.includes(line.id) || service.clientInputIds.includes(line.id)) {
        library[line.id] = line.text;
      }
    }
    setContract((prev) => ({ ...prev, parts: [...prev.parts, { ...service }], library }));
  };

  /**
   * Untickng drops the Part but leaves its blank values and library lines in
   * place. Re-ticking then restores what was typed, which is what someone who
   * unticked by accident expects; the stale keys are inert and are dropped at
   * finalize, when only the resolved contract is materialised.
   */
  const removePart = (code: string) =>
    setContract((prev) => ({ ...prev, parts: prev.parts.filter((p) => p.code !== code) }));

  const patchPart = (code: string, patch: Partial<ContractService>) =>
    setContract((prev) => ({
      ...prev,
      parts: prev.parts.map((p) => (p.code === code ? { ...p, ...patch } : p)),
    }));

  const setBlank = (key: string, value: string) =>
    setContract((prev) => ({ ...prev, blanks: { ...prev.blanks, [key]: value } }));

  const scopes = useMemo(() => contractScopes(contract), [contract]);
  const unfilled = scopes.flatMap((scope) =>
    blanksOf(scope.parsed).filter((blank) => isUnfilled(contract.blanks, blank)),
  );

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

  const filtered = services.filter((s) =>
    `${s.code} ${s.name}`.toLowerCase().includes(serviceQuery.trim().toLowerCase()),
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

  return (
    <DocumentWorkspace
      title={heading}
      coverFirst
      firstPageClassName={COVER_CLASSNAME}
      preview={contractBlocks(previewDoc)}
    >
      <form onSubmit={onSaveDraft} className="flex flex-col gap-4" noValidate>
        <FieldGroup size="form">
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

          {/*
            One tab per Schedule, so the list is a dozen-odd choices rather than
            twenty-two. The Schedule is still not a decision to make
            (contract-system.md §10) — it is where a service already lives, and
            the tabs say so. Search cuts across all four; the count on each tab
            is how many of that Schedule's services are ticked.
          */}
          <EditorSection
            title="Services"
            description={`${contract.parts.length} of ${services.length} included`}
            defaultOpen
          >
            <Field>
              <FieldLabel htmlFor="con-service-search">Search services</FieldLabel>
              <Input
                id="con-service-search"
                size="form"
                value={serviceQuery}
                onChange={(e) => setServiceQuery(e.target.value)}
                placeholder="Shopify, brand, maintenance…"
              />
            </Field>

            <Tabs defaultValue={SCHEDULE_TABS[0].key}>
              <TabsList className="w-full">
                {SCHEDULE_TABS.map((schedule) => {
                  const count = contract.parts.filter(
                    (p) => p.scheduleKey === schedule.key,
                  ).length;
                  return (
                    <TabsTrigger key={schedule.key} value={schedule.key}>
                      {schedule.name}
                      {count > 0 ? (
                        <span className="text-muted-foreground tabular-nums">{count}</span>
                      ) : null}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {SCHEDULE_TABS.map((schedule) => {
                const mine = filtered.filter((s) => s.scheduleKey === schedule.key);
                return (
                  <TabsContent key={schedule.key} value={schedule.key}>
                    <ul className="flex flex-col gap-1">
                      {mine.map((service) => (
                        <li key={service.code}>
                          <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50">
                            <Checkbox
                              className="mt-0.5"
                              checked={ticked.has(service.code)}
                              onCheckedChange={(checked) =>
                                checked ? addPart(service) : removePart(service.code)
                              }
                            />
                            <span className="min-w-0 flex-1 text-sm">
                              <span className="text-muted-foreground tabular-nums">
                                {service.code}
                              </span>{' '}
                              {service.name}
                            </span>
                          </label>
                        </li>
                      ))}
                      {mine.length === 0 ? (
                        <li className="px-2 py-1.5 text-sm text-muted-foreground">
                          No matching services.
                        </li>
                      ) : null}
                    </ul>
                  </TabsContent>
                );
              })}
            </Tabs>
          </EditorSection>

          {/*
            One section per Part, in the order the contract renders them. Each
            holds only that Part's own fields — its blanks, its exclusions, its
            client inputs — because that is the unit someone actually reasons
            about when quoting a job.
          */}
          {assembled.flatMap(({ letter, schedule, parts }) =>
            parts.map(({ part, label }) => {
              const partScopes = scopes.filter((s) => s.scope.startsWith(`part.${part.code}.`));
              return (
                <EditorSection
                  key={part.code}
                  title={`Part ${label} — ${part.name}`}
                  description={`Schedule ${letter} · ${schedule.name}`}
                >
                  {partScopes.map((scope) => (
                    <div key={scope.scope} className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground">{scope.label}</p>
                      {scope.parsed.flatMap((parsed, i) =>
                        parsed.blanks.map((blank, j) => (
                          <Field key={blank.key}>
                            <FieldLabel htmlFor={blank.key}>
                              {scope.rowLabels?.[i] ??
                                `${scope.label}${parsed.blanks.length > 1 ? ` (${j + 1})` : ''}`}
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

                  {/*
                    Pre-ticked as excluded, and you untick to bring something
                    into scope (contract-system.md §6). That inversion is the
                    point: forgetting to exclude something no longer means
                    owing it. Untick, then price it into the Part.
                  */}
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Excluded from this Part
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Untick to bring into scope — then price it in.
                    </p>
                    {exclusions
                      .filter(
                        (line) =>
                          part.exclusionIds.includes(line.id) ||
                          contract.library[line.id] !== undefined,
                      )
                      .map((line) => (
                        <label
                          key={line.id}
                          className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-xs hover:bg-accent/50"
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={part.exclusionIds.includes(line.id)}
                            onCheckedChange={(checked) =>
                              patchPart(part.code, {
                                exclusionIds: checked
                                  ? [...part.exclusionIds, line.id].sort()
                                  : part.exclusionIds.filter((id) => id !== line.id),
                              })
                            }
                          />
                          <span className="min-w-0 flex-1">{line.text}</span>
                        </label>
                      ))}
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      What the Client provides
                    </p>
                    {clientInputs
                      .filter(
                        (line) =>
                          part.clientInputIds.includes(line.id) ||
                          contract.library[line.id] !== undefined,
                      )
                      .map((line) => (
                        <label
                          key={line.id}
                          className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-xs hover:bg-accent/50"
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={part.clientInputIds.includes(line.id)}
                            onCheckedChange={(checked) =>
                              patchPart(part.code, {
                                clientInputIds: checked
                                  ? [...part.clientInputIds, line.id].sort()
                                  : part.clientInputIds.filter((id) => id !== line.id),
                              })
                            }
                          />
                          <span className="min-w-0 flex-1">{line.text}</span>
                        </label>
                      ))}
                  </div>
                </EditorSection>
              );
            }),
          )}

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
            description="The Master Service Agreement — 28 clauses"
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
                They show in the preview. The contract cannot be issued until every one is filled.
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
                  disabled={isSubmitting || unfilled.length > 0 || contract.parts.length === 0}
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
            {contract.parts.length > 0 ? (
              <Badge variant="outline">
                {assembled.length} schedule{assembled.length === 1 ? '' : 's'} ·{' '}
                {contract.parts.length} part{contract.parts.length === 1 ? '' : 's'}
              </Badge>
            ) : null}
          </div>
        </FieldGroup>
      </form>
    </DocumentWorkspace>
  );
}
