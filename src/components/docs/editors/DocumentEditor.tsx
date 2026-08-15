'use client';

import { useEffect, useRef, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { deleteDraftAction, finalizeDocument } from '@/server/actions/documents';
import { computeTotals } from '@/lib/domain/money';
import { contentOf, type DocContent } from '@/lib/domain/docContent';
import { DOC_TYPES } from '@/lib/domain/registry';
import { GST_PLACES, gstStateName } from '@/lib/domain/gstStates';
import { placeOfSupplyOf, zeroRatingLabel } from '@/lib/domain/placeOfSupply';
import { addDays } from '@/lib/domain/dates';
import {
  clientSnapshotOf,
  type ClientRecord,
  type ClientSnapshot,
  type InvoiceDocument,
  type ReceiptDocument,
} from '@/lib/domain/types';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Combobox } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import FieldInfo, { InfoTip } from '@/components/form/FieldInfo';
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
import { Spinner } from '@/components/ui/spinner';
import { usePulse } from '@/lib/useMinimumDuration';
import EditorSection from './EditorSection';
import { ContentText, TermsFields, shown, type ContentPatch } from './ContentFields';
import InvoicePicker from './InvoicePicker';
import TotalsPanel from './TotalsPanel';
import { paiseToRupees } from '@/lib/domain/money';
import type { InvoiceOption, PaymentMethod } from '@/lib/domain/types';
import type { StudioInfo } from '@/lib/domain/studio';
import { toPayload, useDocumentForm, type EditorFormValues } from './useDocumentForm';
import { useDraftAutosave } from './useDraftAutosave';
import { AutosaveStatus, UnsavedChangesDialog } from './draftStatus';
import { workspaceTitle } from '../workspaceTitle';
import { numericField } from '@/components/form/inputFilters';
import { useProfile } from '@/lib/useProfile';

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
  content?: DocContent,
): FinancialDocument {
  const client = clients.find((c) => c.id === values.clientId);
  const fields = toPayload(typeCode, values, content);
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
    content: fields.content,
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
  const profile = useProfile();
  const spec = DOC_TYPES[typeCode];
  const { form, lineItems } = useDocumentForm(typeCode, doc);
  const { register, getValues, setValue, control } = form;
  /**
   * Text overrides. Deliberately outside react-hook-form: this is prose with
   * no validation to run, and keeping it out means the form's dirty/valid
   * state still tracks the fields that decide whether a document can be
   * finalized. Only what has been edited is stored — every input shows
   * `content[key] ?? resolved[key]`.
   */
  // Picking an invoice replaces the line items and the whole GST block. The
  // pulse says which action did that.
  const [seeding, pulseSeeding] = usePulse();
  const [content, setContent] = useState<DocContent>(doc?.content ?? {});
  const patchContent: ContentPatch = (patch) => setContent((prev) => ({ ...prev, ...patch }));

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  /**
   * Place of supply, derived from the client rather than typed.
   *
   * This is `PRINCIPLES.md` rule 3's live violation closed: the code was a
   * picker the operator filled from memory when the answer was on the client
   * record all along — their GSTIN begins with their state code. Two sources of
   * truth for one fact is what produced a wrong invoice, and a constrained
   * picker only made the wrong answer look validated.
   */
  const selectedClient = clients.find((c) => c.id === values.clientId);
  const derivedPlaceOfSupply = placeOfSupplyOf(selectedClient ?? {});

  /**
   * Whether the operator has taken the wheel. Derived from the document, not
   * stored twice: a saved reason means someone overrode it, and a code that
   * disagrees with the derivation means the same. A separate boolean could
   * disagree with both.
   */
  const [placeOfSupplyOverridden, setPlaceOfSupplyOverridden] = useState(
    Boolean(doc?.placeOfSupplyOverrideReason),
  );

  /**
   * Keep the stored code equal to the derived one while it is not overridden.
   *
   * The field is read-only in that state, so nothing else writes it — and a
   * document must carry the code, not recompute it at print time: the client's
   * GSTIN can be corrected next year and an issued invoice may not move.
   */
  /**
   * Picking a client seeds what the client record already knows: the due date
   * from their payment terms, and — for an SEZ unit or an overseas recipient —
   * a zero rate with the legal reason it is zero.
   *
   * Seeds, not locks. Everything stays editable, and nothing is touched on a
   * finalized document or once the operator has typed something of their own.
   * Both are zero-rated supplies under IGST Act s.16 made under an LUT, which
   * is a different statement from "no GST" and is what `gstLabel` prints.
   */
  const seededClientId = useRef<string | null>(doc ? (doc.clientId ?? null) : null);
  useEffect(() => {
    if (!selectedClient || seededClientId.current === selectedClient.id) return;
    seededClientId.current = selectedClient.id;

    const terms = selectedClient.commercial?.paymentTermsDays;
    if (spec.hasDueDate && terms !== undefined && !values.dueDate) {
      setValue('dueDate', addDays(values.issueDate, terms), { shouldDirty: true });
    }

    const zeroRated = zeroRatingLabel({
      addressParts: selectedClient.addressParts,
      sez: selectedClient.tax?.sez,
    });
    if (zeroRated) {
      setGstAppliesState(false);
      setValue('gstRatePercent', '0', { shouldDirty: true });
      setValue('gstLabel', zeroRated, { shouldDirty: true });
    }
  }, [selectedClient, setValue, spec.hasDueDate, values.dueDate, values.issueDate]);

  useEffect(() => {
    if (placeOfSupplyOverridden || !gstApplies) return;
    const next = derivedPlaceOfSupply.code ?? '';
    if (values.placeOfSupplyStateCode !== next) {
      setValue('placeOfSupplyStateCode', next, { shouldDirty: true });
    }
    if (values.placeOfSupplyOverrideReason) {
      setValue('placeOfSupplyOverrideReason', '', { shouldDirty: true });
    }
  }, [
    derivedPlaceOfSupply.code,
    gstApplies,
    placeOfSupplyOverridden,
    setValue,
    values.placeOfSupplyOverrideReason,
    values.placeOfSupplyStateCode,
  ]);

  const previewDoc = buildPreviewDoc(typeCode, values, clients, doc, studio, content);
  // What the sheet will print — the source for every content input's value.
  const resolved = contentOf(previewDoc, spec);
  const totals = computeTotals(previewDoc.lineItems, previewDoc.gstRatePercent);
  const heading = workspaceTitle(
    title,
    spec.label,
    clients.find((c) => c.id === values.clientId)?.name,
  );

  /**
   * The draft writes itself — there is no Save button. See `useDraftAutosave`
   * for why, and for the one thing it cannot do: nothing is written until a
   * client is picked, because `createDraft` refuses without one.
   */
  const autosave = useDraftAutosave({
    typeCode,
    initialDocId: doc?.id,
    recipientId: values.clientId,
    payload: toPayload(typeCode, values, content),
  });
  const { docId, serverError, setServerError } = autosave;

  const onFinalize = async () => {
    if (!docId) return;
    setServerError(null);
    setIsSubmitting(true);
    // Frozen first, then flushed: no timer may fire at a document that is about
    // to stop being a draft. The flush goes behind whatever autosave already has
    // in flight, so the document frozen is the one on screen.
    autosave.freeze();
    try {
      if (!(await autosave.flush())) {
        autosave.thaw();
        return;
      }
      const result = await finalizeDocument(docId);
      if (!result.success) {
        // Usually a missing place of supply — recoverable, and fixed right
        // here. Autosaving has to come back or the fix is never written down.
        setServerError(result.error ?? 'Something went wrong.');
        autosave.thaw();
        return;
      }
      router.push(`/${profile}/docs/${docId}/print`);
    } finally {
      setIsSubmitting(false);
    }
  };

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

    pulseSeeding();
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
    if (!docId) return;
    setServerError(null);
    // As in `onFinalize`: stop autosaving before the row goes, or a timer
    // recreates what was just deleted.
    autosave.freeze();
    const result = await deleteDraftAction(docId);
    if (!result.success) {
      setServerError(result.error ?? 'Something went wrong.');
      autosave.thaw();
      return;
    }
    router.push('/');
  };

  return (
    <DocumentWorkspace title={heading} preview={<DocumentSheet doc={previewDoc} />}>
      {/* Not a submitting form any more — the draft writes itself. `onSubmit`
          is swallowed so a stray Enter in a text field cannot reload the page. */}
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4" noValidate>
        <FieldGroup size="form">
          <EditorSection title="Client & dates" description="Who it is for, and when" defaultOpen>
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
                <FieldLabel htmlFor="doc-due-date">Due date</FieldLabel>
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
          </EditorSection>

          <LineItemsEditor control={control} register={register} fieldArray={lineItems} />

          <EditorSection title="Tax" description="GST rate and place of supply" defaultOpen>
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
                                    {...numericField(register('gstRatePercent'))}
                />
              </Field>
              <Field>
                <FieldInfo
                  htmlFor="doc-place-of-supply"
                  label="Place of supply"
                  /* The general rule, then where *this* document's answer came
                     from — the reason used to sit under the field as standing
                     text, but it explains the value rather than announcing
                     anything, so it belongs with the explanation. */
                  info={`Derived from the client — their GSTIN's first two digits, or the state on their address. It decides the CGST/SGST versus IGST split, so it is not typed by hand any more. Override it only where the law puts the supply somewhere else, and say why.${
                    derivedPlaceOfSupply.reason ? ` — ${derivedPlaceOfSupply.reason}` : ''
                  }`}
                  infoLabel="Where does place of supply come from?"
                />
                {placeOfSupplyOverridden ? (
                  <Controller
                    control={control}
                    name="placeOfSupplyStateCode"
                    render={({ field }) => (
                      <Combobox
                        id="doc-place-of-supply"
                        size="form"
                        options={GST_PLACES.map((state) => ({
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
                ) : (
                  <Input
                    id="doc-place-of-supply"
                    size="form"
                    readOnly
                    value={
                      derivedPlaceOfSupply.code
                        ? `${derivedPlaceOfSupply.code} — ${gstStateName(derivedPlaceOfSupply.code) ?? ''}`
                        : ''
                    }
                    placeholder="Pick a client first"
                  />
                )}
              </Field>
            </FieldRow>
          ) : null}

          {gstApplies ? (
            <>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="doc-pos-override">Override place of supply</FieldLabel>
                <Switch
                  id="doc-pos-override"
                  checked={placeOfSupplyOverridden}
                  onCheckedChange={setPlaceOfSupplyOverridden}
                />
              </Field>

              {placeOfSupplyOverridden ? (
                <Field>
                  {/*
                    `PRINCIPLES.md` rule 3 permits this override on one
                    condition: that it is recorded. An override leaving no trace
                    of why is the same bug wearing a different hat, so finalize
                    refuses one without a reason.
                  */}
                  <FieldInfo
                    htmlFor="doc-pos-reason"
                    label="Why"
                    info="Recorded on the document and frozen with it. Finalizing is refused without it — an override that leaves no trace of why is the same mistake as typing the wrong state."
                    infoLabel="Why is a reason required?"
                  />
                  <Input
                    id="doc-pos-reason"
                    size="form"
                    placeholder="e.g. services relate to immovable property in Karnataka (CGST s.12(3))"
                    {...register('placeOfSupplyOverrideReason')}
                  />
                </Field>
              ) : null}
            </>
          ) : (
            <Field>
              <FieldLabel htmlFor="doc-gst-label">GST note</FieldLabel>
              <Input id="doc-gst-label" size="form" {...register('gstLabel')} />
            </Field>
          )}
          </EditorSection>

          {spec.hasPayment ? (
            <EditorSection title="Payment" description="What was received, and against what" defaultOpen>

              <Field>
                <div className="flex items-center gap-1.5">
                  <FieldLabel htmlFor="doc-against-invoice-picker">
                    Against invoice {seeding ? <Spinner className="size-3.5" /> : null}
                  </FieldLabel>
                  <InfoTip
                    info="Fills in the line items and GST from that invoice. You can still edit them."
                    label="What does picking an invoice do?"
                  />
                </div>
                <InvoicePicker
                  id="doc-against-invoice-picker"
                  clientId={values.clientId}
                  value={values.againstInvoiceId}
                  onSelect={applyInvoice}
                />
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
                <FieldLabel htmlFor="doc-payment-ref">Reference</FieldLabel>
                <Input id="doc-payment-ref" size="form" {...register('paymentReference')} />
              </Field>
            </EditorSection>
          ) : null}

          <EditorSection title="Terms" description="The clauses printed at the foot">
            <TermsFields terms={shown(content, resolved, 'terms')} onChange={(terms) => patchContent({ terms })} />
          </EditorSection>

          <EditorSection title="Heading" description="The printed title">
            <ContentText
              id="doc-masthead"
              label="Masthead"
              value={shown(content, resolved, 'masthead')}
              onChange={(masthead) => patchContent({ masthead })}
            />
          </EditorSection>

          {/* No notes field: notes were retired from the sheet, and an input for
              something the document never prints is a trap. */}
          <EditorSection title="Footer" description="QR caption and the closing line">
            <ContentText
              id="doc-qr-caption"
              label="QR caption"
              value={shown(content, resolved, 'qrCaption')}
              onChange={(qrCaption) => patchContent({ qrCaption })}
            />
            <ContentText
              id="doc-thanks"
              label="Closing line"
              value={shown(content, resolved, 'thanksLine')}
              onChange={(thanksLine) => patchContent({ thanksLine })}
            />
          </EditorSection>

        </FieldGroup>

        <TotalsPanel totals={totals} gstRatePercent={previewDoc.gstRatePercent} />

        {serverError ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}
        <AutosaveStatus autosave={autosave} />

        <div className="flex flex-wrap gap-2">
          {/* Finalize and Delete need a row to act on, which exists from the
              first autosave — not from the route. */}
          {docId ? (
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

      <UnsavedChangesDialog autosave={autosave} label={spec.label.toLowerCase()} />
    </DocumentWorkspace>
  );
}
