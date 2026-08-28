"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  deleteDraftAction,
  finalizeDocument,
} from "@/server/actions/documents";
import { computeQuotationTotals } from "@/lib/domain/quotationTotals";
import { DOC_TYPES, DELETE_DRAFT_CONSEQUENCE } from "@/lib/domain/registry";
import { todayISO } from "@/lib/domain/dates";
import { formatINR, paiseToRupees, rupeesToPaise } from "@/lib/domain/money";
import { clientContact } from "@/lib/domain/client";
import type { ClientRecord, QuotationDocument } from "@/lib/domain/types";
import type { StudioInfo } from "@/lib/domain/studio";
import { rateUnitOf, type ContractService } from "@/lib/domain/service";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RemoveButton } from "@/components/ui/remove-button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { numericField } from "@/components/form/inputFilters";
import DocumentWorkspace from "@/components/docs/DocumentWorkspace";
import {
  quotationBlocks,
  quotationPageProps,
} from "@/components/docs/sheets/QuotationSheet";
import LineItemsEditor from "./LineItemsEditor";
import WordingDrawer from "./WordingDrawer";
import { useDraftAutosave } from "./useDraftAutosave";
import { AutosaveStatus, SaveError, UnsavedChangesDialog } from "./draftStatus";
import { workspaceTitle } from "../workspaceTitle";
import { useProfile } from "@/lib/useProfile";

/** Printed under Kind Attention until the operator edits or clears it — an
 * override to empty is a deliberate override, per `contentOf`'s convention
 * elsewhere (`CONTEXT.md` §5b). */
const DEFAULT_OFFER_LINE =
  "We are pleased to submit our offer for the above mentioned project.";

interface QuotationLineItemFormValues {
  description: string;
  rate: string;
  qty: string;
  /** Never shown as an input (change 13) — kept only because `LineItemPreset`
   * is typed against the shared `LineItemFormValues`, which requires it. */
  sacCode: string;
  section: string;
  recurring: boolean;
}

interface MilestoneFormValues {
  label: string;
  percent: string;
}

interface QuotationFormValues {
  recipientName: string;
  attentionName: string;
  offerLine: string;
  subjectLine: string;
  issueDate: string;
  validUntil: string;
  gstCountry: "IN" | "INTL";
  lineItems: QuotationLineItemFormValues[];
  milestones: MilestoneFormValues[];
  termsNote: string;
}

const emptyLineItem = (): QuotationLineItemFormValues => ({
  description: "",
  rate: "",
  qty: "1",
  sacCode: "",
  section: "",
  recurring: false,
});

function defaultsFor(doc?: QuotationDocument | null): QuotationFormValues {
  if (doc) {
    return {
      recipientName: doc.recipientName ?? "",
      attentionName: doc.attentionName ?? "",
      offerLine: doc.offerLine ?? DEFAULT_OFFER_LINE,
      subjectLine: doc.subjectLine ?? "",
      issueDate: doc.issueDate,
      validUntil: doc.validUntil ?? "",
      gstCountry: doc.gstCountry,
      lineItems: doc.lineItems.map((item) => ({
        description: item.description,
        rate: item.ratePaise > 0 ? paiseToRupees(item.ratePaise) : "",
        qty: String(item.qty),
        sacCode: "",
        section: item.section ?? "",
        recurring: item.recurring ?? false,
      })),
      milestones: (doc.milestones ?? []).map((m) => ({
        label: m.label,
        percent: String(m.percent),
      })),
      termsNote: doc.termsNote ?? "",
    };
  }
  const fields = DOC_TYPES.QTN.defaultFields(todayISO());
  return {
    recipientName: "",
    attentionName: "",
    offerLine: DEFAULT_OFFER_LINE,
    subjectLine: "",
    issueDate: fields.issueDate,
    validUntil: "",
    gstCountry: "IN",
    lineItems: fields.lineItems.map(() => emptyLineItem()),
    milestones: [],
    termsNote: "",
  };
}

function toPayload(values: QuotationFormValues) {
  return {
    issueDate: values.issueDate,
    recipientName: values.recipientName || undefined,
    attentionName: values.attentionName || undefined,
    offerLine: values.offerLine || undefined,
    subjectLine: values.subjectLine || undefined,
    validUntil: values.validUntil || undefined,
    gstCountry: values.gstCountry,
    lineItems: values.lineItems.map((item) => ({
      description: item.description,
      ratePaise: rupeesToPaise(item.rate) ?? 0,
      qty: Number(item.qty) || 0,
      section: item.section || undefined,
      recurring: item.recurring || undefined,
    })),
    milestones: values.milestones.length
      ? values.milestones.map((m) => ({
          label: m.label,
          percent: Number(m.percent) || 0,
        }))
      : undefined,
    termsNote: values.termsNote || undefined,
  };
}

function buildPreviewDoc(
  values: QuotationFormValues,
  doc?: QuotationDocument | null,
  studio?: StudioInfo,
): QuotationDocument {
  const fields = toPayload(values);
  return {
    id: doc?.id ?? "preview",
    type: "QTN",
    status: doc?.status ?? "draft",
    number: doc?.number,
    serial: doc?.serial,
    year: doc?.year,
    studioSnapshot: doc?.studioSnapshot ?? studio,
    issueDate: fields.issueDate,
    lineItems: fields.lineItems,
    gstRatePercent: 0,
    recipientName: fields.recipientName,
    attentionName: fields.attentionName,
    offerLine: fields.offerLine,
    subjectLine: fields.subjectLine,
    validUntil: fields.validUntil,
    gstCountry: fields.gstCountry,
    milestones: fields.milestones,
    termsNote: fields.termsNote,
    createdAt: doc?.createdAt ?? Date.now(),
    updatedAt: doc?.updatedAt ?? Date.now(),
  };
}

/** India vs everywhere else, for the GST-country toggle's autofill guess. */
function countryOf(client: ClientRecord): "IN" | "INTL" {
  return (client.addressParts?.country ?? "IN") === "IN" ? "IN" : "INTL";
}

export default function QuotationEditor({
  clients,
  services,
  doc,
  studio,
  title,
}: {
  clients: ClientRecord[];
  /** The full catalogue — a quotation is pre-sale, so every service is on
   * offer, not just what a particular client already has engaged. */
  services: ContractService[];
  doc?: QuotationDocument | null;
  studio: StudioInfo;
  title: string;
}) {
  const router = useRouter();
  const profile = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Which client's details were last copied in — a one-time fill, never stored. */
  const [fillClientId, setFillClientId] = useState("");

  const { register, control, setValue, handleSubmit } =
    useForm<QuotationFormValues>({
      defaultValues: defaultsFor(doc),
      mode: "onTouched",
    });
  const lineItems = useFieldArray({ control, name: "lineItems" });
  const milestones = useFieldArray({ control, name: "milestones" });

  // MUST be useWatch, never `form.watch` — the React Compiler caches an
  // ordinary function call's first result for the component's life, which
  // would freeze this preview on the empty form forever.
  const values = useWatch({ control }) as QuotationFormValues;

  const payload = toPayload(values);
  const autosave = useDraftAutosave({
    typeCode: "QTN",
    initialDocId: doc?.id,
    recipientId: "",
    requiresRecipient: false,
    payload,
  });
  const docId = autosave.docId;

  const previewDoc = buildPreviewDoc(values, doc, studio);
  const totals = computeQuotationTotals(payload.lineItems, values.gstCountry);
  const milestoneTotal = values.milestones.reduce(
    (sum, m) => sum + (Number(m.percent) || 0),
    0,
  );

  const heading = workspaceTitle(title, "Quotation", values.recipientName);

  // The catalogue has no "Website(s)"/"Social Media" grouping of its own — that
  // is a per-quotation organization the operator types into `section` below,
  // not a catalogue attribute. The menu groups by schedule instead, matching
  // `DocumentEditor`'s "Retainer"/"Engaged" split.
  const linePresets = services
    .filter((s) => !s.archived)
    .map((service) => ({
      group: service.scheduleKey === "retainer" ? "Retainer" : "One-off",
      label: `${service.name} (${rateUnitOf(service.scheduleKey)})`,
      item: {
        description: service.name,
        rate: service.ratePaise ? paiseToRupees(service.ratePaise) : "",
        qty: "1",
        sacCode: "",
        section: "",
        recurring: service.scheduleKey === "retainer",
      } satisfies QuotationLineItemFormValues,
    }));

  const applyClient = (clientId: string) => {
    setFillClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    setValue("recipientName", client.companyName || client.name, {
      shouldDirty: true,
    });
    setValue("gstCountry", countryOf(client), { shouldDirty: true });
    const contactName = clientContact(client, "primary")?.name;
    if (contactName) {
      setValue("attentionName", contactName, { shouldDirty: true });
    }
  };

  const onFinalize = async () => {
    if (!docId) return;
    setIsSubmitting(true);
    autosave.freeze();
    try {
      if (!(await autosave.flush())) {
        autosave.thaw();
        return;
      }
      const result = await finalizeDocument(docId);
      if (!result.success) {
        autosave.setServerError(result.error ?? "Something went wrong.");
        autosave.thaw();
        return;
      }
      router.push(`/${profile}/docs/${docId}/print`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!docId) return;
    autosave.freeze();
    const result = await deleteDraftAction(docId);
    if (!result.success) {
      autosave.setServerError(result.error ?? "Something went wrong.");
      autosave.thaw();
      return;
    }
    router.push("/");
  };

  const railFooter = docId ? (
    <div className="flex items-center gap-2">
      <ConfirmActionButton
        label="Finalize & assign number"
        title="Finalize this quotation?"
        description="A number will be assigned and the document becomes immutable. Corrections after this mean duplicating it as a new draft."
        confirmLabel="Finalize"
        onConfirm={onFinalize}
        disabled={isSubmitting}
        variant="default"
        className="h-9 flex-1"
      />
      <ConfirmActionButton
        label="Delete draft"
        icon={<Trash2 />}
        size="icon"
        title="Delete this draft?"
        description={DELETE_DRAFT_CONSEQUENCE}
        confirmLabel="Delete"
        variant="destructive"
        confirmVariant="destructive"
        onConfirm={onDelete}
        disabled={isSubmitting}
        className="size-9"
      />
    </div>
  ) : null;

  return (
    <DocumentWorkspace
      title={heading}
      status={<AutosaveStatus autosave={autosave} recipient={null} />}
      railFooter={railFooter}
      preview={quotationBlocks(previewDoc)}
      {...quotationPageProps(previewDoc)}
    >
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
        <UnsavedChangesDialog autosave={autosave} label="quotation" />
        <SaveError autosave={autosave} />

        <FieldGroup size="form" className="gap-4">
          <div className="flex flex-col gap-4 rounded-lg border border-border p-3">
            <Field>
              <FieldLabel htmlFor="qtn-fill-client">
                Fill from an existing client (optional)
              </FieldLabel>
              <Combobox
                id="qtn-fill-client"
                value={fillClientId}
                onValueChange={applyClient}
                options={clients.map((c) => ({
                  value: c.id,
                  label: c.companyName || c.name,
                }))}
                placeholder="Copy a client's name in…"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="qtn-recipient">Prepared for</FieldLabel>
              <Input
                id="qtn-recipient"
                size="form"
                placeholder="Prospect or company name"
                {...register("recipientName")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="qtn-attention">Kind Attention</FieldLabel>
              <Input id="qtn-attention" size="form" {...register("attentionName")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="qtn-offer-line">
                Addressed to Kind Attention
              </FieldLabel>
              <Textarea id="qtn-offer-line" rows={2} {...register("offerLine")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="qtn-subject">Subject line</FieldLabel>
              <Textarea
                id="qtn-subject"
                rows={2}
                {...register("subjectLine")}
              />
            </Field>
          </div>

          {/* Dates — a plain divided block, no collapsible, no title (change 11). */}
          <div className="flex flex-col gap-3 border-t border-b border-border py-4">
            <Field>
              <FieldLabel htmlFor="qtn-issue-date">Issue date</FieldLabel>
              <Controller
                control={control}
                name="issueDate"
                render={({ field }) => (
                  <DatePicker
                    id="qtn-issue-date"
                    size="form"
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="qtn-valid-until">Valid until</FieldLabel>
              <Controller
                control={control}
                name="validUntil"
                render={({ field }) => (
                  <DatePicker
                    id="qtn-valid-until"
                    size="form"
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </Field>
          </div>

          {/* Tax — same treatment: no wrapper, no title, two centered cards
              with a single word each (change 12). */}
          <div
            role="radiogroup"
            aria-label="GST estimate"
            className="grid grid-cols-2 gap-2 border-b border-border pb-4"
          >
            {(["IN", "INTL"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={values.gstCountry === value}
                onClick={() => setValue("gstCountry", value, { shouldDirty: true })}
                className={`flex h-9.5 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                  values.gstCountry === value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/60"
                }`}
              >
                {value === "IN" ? "India" : "International"}
              </button>
            ))}
          </div>
        </FieldGroup>

        {/* `size="form"` here is what gives the row inputs and the "Add item"
            trigger their 38px height — `LineItemsEditor` itself stays
            unmodified, and every Input/Button inside inherits via the same
            `group-data-[size=form]` mechanism `Input`/`Button` already
            document (see their own comments), not a prop threaded through. */}
        <FieldGroup size="form">
          <LineItemsEditor
            control={control}
            register={register}
            fieldArray={lineItems}
            legend="Line items"
            addLabel="Add item"
            itemLabel="item"
            showSection
            showRecurring
            allowEmpty
            presets={linePresets}
          />
        </FieldGroup>

        <WordingDrawer
          label="Payment schedule & terms"
          description="A milestone breakdown and freeform terms — reviewed together."
        >
          <FieldGroup size="form" className="gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">
                Payment schedule
              </legend>
              {milestones.fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2">
                  <Field className="flex-1">
                    <FieldLabel htmlFor={`qtn-milestone-label-${index}`}>
                      Milestone
                    </FieldLabel>
                    <Input
                      id={`qtn-milestone-label-${index}`}
                      size="form"
                      placeholder="e.g. Advance"
                      {...register(`milestones.${index}.label` as const)}
                    />
                  </Field>
                  <Field className="w-24">
                    <FieldLabel htmlFor={`qtn-milestone-percent-${index}`}>
                      %
                    </FieldLabel>
                    <Input
                      id={`qtn-milestone-percent-${index}`}
                      size="form"
                      {...numericField(
                        register(`milestones.${index}.percent` as const),
                        "money",
                      )}
                    />
                  </Field>
                  <RemoveButton
                    label={`Remove milestone ${index + 1}`}
                    onConfirm={() => milestones.remove(index)}
                  />
                </div>
              ))}
              {values.milestones.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {milestoneTotal}% of 100% allocated
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => milestones.append({ label: "", percent: "" })}
              >
                Add milestone
              </Button>
            </fieldset>

            <Field>
              <FieldLabel htmlFor="qtn-terms">Terms & notes</FieldLabel>
              <Textarea id="qtn-terms" rows={6} {...register("termsNote")} />
            </Field>
          </FieldGroup>
        </WordingDrawer>

        <section
          aria-label="Totals"
          aria-live="polite"
          className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-4 text-sm"
        >
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatINR(totals.subtotalPaise)}</span>
          </div>
          {values.gstCountry === "IN" ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. GST (18%)</span>
              <span className="tabular-nums">{formatINR(totals.gstPaise)}</span>
            </div>
          ) : null}
          <div className="mt-1 flex justify-between border-t border-border pt-2 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatINR(totals.totalPaise)}</span>
          </div>
        </section>
      </form>
    </DocumentWorkspace>
  );
}
