'use client';

import { useState, useTransition } from 'react';
import { FileText, Info, Paperclip } from 'lucide-react';
import { CycleArrowIcon } from '@/components/ui/tray-arrow-icon';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Attachment,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Field, FieldLabel } from '@/components/ui/field';
import { RemoveButton } from '@/components/ui/remove-button';
import FieldInfo from '@/components/form/FieldInfo';
import UploadDropzone from '@/components/form/UploadDropzone';
import {
  ATTACHMENT_KINDS,
  ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  type ClientAttachment,
} from '@/lib/domain/client';
import { deleteClientAttachment, uploadClientAttachment } from '@/server/actions/attachments';
import type { ClientRecord } from '@/lib/domain/types';
import type { StepProps } from './stepKit';

const KIND_LABELS: Record<string, string> = {
  gst_certificate: 'GST registration certificate',
  pan: 'PAN card',
  incorporation: 'Certificate of incorporation',
  signed_contract: 'Signed contract or MSA',
  purchase_order: 'Purchase order',
  tax_form: 'W-8 / W-9 or foreign tax registration',
  firc: 'FIRC / FIRA — proof of export realisation',
  signature: 'Signature',
  other: 'Other',
};

/**
 * Attachments.
 *
 * Uploads go straight to the server action, which sniffs the real type from the
 * bytes, stores the blob **private**, and only then records it. Nothing here is
 * a security control — the accept attribute and the size hint are a courtesy to
 * whoever is uploading, and the action re-checks both, because a file picker is
 * not a trust boundary.
 *
 * This step saves on each upload rather than on a submit button: a file is
 * either stored or it is not, and a "save" that could leave a blob written but
 * unreferenced would be the worse of the two states.
 */
export default function AttachmentsStep({ client, onSaved, submitLabel }: StepProps) {
  const [kind, setKind] = useState<string>('gst_certificate');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const attachments = client?.attachments ?? [];

  const onFile = (file: File) => {
    if (!client) return;
    setError(null);

    const data = new FormData();
    data.set('file', file);
    data.set('kind', kind);

    startTransition(async () => {
      const result = await uploadClientAttachment(client.id, data);
      if (!result.success || !result.id) {
        setError(result.error ?? 'Something went wrong.');
        return;
      }
      // Mirrors what the action stored. The bytes are already written; this is
      // the record catching up so the list shows it without a round trip.
      const added: ClientAttachment = {
        id: result.id,
        kind: kind as ClientAttachment['kind'],
        filename: file.name,
        mime: file.type,
        size: file.size,
        key: `clients/${client.id}/${result.id}`,
        uploadedAt: Date.now(),
      };
      onSaved({ ...client, attachments: [...attachments, added] } as ClientRecord);
    });
  };

  const onRemove = (attachment: ClientAttachment) => {
    if (!client) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteClientAttachment(client.id, attachment.id);
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.');
        return;
      }
      onSaved({
        ...client,
        attachments: attachments.filter((a) => a.id !== attachment.id),
      } as ClientRecord);
    });
  };

  const maxMb = Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024);

  return (
    <div className="flex flex-col gap-4">
      {/*
        `variant="note"`, not the default. The default Alert is `bg-card` with a
        border — the same box an `Input` draws — so a paragraph of standing
        context read as a field somebody had forgotten to fill in.
      */}
      <Alert variant="note">
        <Info aria-hidden />
        <AlertDescription>
          These are the client’s own identity documents. They are stored
          privately, readable only while signed in, and deleting one deletes the
          file itself.
        </AlertDescription>
      </Alert>

      <Field>
        <FieldLabel htmlFor="attachment-kind">Document type</FieldLabel>
        <Combobox
          id="attachment-kind"
          size="form"
          options={ATTACHMENT_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))}
          value={kind}
          onValueChange={setKind}
          placeholder="Select a type…"
          emptyMessage="No matching types."
        />
      </Field>

      <Field>
        <FieldInfo
          htmlFor="attachment-file"
          label="File"
          info={`PDF, PNG or JPEG, up to ${maxMb} MB. The type is read from the file's own bytes rather than what the browser calls it, so renaming something does not get it past.`}
          infoLabel="What can be attached?"
        />
        {/* The shared drop zone, not a bare file input — see UploadDropzone. */}
        <UploadDropzone
          id="attachment-file"
          accept={ATTACHMENT_MIME_TYPES.join(',')}
          disabled={!client || pending}
          label={pending ? 'Uploading…' : `Upload ${KIND_LABELS[kind] ?? 'document'}`}
          hint={`PDF, PNG or JPEG · up to ${maxMb} MB`}
          onFileSelected={onFile}
        />
      </Field>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {attachments.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Paperclip className="h-4 w-4" aria-hidden />
          Nothing attached yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attachments.map((attachment) => (
            <li key={attachment.id}>
              {/* The house attachment card, rather than a hand-rolled row. */}
              <Attachment className="w-full">
                <AttachmentMedia>
                  <FileText aria-hidden />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>
                    <a
                      href={`/api/clients/${client?.id}/files/${attachment.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline-offset-2 hover:underline"
                    >
                      {attachment.filename}
                    </a>
                  </AttachmentTitle>
                  <AttachmentDescription>
                    {KIND_LABELS[attachment.kind] ?? attachment.kind} · {formatBytes(attachment.size)}
                  </AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions className="pr-1.5">
                  <RemoveButton
                    label={`Remove ${attachment.filename}`}
                    onConfirm={() => onRemove(attachment)}
                    disabled={pending}
                    confirmDescription="The file itself is deleted, not just the link to it."
                  />
                </AttachmentActions>
              </Attachment>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        size="lg"
        className="group/tray self-start hover:bg-primary"
        disabled={!client}
        onClick={() => client && onSaved(client)}
      >
        {submitLabel}
        <CycleArrowIcon />
      </Button>
    </div>
  );
}

/** Bytes as something a person reads. Attachments are KB-to-MB, so two units. */
function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
