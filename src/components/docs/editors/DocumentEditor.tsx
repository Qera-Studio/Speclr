'use client';

import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
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
import {
  clientSnapshotOf,
  type ClientRecord,
  type ClientSnapshot,
  type InvoiceDocument,
  type ReceiptDocument,
} from '@/lib/domain/types';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Combobox } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import FieldInfo from '@/components/form/FieldInfo';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DocumentSheet from '@/components/docs/sheets/DocumentSheet';
import DocumentWorkspace from '@/components/docs/DocumentWorkspace';
import LineItemsEditor from './LineItemsEditor';
import InvoicePicker from './InvoicePicker';
import TotalsPanel from './TotalsPanel';
import { paiseToRupees } from '@/lib/domain/money';
import type { InvoiceOption, PaymentMethod } from '@/lib/domain/types';
import type { StudioInfo } from '@/lib/domain/studio';
import { toPayload, useDocumentForm, type EditorFormValues } from './useDocumentForm';
import { workspaceTitle } from '../workspaceTitle';

/** DocumentEditor only handles financial docs; contracts use ContractEditor. */
type FinancialDocument = InvoiceDocument | ReceiptDocument;
type FinancialTypeCode = FinancialDocument['type'];

const EMPTY_SNAPSHOT: ClientSnapshot = { name: '', address: '', email: '', phone: '' };

function buildPreviewDoc(
  typeCode: FinancialTypeCode,
  values: EditorFormValues,
  clients: ClientRecord[],
  doc?: FinancialDocument | null,
  studio?: StudioInfo,
): FinancialDocument {
  const client = clients.find((c) => c.id === values.clientId);
  const fields = toPayload(typeCode, values);
  const snapshot: ClientSnapshot = client
    ? clientSnapshotOf(client)
    : (doc?.clientSnapshot ?? EMPTY_SNAPSHOT);

  const base = {
    id: doc?.id ?? 'preview',
    // A finalized document prints its own frozen studio details; a draft shows
    // whatever the settings say right now.
    studioSnapshot: doc?.studioSnapshot ?? studio,
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
  /**
   * The studio's live details, for the preview of a document that has no frozen
   * snapshot yet. Optional: when it's absent the sheets fall back to the
   * `STUDIO_INFO` constant, which is exactly what they printed before the
   * settings page existed.
   */
  studio?: StudioInfo;
  /** Shown in the workspace bar; supplied by the route page. */
  title: string;
}

const PAYMENT_METHODS: PaymentMethod[] = ['Bank Transfer', 'UPI', 'Cash', 'Card', 'Other'];

export default function DocumentEditor({
  typeCode,
  clients,
  doc,
  studio,
  title,
}: DocumentEditorProps) {
  const router = useRouter();
  const spec = DOC_TYPES[typeCode];
  const { form, lineItems } = useDocumentForm(typeCode, doc);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    control,
    formState: { isSubmitting },
  } = form;
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  /**
   * Which GST branch the editor is showing. Seeded from the document itself —
   * a stored rate above zero means GST applied — and defaulting to on for a
   * new one, since the studio is GST-registered.
   *
   * Not a stored field: the document already says whether GST applies, by
   * carrying a rate. A second flag could disagree with the rate, and then the
   * printed invoice and the record would be telling different stories.
   */
  const [gstApplies, setGstAppliesState] = useState(
    doc ? doc.gstRatePercent > 0 : true,
  );

  /**
   * Switching branch clears the one being hidden. This is the part that
   * matters: `computeTotals` reads `gstRatePercent`, so a hidden 18% would go
   * on charging tax on a document whose editor says GST does not apply — a
   * defect in an issued invoice, not a cosmetic one.
   */
  const setGstApplies = (next: boolean) => {
    setGstAppliesState(next);
    if (next) {
      setValue('gstLabel', '', { shouldDirty: true });
    } else {
      setValue('gstRatePercent', '0', { shouldDirty: true });
      setValue('placeOfSupplyStateCode', '', { shouldDirty: true });
    }
  };

  /**
   * Live form values, driving the preview and the totals as the user types.
   *
   * This MUST be `useWatch` — never the form's own `watch` method. The app
   * builds with `reactCompiler: true`, and that method is an ordinary function
   * call taking no arguments, so the compiler treats it as pure and caches its
   * first result for the life of the component: the preview then freezes on the
   * empty form and never updates again. `useWatch` is a hook, so it
   * re-subscribes and returns fresh values every render. Same reason the named
   * reads below go through `values.x` instead of a per-field call.
   *
   * The cast is sound: `useDocumentForm` seeds `defaultValues` for every field,
   * so nothing here is ever actually absent.
   */
  const values = useWatch({ control }) as EditorFormValues;
  const previewDoc = buildPreviewDoc(typeCode, values, clients, doc, studio);
  const totals = computeTotals(previewDoc.lineItems, previewDoc.gstRatePercent);
  const heading = workspaceTitle(
    title,
    spec.label,
    clients.find((c) => c.id === values.clientId)?.name,
  );

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

  /**
   * Copies an invoice's billing detail into this receipt.
   *
   * Everything stays editable afterwards — a receipt can settle part of an
   * invoice, so this is a starting point, not a lock. Both the id and the
   * printed number are set together; see `clearInvoiceLink` for why they must
   * never drift apart.
   */
  const applyInvoice = (invoice: InvoiceOption | null) => {
    if (!invoice) {
      setValue('againstInvoiceId', '', { shouldDirty: true });
      setValue('againstInvoiceNumber', '', { shouldDirty: true });
      return;
    }

    setValue('againstInvoiceId', invoice.id, { shouldDirty: true });
    setValue('againstInvoiceNumber', invoice.number, { shouldDirty: true });
    setValue('gstRatePercent', String(invoice.gstRatePercent), { shouldDirty: true });
    setValue('placeOfSupplyStateCode', invoice.placeOfSupplyStateCode ?? '', { shouldDirty: true });
    setValue('gstLabel', invoice.gstLabel ?? '', { shouldDirty: true });
    lineItems.replace(
      invoice.lineItems.map((item) => ({
        description: item.description,
        detail: item.detail ?? '',
        rate: item.ratePaise > 0 ? paiseToRupees(item.ratePaise) : '',
        qty: String(item.qty),
      })),
    );
  };

  /**
   * Hand-editing the invoice number drops the stored id.
   *
   * The id and the number must always point at the same invoice. If someone
   * retypes the number, we can no longer vouch for the id — and a receipt whose
   * stored link quietly disagrees with the number printed on it is worse than
   * one with no link at all.
   */
  const clearInvoiceLink = () => {
    if (getValues('againstInvoiceId')) {
      setValue('againstInvoiceId', '', { shouldDirty: true });
    }
  };

  const onDelete = async () => {
    if (!doc) return;
    setServerError(null);
    const result = await deleteDraftAction(doc.id);
    if (!result.success) {
      setServerError(result.error ?? 'Something went wrong.');
      return;
    }
    router.push('/');
  };

  return (
    <DocumentWorkspace title={heading} preview={<DocumentSheet doc={previewDoc} />}>
      <form onSubmit={onSaveDraft} className="flex flex-col gap-4" noValidate>
        <FieldGroup size="form">
          <Field>
            <FieldLabel htmlFor="doc-client">Client</FieldLabel>
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Combobox
                  id="doc-client"
                  size="form"
                  options={clients.map((client) => ({ value: client.id, label: client.name }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select a client…"
                  emptyMessage="No matching clients."
                />
              )}
            />
          </Field>

          <FieldRow>
            <Field>
              <FieldLabel htmlFor="doc-issue-date">Issue date</FieldLabel>
              <Controller
                control={control}
                name="issueDate"
                render={({ field }) => (
                  <DatePicker
                    id="doc-issue-date"
                    size="form"
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </Field>
            {spec.hasDueDate ? (
              <Field>
                <FieldLabel htmlFor="doc-due-date">Due date (optional)</FieldLabel>
                <Controller
                  control={control}
                  name="dueDate"
                  render={({ field }) => (
                    <DatePicker
                      id="doc-due-date"
                      size="form"
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="No due date"
                    />
                  )}
                />
              </Field>
            ) : null}
          </FieldRow>

          <LineItemsEditor register={register} fieldArray={lineItems} />

          {/*
            GST either applies or it doesn't — a rate, a place of supply and a
            "GST not applicable" note are never all true of the same document.
            Showing them together invited exactly that contradiction onto an
            issued invoice, so one switch picks the branch.
          */}
          <Field orientation="horizontal">
            <FieldLabel htmlFor="doc-gst-applies">GST applies</FieldLabel>
            <Switch id="doc-gst-applies" checked={gstApplies} onCheckedChange={setGstApplies} />
          </Field>

          {gstApplies ? (
            <FieldRow>
              <Field>
                <FieldLabel htmlFor="doc-gst-rate">GST rate (%)</FieldLabel>
                <Input
                  id="doc-gst-rate"
                  size="form"
                  inputMode="numeric"
                  {...register('gstRatePercent')}
                />
              </Field>
              <Field>
                <FieldInfo
                  htmlFor="doc-place-of-supply"
                  label="Place of supply"
                  info="Required when GST applies — it decides the CGST/SGST versus IGST split."
                  infoLabel="Why is place of supply required?"
                />
                <Controller
                  control={control}
                  name="placeOfSupplyStateCode"
                  render={({ field }) => (
                    <Combobox
                      id="doc-place-of-supply"
                      size="form"
                      options={GST_STATES.map((state) => ({
                        value: state.code,
                        label: `${state.code} — ${state.name}`,
                      }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select a state…"
                      emptyMessage="No matching states."
                    />
                  )}
                />
              </Field>
            </FieldRow>
          ) : (
            <Field>
              <FieldLabel htmlFor="doc-gst-label">GST note</FieldLabel>
              <Input id="doc-gst-label" size="form" {...register('gstLabel')} />
            </Field>
          )}

          {spec.hasPayment ? (
            <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-4">
              <legend className="px-1 text-sm font-medium">Payment</legend>

              <Field>
                <FieldLabel htmlFor="doc-against-invoice-picker">Against invoice</FieldLabel>
                <InvoicePicker
                  id="doc-against-invoice-picker"
                  clientId={values.clientId}
                  value={values.againstInvoiceId}
                  onSelect={applyInvoice}
                />
                <FieldDescription>
                  Fills in the line items and GST from that invoice. You can still edit them.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="doc-against-invoice">Invoice number</FieldLabel>
                <Input
                  id="doc-against-invoice"
                  size="form"
                  {...register('againstInvoiceNumber', { onChange: clearInvoiceLink })}
                />
              </Field>

              <FieldRow>
                <Field>
                  <FieldLabel htmlFor="doc-payment-date">Payment date</FieldLabel>
                  <Controller
                    control={control}
                    name="paymentDate"
                    render={({ field }) => (
                      <DatePicker
                        id="doc-payment-date"
                        size="form"
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="doc-payment-method">Method</FieldLabel>
                  <Controller
                    control={control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(v) => field.onChange(v as PaymentMethod)}
                      >
                        <SelectTrigger id="doc-payment-method" size="form" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent size="form">
                          {PAYMENT_METHODS.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </FieldRow>

              <Field>
                <FieldLabel htmlFor="doc-payment-ref">Reference (optional)</FieldLabel>
                <Input id="doc-payment-ref" size="form" {...register('paymentReference')} />
              </Field>
            </fieldset>
          ) : null}

        </FieldGroup>

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
              <ConfirmActionButton
                label="Finalize & assign number"
                title="Finalize this document?"
                description="A number will be assigned and the document becomes immutable. Corrections after this mean duplicating it as a new draft."
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
      </form>
    </DocumentWorkspace>
  );
}
