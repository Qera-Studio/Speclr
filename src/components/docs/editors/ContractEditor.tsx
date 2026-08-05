'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createDraft,
  deleteDraftAction,
  finalizeDocument,
  updateDraft,
} from '@/server/actions/documents';
import { todayISO } from '@/lib/domain/dates';
import { DOC_TYPES } from '@/lib/domain/registry';
import { serviceToSchedule, type ServiceTemplate } from '@/lib/domain/serviceTemplate';
import type { StudioInfo } from '@/lib/domain/studio';
import {
  clientSnapshotOf,
  type ClientRecord,
  type ClientSnapshot,
  type ContractDocument,
  type ContractSchedule,
} from '@/lib/domain/types';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { contractBlocks, COVER_CLASSNAME } from '@/components/docs/sheets/ContractSheet';
import DocumentWorkspace from '@/components/docs/DocumentWorkspace';
import ScheduleCard from './ScheduleCard';
import EditorSection from './EditorSection';
import { ClauseFields, ContentText, shown, type ContentPatch } from './ContentFields';
import { contentOf, type DocContent } from '@/lib/domain/docContent';
import { workspaceTitle } from '../workspaceTitle';

const EMPTY_SNAPSHOT: ClientSnapshot = { name: '', address: '', email: '', phone: '' };


interface ContractEditorProps {
  clients: ClientRecord[];
  services: ServiceTemplate[];
  doc?: ContractDocument | null;
  /** Live studio details, for a draft's preview. See the note in DocumentEditor. */
  studio?: StudioInfo;
  /** Shown in the workspace bar; supplied by the route page. */
  title: string;
}

export default function ContractEditor({
  clients,
  services,
  doc,
  studio,
  title,
}: ContractEditorProps) {
  const router = useRouter();
  const [clientId, setClientId] = useState(doc?.clientId ?? '');
  const [issueDate, setIssueDate] = useState(doc?.issueDate ?? todayISO());
  const [schedules, setSchedules] = useState<ContractSchedule[]>(doc?.schedules ?? []);
  /** Text overrides — see the note in `DocumentEditor`. */
  const [content, setContent] = useState<DocContent>(doc?.content ?? {});
  const patchContent: ContentPatch = (patch) => setContent((prev) => ({ ...prev, ...patch }));
  const [selectedServiceId, setSelectedServiceId] = useState('');
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
    schedules,
    content,
    createdAt: doc?.createdAt ?? 0,
    updatedAt: 0,
  };

  const addSchedule = () => {
    const service = services.find((s) => s.id === selectedServiceId);
    if (!service) return;
    setSchedules((prev) => [...prev, serviceToSchedule(service)]);
    setSelectedServiceId('');
  };

  const buildPayload = () => ({ issueDate, schedules, content });

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

        <EditorSection title="Schedules" description="The services this agreement covers" defaultOpen>
        <div className="flex flex-wrap items-end gap-2">
          <Field className="flex-1">
            <FieldLabel htmlFor="con-add-service">Add schedule from service</FieldLabel>
            <Combobox
              id="con-add-service"
              size="form"
              options={services.map((service) => ({ value: service.id, label: service.name }))}
              value={selectedServiceId}
              onValueChange={setSelectedServiceId}
              placeholder="Select a service…"
              emptyMessage="No matching services."
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            size="form"
            onClick={addSchedule}
            disabled={!selectedServiceId}
          >
            Add schedule
          </Button>
        </div>

        {schedules.map((schedule, i) => (
          <ScheduleCard
            key={i}
            schedule={schedule}
            index={i}
            onChange={(next) => setSchedules((prev) => prev.map((s, j) => (j === i ? next : s)))}
            onRemove={() => setSchedules((prev) => prev.filter((_, j) => j !== i))}
          />
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
          description="The Master Service Agreement — 24 sections"
        >
          <ClauseFields
            clauses={shown(content, resolved, 'clauses')}
            onChange={(clauses) => patchContent({ clauses })}
          />
        </EditorSection>

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

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save draft'}
          </Button>
          {doc ? (
            <>
              <ConfirmActionButton
                label="Finalize"
                title="Finalize this contract?"
                description="The contract becomes immutable. Corrections after this mean duplicating it as a new draft."
                confirmLabel="Finalize"
                onConfirm={onFinalize}
                disabled={isSubmitting}
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
        </FieldGroup>
      </form>
    </DocumentWorkspace>
  );
}
