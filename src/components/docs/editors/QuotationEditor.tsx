"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import { useRouter } from "next/navigation";
import { deleteDraftAction, finalizeDocument } from "@/server/actions/documents";
import {
  computeQuotationTotals,
  formatQuote,
  formatQuoteRange,
  paymentPhases,
  RECURRING_FREQUENCIES,
  SALUTATIONS,
  type QuotationService,
  type RecurringLine,
  type Salutation,
} from "@/lib/domain/quotation";
import { DOC_TYPES, DELETE_DRAFT_CONSEQUENCE } from "@/lib/domain/registry";
import { todayISO } from "@/lib/domain/dates";
import { paiseToRupees, rupeesToPaise } from "@/lib/domain/money";
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
  quotationSubject,
} from "@/components/docs/sheets/QuotationSheet";
import LineItemsEditor, { type LineItemPreset } from "./LineItemsEditor";
import { type LineItemFormValues } from "./useDocumentForm";
import { useDraftAutosave } from "./useDraftAutosave";
import { AutosaveStatus, SaveError, UnsavedChangesDialog } from "./draftStatus";
import { workspaceTitle } from "../workspaceTitle";
import { useProfile } from "@/lib/useProfile";

/**
 * The Service Quotation's editor.
 *
 * Its shape follows the document's: a cover block, then one collapsible per
 * **service** carrying that service's deliverables and add-ons, then the
 * recurring rows. Nothing here writes the subject line, the payment schedule,
 * the terms or the totals — all four are derived and shown read-only, because
 * a field an operator types that the document already knows is exactly what
 * `PRINCIPLES.md` rule 3 exists to stop.
 *
 * There is deliberately **no add-ons toggle**. Whether a service has an add-on
 * page is `addOns.length > 0`, so a switch beside the list would be a second
 * place for the same answer to live, and a place for the two to disagree.
 */

interface ServiceFormValues {
  name: string;
  blurb: string;
  lines: LineItemFormValues[];
  addOns: LineItemFormValues[];
}

interface RecurringFormValues {
  description: string;
  detail: string;
  frequency: string;
  amountMin: string;
  amountMax: string;
  amountNote: string;
}

interface QuotationFormValues {
  salutation: string;
  recipientName: string;
  companyName: string;
  city: string;
  issueDate: string;
  services: ServiceFormValues[];
  recurring: RecurringFormValues[];
}

const emptyLine = (): LineItemFormValues => ({
  description: "",
  detail: "",
  rate: "",
  qty: "1",
  sacCode: "",
});

const emptyService = (): ServiceFormValues => ({
  name: "",
  blurb: "",
  lines: [emptyLine()],
  addOns: [],
});

const emptyRecurring = (): RecurringFormValues => ({
  description: "",
  detail: "",
  frequency: RECURRING_FREQUENCIES[0],
  amountMin: "",
  amountMax: "",
  amountNote: "",
});

const lineToForm = (line: {
  description: string;
  detail?: string;
  ratePaise: number;
  qty: number;
}): LineItemFormValues => ({
  description: line.description,
  detail: line.detail ?? "",
  rate: line.ratePaise > 0 ? paiseToRupees(line.ratePaise) : "",
  qty: String(line.qty),
  sacCode: "",
});

function defaultsFor(doc?: QuotationDocument | null): QuotationFormValues {
  const services = (doc?.services ?? DOC_TYPES.SQ.defaultFields(todayISO())
    .services ?? []) as QuotationService[];
  return {
    salutation: doc?.salutation ?? "",
    recipientName: doc?.recipientName ?? "",
    companyName: doc?.companyName ?? "",
    city: doc?.city ?? "",
    issueDate: doc?.issueDate ?? DOC_TYPES.SQ.defaultFields(todayISO()).issueDate,
    services:
      services.length > 0
        ? services.map((service) => ({
            name: service.name,
            blurb: service.blurb ?? "",
            lines: service.lines.map(lineToForm),
            addOns: service.addOns.map(lineToForm),
          }))
        : [emptyService()],
    recurring: (doc?.recurring ?? []).map((row) => ({
      description: row.description,
      detail: row.detail ?? "",
      frequency: row.frequency,
      amountMin:
        row.amountPaise === undefined ? "" : paiseToRupees(row.amountPaise),
      amountMax:
        row.amountMaxPaise === undefined
          ? ""
          : paiseToRupees(row.amountMaxPaise),
      amountNote: row.amountNote ?? "",
    })),
  };
}

const toLine = (line: LineItemFormValues) => ({
  description: line.description,
  detail: line.detail || undefined,
  ratePaise: rupeesToPaise(line.rate) ?? 0,
  qty: Number(line.qty) || 0,
});

/** The form's own shapes, turned into the document's. */
function toServices(values: QuotationFormValues): QuotationService[] {
  return values.services.map((service) => ({
    name: service.name,
    blurb: service.blurb || undefined,
    lines: service.lines.map(toLine),
    addOns: service.addOns.map(toLine),
  }));
}

function toRecurring(values: QuotationFormValues): RecurringLine[] {
  return values.recurring.map((row) => ({
    description: row.description,
    detail: row.detail || undefined,
    frequency: row.frequency,
    amountPaise: rupeesToPaise(row.amountMin) ?? undefined,
    amountMaxPaise: rupeesToPaise(row.amountMax) ?? undefined,
    amountNote: row.amountNote || undefined,
  }));
}

function toPayload(values: QuotationFormValues) {
  return {
    issueDate: values.issueDate,
    salutation: (values.salutation || undefined) as Salutation | undefined,
    recipientName: values.recipientName || undefined,
    companyName: values.companyName || undefined,
    city: values.city || undefined,
    services: toServices(values),
    recurring: toRecurring(values),
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
    type: "SQ",
    status: doc?.status ?? "draft",
    number: doc?.number,
    serial: doc?.serial,
    year: doc?.year,
    studioSnapshot: doc?.studioSnapshot ?? studio,
    issueDate: fields.issueDate,
    lineItems: [],
    gstRatePercent: 0,
    salutation: fields.salutation,
    recipientName: fields.recipientName,
    companyName: fields.companyName,
    city: fields.city,
    services: fields.services,
    recurring: fields.recurring,
    createdAt: doc?.createdAt ?? Date.now(),
    updatedAt: doc?.updatedAt ?? Date.now(),
  };
}

/**
 * One service: its name, its blurb, its deliverables and its add-ons.
 *
 * Its own component because `useFieldArray` cannot be called in a loop, and
 * each service needs two of them. `LineItemsEditor` threads every register
 * path off its `name` prop, so the nested arrays address themselves without it
 * knowing they are nested.
 */
function ServiceFieldset({
  control,
  register,
  index,
  presets,
  onRemove,
  canRemove,
}: {
  control: Control<QuotationFormValues>;
  register: UseFormRegister<QuotationFormValues>;
  index: number;
  presets: LineItemPreset[];
  onRemove: () => void;
  canRemove: boolean;
}) {
  const lines = useFieldArray({
    control,
    name: `services.${index}.lines` as const,
  });
  const addOns = useFieldArray({
    control,
    name: `services.${index}.addOns` as const,
  });

  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-3">
      {/* The ordinal lives on the legend, not on the name field's label: it is
          the *fieldset* that is service 2, and a field labelled "Service 2"
          reads as though the service were called that. */}
      <legend className="mb-1 text-sm font-medium">Service {index + 1}</legend>
      <div className="flex items-end gap-2">
        <Field className="flex-1">
          <FieldLabel htmlFor={`qtn-service-name-${index}`}>Name</FieldLabel>
          <Input
            id={`qtn-service-name-${index}`}
            size="form"
            placeholder="e.g. Custom Website"
            {...register(`services.${index}.name` as const)}
          />
        </Field>
        <RemoveButton
          label={`Remove service ${index + 1}`}
          onConfirm={onRemove}
          disabled={!canRemove}
        />
      </div>
      <Field>
        <FieldLabel htmlFor={`qtn-service-blurb-${index}`}>
          Description for this client
        </FieldLabel>
        <Textarea
          id={`qtn-service-blurb-${index}`}
          rows={4}
          {...register(`services.${index}.blurb` as const)}
        />
      </Field>

      <LineItemsEditor
        control={control}
        register={register}
        fieldArray={lines}
        name={`services.${index}.lines`}
        legend="Deliverables"
        addLabel="Add deliverable"
        itemLabel="deliverable"
        showDetail
        allowEmpty
        presets={presets}
      />

      {/* No toggle: the add-on page exists iff there is an add-on. */}
      <LineItemsEditor
        control={control}
        register={register}
        fieldArray={addOns}
        name={`services.${index}.addOns`}
        legend="Add-ons (their own page)"
        addLabel="Add add-on"
        itemLabel="add-on"
        showDetail
        allowEmpty
        presets={presets}
        className="border-t border-border pt-4"
      />
    </fieldset>
  );
}

/** India vs everywhere else is not asked here — a quotation charges no tax. */
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
  const serviceRows = useFieldArray({ control, name: "services" });
  const recurringRows = useFieldArray({ control, name: "recurring" });

  // MUST be useWatch, never `form.watch` — the React Compiler caches an
  // ordinary function call's first result for the component's life, which
  // would freeze this preview on the empty form forever.
  const values = useWatch({ control }) as QuotationFormValues;

  const payload = toPayload(values);
  const autosave = useDraftAutosave({
    typeCode: "SQ",
    initialDocId: doc?.id,
    recipientId: "",
    requiresRecipient: false,
    payload,
  });
  const docId = autosave.docId;

  const previewDoc = buildPreviewDoc(values, doc, studio);
  const totals = computeQuotationTotals(payload.services, payload.recurring);
  const phases = paymentPhases(totals.oneTimePaise);

  const heading = workspaceTitle(
    title,
    "Quotation",
    values.companyName || values.recipientName,
  );

  // The catalogue groups by schedule, matching `DocumentEditor`'s
  // "Retainer"/"Engaged" split. A quotation is pre-sale, so nothing is filtered
  // by what a client has already engaged.
  const linePresets: LineItemPreset[] = services
    .filter((s) => !s.archived)
    .map((service) => ({
      group: service.scheduleKey === "retainer" ? "Retainer" : "One-off",
      label: `${service.name} (${rateUnitOf(service.scheduleKey)})`,
      item: {
        description: service.name,
        detail: "",
        rate: service.ratePaise ? paiseToRupees(service.ratePaise) : "",
        qty: "1",
        sacCode: "",
      } satisfies LineItemFormValues,
    }));

  const applyClient = (clientId: string) => {
    setFillClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    setValue("companyName", client.companyName || client.name, {
      shouldDirty: true,
    });
    const city = client.addressParts?.city;
    if (city) setValue("city", city, { shouldDirty: true });
    const contactName = clientContact(client, "primary")?.name;
    if (contactName) {
      setValue("recipientName", contactName, { shouldDirty: true });
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
                placeholder="Copy a client's details in…"
              />
            </Field>
            <div className="flex items-end gap-2">
              <Field className="w-28">
                <FieldLabel htmlFor="qtn-salutation">Salutation</FieldLabel>
                <Controller
                  control={control}
                  name="salutation"
                  render={({ field }) => (
                    <Combobox
                      id="qtn-salutation"
                      size="form"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={SALUTATIONS.map((s) => ({
                        value: s,
                        label: s,
                      }))}
                      placeholder="Title"
                    />
                  )}
                />
              </Field>
              <Field className="flex-1">
                <FieldLabel htmlFor="qtn-recipient">Prepared for</FieldLabel>
                <Input
                  id="qtn-recipient"
                  size="form"
                  placeholder="The person, e.g. Mehak"
                  {...register("recipientName")}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="qtn-company">Company</FieldLabel>
              <Input
                id="qtn-company"
                size="form"
                placeholder="e.g. The Colorist"
                {...register("companyName")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="qtn-city">City</FieldLabel>
              <Input
                id="qtn-city"
                size="form"
                placeholder="e.g. Coimbatore"
                {...register("city")}
              />
            </Field>
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
            {/* Derived, so it is shown rather than asked for. */}
            <Field>
              <FieldLabel>Subject line</FieldLabel>
              <p className="text-sm text-muted-foreground">
                {quotationSubject(previewDoc)}
              </p>
            </Field>
          </div>
        </FieldGroup>

        {/* `size="form"` here is what gives the row inputs and the "Add" triggers
            their 38px height — every Input/Button inside inherits it through the
            `group-data-[size=form]` mechanism they already document. */}
        <FieldGroup size="form" className="gap-4">
          {serviceRows.fields.map((field, index) => (
            <ServiceFieldset
              key={field.id}
              control={control}
              register={register}
              index={index}
              presets={linePresets}
              onRemove={() => serviceRows.remove(index)}
              canRemove={serviceRows.fields.length > 1}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => serviceRows.append(emptyService())}
          >
            Add service
          </Button>
        </FieldGroup>

        <FieldGroup size="form">
          <fieldset className="flex flex-col gap-3 border-t border-border pt-4">
            <legend className="mb-1 text-sm font-medium">
              Recurring infrastructure
            </legend>
            {recurringRows.fields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex items-end gap-2">
                  <Field className="flex-1">
                    <FieldLabel htmlFor={`qtn-rec-desc-${index}`}>
                      What it is
                    </FieldLabel>
                    <Input
                      id={`qtn-rec-desc-${index}`}
                      size="form"
                      {...register(`recurring.${index}.description` as const)}
                    />
                  </Field>
                  <RemoveButton
                    label={`Remove recurring row ${index + 1}`}
                    onConfirm={() => recurringRows.remove(index)}
                  />
                </div>
                <Field>
                  <FieldLabel htmlFor={`qtn-rec-detail-${index}`}>
                    Detail
                  </FieldLabel>
                  <Textarea
                    id={`qtn-rec-detail-${index}`}
                    rows={2}
                    {...register(`recurring.${index}.detail` as const)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`qtn-rec-freq-${index}`}>
                    Frequency
                  </FieldLabel>
                  <Controller
                    control={control}
                    name={`recurring.${index}.frequency` as const}
                    render={({ field: freq }) => (
                      <Combobox
                        id={`qtn-rec-freq-${index}`}
                        size="form"
                        value={freq.value}
                        onValueChange={freq.onChange}
                        options={RECURRING_FREQUENCIES.map((f) => ({
                          value: f,
                          label: f,
                        }))}
                      />
                    )}
                  />
                </Field>
                <div className="flex items-end gap-2">
                  <Field className="flex-1">
                    <FieldLabel htmlFor={`qtn-rec-min-${index}`}>
                      Amount (₹)
                    </FieldLabel>
                    <Input
                      id={`qtn-rec-min-${index}`}
                      size="form"
                      {...numericField(
                        register(`recurring.${index}.amountMin` as const),
                        "money",
                      )}
                    />
                  </Field>
                  <Field className="flex-1">
                    <FieldLabel htmlFor={`qtn-rec-max-${index}`}>
                      Up to (₹, optional)
                    </FieldLabel>
                    <Input
                      id={`qtn-rec-max-${index}`}
                      size="form"
                      {...numericField(
                        register(`recurring.${index}.amountMax` as const),
                        "money",
                      )}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor={`qtn-rec-note-${index}`}>
                    Or, when it is not money
                  </FieldLabel>
                  <Input
                    id={`qtn-rec-note-${index}`}
                    size="form"
                    placeholder="e.g. 2% + GST"
                    {...register(`recurring.${index}.amountNote` as const)}
                  />
                </Field>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => recurringRows.append(emptyRecurring())}
            >
              Add recurring row
            </Button>
          </fieldset>
        </FieldGroup>

        {/* Every figure below is derived. Nothing here is an input, and the
            summary on the sheet is built from the same call. */}
        <section
          aria-label="Totals"
          aria-live="polite"
          className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-4 text-sm"
        >
          {totals.services.map((service, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-muted-foreground">
                {service.name || `Service ${i + 1}`}
              </span>
              <span className="tabular-nums">
                {formatQuote(service.totalPaise)}
              </span>
            </div>
          ))}
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Recurring (fixed portion)
            </span>
            <span className="tabular-nums">
              {formatQuoteRange(
                totals.recurringFixed.minPaise,
                totals.recurringFixed.maxPaise,
              )}
            </span>
          </div>
          <div className="mt-1 flex justify-between border-t border-border pt-2 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">
              {formatQuote(totals.totalPaise)}
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Payment schedule, from the one-time total:
          </p>
          {phases.map((phase, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{phase.label}</span>
              <span className="tabular-nums">{phase.percent}%</span>
            </div>
          ))}
        </section>
      </form>
    </DocumentWorkspace>
  );
}
