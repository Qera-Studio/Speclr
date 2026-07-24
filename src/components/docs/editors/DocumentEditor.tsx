'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createDraft,
  deleteDraftAction,
  finalizeDocument,
  updateDraft,
} from '@/server/actions/documents';
import { computeTotals } from '@/lib/domain/money';
import { DOC_TYPES } from '@/lib/domain/registry';
import { GST_STATES } from '@/lib/domain/gstStates';
import type {
  ClientRecord,
  ClientSnapshot,
  InvoiceDocument,
  ReceiptDocument,
} from '@/lib/domain/types';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DocumentSheet from '@/components/docs/sheets/DocumentSheet';
import SheetPreview from '@/components/docs/SheetPreview';
import LineItemsEditor from './LineItemsEditor';
import TotalsPanel from './TotalsPanel';
import { toPayload, useDocumentForm, type EditorFormValues } from './useDocumentForm';

/** DocumentEditor only handles financial docs; contracts use ContractEditor. */
type FinancialDocument = InvoiceDocument | ReceiptDocument;
type FinancialTypeCode = FinancialDocument['type'];

const EMPTY_SNAPSHOT: ClientSnapshot = { name: '', address: '', email: '', phone: '' };

function buildPreviewDoc(
  typeCode: FinancialTypeCode,
  values: EditorFormValues,
  clients: ClientRecord[],
  doc?: FinancialDocument | null,
): FinancialDocument {
  const client = clients.find((c) => c.id === values.clientId);
  const fields = toPayload(typeCode, values);
  const snapshot: ClientSnapshot = client
    ? {
        name: client.name,
        address: client.address,
        email: client.email,
        phone: client.phone,
        gstin: client.gstin,
      }
    : (doc?.clientSnapshot ?? EMPTY_SNAPSHOT);

  const base = {
    id: doc?.id ?? 'preview',
    status: doc?.status ?? ('draft' as const),
    number: doc?.number,
    serial: doc?.serial,
    year: doc?.year,
    clientId: values.clientId,
    clientSnapshot: snapshot,
    issueDate: fields.issueDate,
    lineItems: fields.lineItems,
    gstRatePercent: fields.gstRatePercent,
    gstLabel: fields.gstLabel,
    placeOfSupplyStateCode: fields.placeOfSupplyStateCode,
    notes: fields.notes,
    createdAt: doc?.createdAt ?? 0,
    updatedAt: 0,
  };

  if (typeCode === 'INV') {
    return { ...base, type: 'INV', dueDate: fields.dueDate };
  }
  return {
    ...base,
    type: 'REC',
    payment: fields.payment ?? { date: '', method: 'Bank Transfer' },
  };
}

interface DocumentEditorProps {
  typeCode: FinancialTypeCode;
  clients: ClientRecord[];
  doc?: FinancialDocument | null;
}

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30';

export default function DocumentEditor({ typeCode, clients, doc }: DocumentEditorProps) {
  const router = useRouter();
  const spec = DOC_TYPES[typeCode];
  const { form, lineItems } = useDocumentForm(typeCode, doc);
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = form;
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const values = watch();
  const previewDoc = buildPreviewDoc(typeCode, values, clients, doc);
  const totals = computeTotals(previewDoc.lineItems, previewDoc.gstRatePercent);

  const onSaveDraft = handleSubmit(async (formValues) => {
    setServerError(null);
    setSaved(false);
    const payload = toPayload(typeCode, formValues);
    const result = doc
      ? await updateDraft(doc.id, formValues.clientId, payload)
      : await createDraft(typeCode, formValues.clientId, payload);

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
  });

  const onFinalize = handleSubmit(async (formValues) => {
    if (!doc) return;
    if (!window.confirm('Finalize this document? A number will be assigned and it becomes immutable.')) {
      return;
    }
    setServerError(null);
    // Persist any unsaved edits first, then finalize the stored draft.
    const saveResult = await updateDraft(doc.id, formValues.clientId, toPayload(typeCode, formValues));
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
  });

  const onDelete = async () => {
    if (!doc) return;
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;
    setServerError(null);
    const result = await deleteDraftAction(doc.id);
    if (!result.success) {
      setServerError(result.error ?? 'Something went wrong.');
      return;
    }
    router.push('/');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={onSaveDraft} className="flex flex-col gap-4" noValidate>
        <Field>
          <FieldLabel htmlFor="doc-client">Client</FieldLabel>
          <select id="doc-client" className={selectClass} {...register('clientId')}>
            <option value="">Select a client…</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex flex-wrap gap-4">
          <Field className="flex-1">
            <FieldLabel htmlFor="doc-issue-date">Issue date</FieldLabel>
            <Input id="doc-issue-date" type="date" {...register('issueDate')} />
          </Field>
          {spec.hasDueDate ? (
            <Field className="flex-1">
              <FieldLabel htmlFor="doc-due-date">Due date (optional)</FieldLabel>
              <Input id="doc-due-date" type="date" {...register('dueDate')} />
            </Field>
          ) : null}
        </div>

        <LineItemsEditor register={register} fieldArray={lineItems} />

        <div className="flex flex-wrap gap-4">
          <Field className="flex-1">
            <FieldLabel htmlFor="doc-gst-rate">GST rate (%)</FieldLabel>
            <Input id="doc-gst-rate" inputMode="numeric" {...register('gstRatePercent')} />
          </Field>
          <Field className="flex-1">
            <FieldLabel htmlFor="doc-place-of-supply">Place of supply (required when GST applies)</FieldLabel>
            <select id="doc-place-of-supply" className={selectClass} {...register('placeOfSupplyStateCode')}>
              <option value="">Select a state…</option>
              {GST_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.code} — {state.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="doc-gst-label">GST note (shown when rate is 0)</FieldLabel>
          <Input id="doc-gst-label" {...register('gstLabel')} />
        </Field>

        {spec.hasPayment ? (
          <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-4">
            <legend className="px-1 text-sm font-medium">Payment</legend>
            <div className="flex flex-wrap gap-4">
              <Field className="flex-1">
                <FieldLabel htmlFor="doc-payment-date">Payment date</FieldLabel>
                <Input id="doc-payment-date" type="date" {...register('paymentDate')} />
              </Field>
              <Field className="flex-1">
                <FieldLabel htmlFor="doc-payment-method">Method</FieldLabel>
                <select id="doc-payment-method" className={selectClass} {...register('paymentMethod')}>
                  <option>Bank Transfer</option>
                  <option>UPI</option>
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Other</option>
                </select>
              </Field>
            </div>
            <div className="flex flex-wrap gap-4">
              <Field className="flex-1">
                <FieldLabel htmlFor="doc-payment-ref">Reference (optional)</FieldLabel>
                <Input id="doc-payment-ref" {...register('paymentReference')} />
              </Field>
              <Field className="flex-1">
                <FieldLabel htmlFor="doc-against-invoice">Against invoice # (optional)</FieldLabel>
                <Input id="doc-against-invoice" {...register('againstInvoiceNumber')} />
              </Field>
            </div>
          </fieldset>
        ) : null}

        <Field>
          <FieldLabel htmlFor="doc-notes">Notes (optional)</FieldLabel>
          <Textarea id="doc-notes" rows={2} {...register('notes')} />
        </Field>

        <TotalsPanel totals={totals} gstRatePercent={previewDoc.gstRatePercent} />

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
              <Button type="button" variant="outline" onClick={onFinalize} disabled={isSubmitting}>
                Finalize &amp; assign number
              </Button>
              <Button type="button" variant="destructive" onClick={onDelete} disabled={isSubmitting}>
                Delete draft
              </Button>
            </>
          ) : null}
        </div>
      </form>

      <section aria-label="Live preview">
        <SheetPreview>
          <DocumentSheet doc={previewDoc} />
        </SheetPreview>
      </section>
    </div>
  );
}
