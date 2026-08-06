"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import {
  createDraft,
  deleteDraftAction,
  finalizeDocument,
  updateDraft,
} from "@/server/actions/documents";
import {
  firstDayOfMonth,
  isISOMonth,
  lastDayOfMonth,
  todayISO,
} from "@/lib/domain/dates";
import { slipLineItemSeed } from "@/lib/domain/hrContent";
import type { StudioInfo } from "@/lib/domain/studio";
import {
  DEFAULT_STIPEND_DEDUCTIONS_NOTE,
  DOC_TYPES,
  PAYMENT_METHODS,
} from "@/lib/domain/registry";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  currencyByCode,
  type CurrencyCode,
} from "@/lib/domain/currency";
import { paiseToRupees, rupeesToPaise } from "@/lib/domain/money";
import type { EmployeeRecord } from "@/lib/domain/employee";
import type {
  EmployeeSnapshot,
  LineItem,
  SlipDocument,
} from "@/lib/domain/types";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FieldRow } from "@/components/ui/field-row";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DocumentWorkspace from "@/components/docs/DocumentWorkspace";
import SlipSheet from "@/components/docs/sheets/SlipSheet";
import LineItemsEditor from "./LineItemsEditor";
import { Spinner } from "@/components/ui/spinner";
import { usePulse } from "@/lib/useMinimumDuration";
import EditorSection from "./EditorSection";
import { ContentText, TermsFields, shown, type ContentPatch } from "./ContentFields";
import { contentOf, type DocContent } from "@/lib/domain/docContent";
import { emptyLineItem, type LineItemFormValues } from "./useDocumentForm";
import { workspaceTitle } from "../workspaceTitle";
import { numericField } from "@/components/form/inputFilters";

const EMPTY_SNAPSHOT: EmployeeSnapshot = {
  name: "",
  address: "",
  email: "",
  phone: "",
  role: "",
  engagementType: "intern",
  pronoun: "he",
  joiningDate: "",
  bank: { bankName: "", accountNo: "", ifsc: "" },
};

function snapshotOf(e: EmployeeRecord): EmployeeSnapshot {
  return {
    name: e.name,
    address: e.address,
    email: e.email,
    phone: e.phone,
    role: e.role,
    engagementType: e.engagementType,
    pronoun: e.pronoun,
    joiningDate: e.joiningDate,
    endDate: e.endDate,
    /**
     * Includes `upiQrDataUrl` deliberately: the QR prints on the slip, so an
     * issued slip has to keep showing the QR that was current at issue time,
     * even if the employee later changes bank. That is the whole point of the
     * snapshot. The uploader caps the image so this stays small.
     */
    bank: e.bank,
    /**
     * The pay slip prints these, so the preview has to carry them or the
     * editor shows a slip missing the identifiers the issued one will have.
     * Must stay in step with `employeeSnapshotOf` in the finalize action —
     * this used to be the one field the two copies disagreed about.
     */
    payroll: e.payroll,
  };
}

/**
 * Form state. Inputs are strings (what `<input>` produces); `toPayload`
 * converts to the typed integer-paise shape, exactly as the invoice editor
 * does.
 */
interface SlipFormValues {
  employeeId: string;
  issueDate: string;
  currency: CurrencyCode;
  lineItems: LineItemFormValues[];
  stipendMonth: string;
  stipendPeriodStart: string;
  stipendPeriodEnd: string;
  paymentMethod: string;
  paymentReference: string;
  deductionsNote: string;
  /** Pay slip only — statutory deductions and the wage-period day counts. */
  deductions: LineItemFormValues[];
  daysInPeriod: string;
  daysPaid: string;
  lopDays: string;
}

/** The month a slip covers, as 'YYYY-MM'. Falls back to the issue month. */
function monthOfISODate(iso: string): string {
  return iso.slice(0, 7);
}

/** A stored line item as the form's string fields. */
function itemToForm(item: LineItem): LineItemFormValues {
  return {
    description: item.description,
    detail: item.detail ?? "",
    rate: item.ratePaise > 0 ? paiseToRupees(item.ratePaise) : "",
    qty: String(item.qty),
  };
}

/** A number field's value, or '' when unset — an unrecorded count is not zero. */
function numToForm(n: number | undefined): string {
  return n === undefined ? "" : String(n);
}

/**
 * How many days a wage month has — 28, 29, 30 or 31.
 *
 * The default for both day counts: a full month worked is the ordinary case,
 * so the slip arrives saying "31 / 31" and gets corrected downward when someone
 * was actually absent, rather than starting blank on a figure a wage slip is
 * required to state. Derived from `lastDayOfMonth`, which already knows about
 * leap years.
 */
function daysInMonth(month: string): string {
  const last = lastDayOfMonth(month);
  return last ? last.slice(8, 10).replace(/^0/, "") : "";
}

function defaultsFor(type: SlipType, doc?: SlipDocument | null): SlipFormValues {
  if (doc) {
    return {
      employeeId: doc.employeeId,
      issueDate: doc.issueDate,
      currency: doc.currency ?? DEFAULT_CURRENCY,
      lineItems: doc.lineItems.length
        ? doc.lineItems.map(itemToForm)
        : [emptyLineItem()],
      stipendMonth: doc.stipendMonth,
      stipendPeriodStart: doc.stipendPeriodStart ?? "",
      stipendPeriodEnd: doc.stipendPeriodEnd ?? "",
      paymentMethod: doc.paymentMethod,
      paymentReference: doc.paymentReference ?? "",
      deductionsNote: doc.deductionsNote,
      deductions: (doc.deductions ?? []).map(itemToForm),
      daysInPeriod: numToForm(doc.daysInPeriod),
      daysPaid: numToForm(doc.daysPaid),
      lopDays: numToForm(doc.lopDays),
    };
  }
  const today = todayISO();
  const month = monthOfISODate(today);
  return {
    employeeId: "",
    issueDate: today,
    currency: DEFAULT_CURRENCY,
    lineItems: [emptyLineItem()],
    stipendMonth: month,
    stipendPeriodStart: firstDayOfMonth(month) ?? "",
    stipendPeriodEnd: lastDayOfMonth(month) ?? "",
    paymentMethod: "Bank Transfer",
    paymentReference: "",
    /**
     * The pay slip starts blank. Asserting "no statutory deductions apply" on a
     * wage record is a claim about the employee's tax position that stops being
     * true the moment TDS u/s 192 does — see the note on the PAY registry entry.
     */
    deductionsNote: type === "PAY" ? "" : DEFAULT_STIPEND_DEDUCTIONS_NOTE,
    deductions: [],
    daysInPeriod: daysInMonth(month),
    daysPaid: daysInMonth(month),
    lopDays: "0",
  };
}

/** Which slip this editor is driving. See the note on `SlipDocument`. */
type SlipType = "STP" | "PAY";

interface SlipEditorProps {
  /** 'STP' for a stipend slip, 'PAY' for a pay slip. */
  type: SlipType;
  employees: EmployeeRecord[];
  doc?: SlipDocument | null;
  /** Live studio details, for a draft's preview. See the note in DocumentEditor. */
  studio?: StudioInfo;
  /** Shown in the workspace bar; supplied by the route page. */
  title: string;
}

export default function SlipEditor({
  type,
  employees,
  doc,
  studio,
  title,
}: SlipEditorProps) {
  const spec = DOC_TYPES[type];
  const isPay = type === "PAY";
  const router = useRouter();
  // Picking an employee seeds the line item, the rate and the period. The
  // pulse says which action did that.
  const [seeding, pulseSeeding] = usePulse();

  /** Text overrides — see the note in `DocumentEditor`. */
  const [content, setContent] = useState<DocContent>(doc?.content ?? {});
  const patchContent: ContentPatch = (patch) =>
    setContent((prev) => ({ ...prev, ...patch }));

  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, watch, setValue, getValues, handleSubmit } =
    useForm<SlipFormValues>({ defaultValues: defaultsFor(type, doc) });
  const fieldArray = useFieldArray({ control, name: "lineItems" });
  const deductionsArray = useFieldArray({ control, name: "deductions" });

  /**
   * `useWatch`-equivalent via the hook's `watch(name)` overload — see the note
   * in DocumentEditor: the app builds with `reactCompiler: true`, so the form's
   * bare `watch()` (an ordinary function called during render) must never be
   * used to derive render output.
   */
  const employeeId = watch("employeeId");
  const currency = watch("currency");
  const stipendMonth = watch("stipendMonth");
  const lineItemValues = watch("lineItems");
  const issueDate = watch("issueDate");
  const stipendPeriodStart = watch("stipendPeriodStart");
  const stipendPeriodEnd = watch("stipendPeriodEnd");
  const paymentMethod = watch("paymentMethod");
  const paymentReference = watch("paymentReference");
  const deductionsNote = watch("deductionsNote");
  const deductionValues = watch("deductions");
  const daysInPeriod = watch("daysInPeriod");
  const daysPaid = watch("daysPaid");
  const lopDays = watch("lopDays");

  const employee = employees.find((e) => e.id === employeeId);
  const heading = workspaceTitle(title, spec.label, employee?.name);

  /**
   * Only the people this slip can lawfully name. A pay slip records wages under
   * a contract of employment and a stipend slip records a discretionary payment
   * to an intern, so offering the wrong list invites a mistake that finalize
   * then has to refuse. Filtering is the convenience; the finalize guard is
   * still the enforcement, because the client is never the authority.
   */
  const eligible = employees.filter((e) =>
    isPay ? e.engagementType === "employee" : e.engagementType === "intern",
  );

  /**
   * A pay slip asserts wages under a contract of employment, so naming an
   * intern on one contradicts their stipend slip, offer letter and completion
   * letter. Warned here and refused at finalize — the warning is the useful
   * half, since it appears while the mistake is still cheap to fix.
   */
  const internOnPaySlip = isPay && employee?.engagementType === "intern";
  const employeeSnapshot: EmployeeSnapshot = employee
    ? snapshotOf(employee)
    : (doc?.employeeSnapshot ?? EMPTY_SNAPSHOT);

  const currencySymbol = currencyByCode(currency)?.symbol ?? "₹";

  /**
   * Write the seeded payment into line item 1 for the given employee.
   *
   * One helper for both call sites (picking an employee, changing the month) so
   * the two cannot drift into seeding differently worded lines.
   */
  const writeSeed = (e: EmployeeRecord) => {
    setValue("lineItems.0.description", slipLineItemSeed(type));
    setValue("lineItems.0.rate", paiseToRupees(e.payAmountPaise));
    setValue("lineItems.0.qty", "1");
  };

  /**
   * Selecting an employee seeds the first line item with their pay and their
   * recorded currency — the common case is "this month's stipend, as agreed".
   * Only an untouched first item is overwritten; anything already typed stays.
   */
  const onSelectEmployee = (id: string) => {
    setValue("employeeId", id);
    const e = employees.find((emp) => emp.id === id);
    if (!e) return;
    pulseSeeding();
    setValue("currency", e.payCurrency ?? DEFAULT_CURRENCY);
    const first = getValues("lineItems")[0];
    if (first && !first.description && !first.rate) writeSeed(e);
  };

  /**
   * The period defaults to the whole selected month. Changing the month moves
   * the dates with it, but only while they still match the previous month's
   * bounds — a hand-picked mid-month range must survive.
   *
   * The line item no longer names the period, so it is not re-seeded here: the
   * period is stated once, in DETAILS, and one statement cannot disagree with
   * itself the way the line and the DETAILS block used to.
   */
  const onChangeMonth = (month: string) => {
    const previous = getValues("stipendMonth");
    setValue("stipendMonth", month);
    if (!isISOMonth(month)) return;

    const wasDefault =
      !isISOMonth(previous) ||
      (getValues("stipendPeriodStart") === firstDayOfMonth(previous) &&
        getValues("stipendPeriodEnd") === lastDayOfMonth(previous));
    if (!wasDefault) return;

    setValue("stipendPeriodStart", firstDayOfMonth(month) ?? "");
    setValue("stipendPeriodEnd", lastDayOfMonth(month) ?? "");

    // The day counts move with the month for the same reason the dates do —
    // February is not 31 days — and under the same "only if untouched" rule, so
    // a hand-entered "22 of 30" survives a month change.
    const previousDays = daysInMonth(previous);
    const nextDays = daysInMonth(month);
    if (getValues("daysInPeriod") === previousDays) {
      setValue("daysInPeriod", nextDays);
    }
    if (getValues("daysPaid") === previousDays) setValue("daysPaid", nextDays);
  };

  /** Form strings → the typed integer-paise shape the sheet and payload use. */
  const toLineItems = (values: LineItemFormValues[] | undefined): LineItem[] =>
    (values ?? []).map((item) => ({
      description: item.description,
      detail: item.detail || undefined,
      ratePaise: rupeesToPaise(item.rate) ?? 0,
      // Deductions hide the qty input and stay at 1 — a flat amount.
      qty: Number(item.qty) || 0,
    }));

  const lineItems = toLineItems(lineItemValues);
  const deductions = isPay ? toLineItems(deductionValues) : undefined;

  /** '' → undefined: an unrecorded day count is absent, not zero. */
  const toCount = (value: string): number | undefined => {
    if (!isPay || value.trim() === "") return undefined;
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 ? n : undefined;
  };

  const previewDoc: SlipDocument = {
    id: doc?.id ?? "preview",
    studioSnapshot: doc?.studioSnapshot ?? studio,
    type,
    status: doc?.status ?? "draft",
    number: doc?.number,
    employeeId,
    employeeSnapshot,
    issueDate,
    lineItems,
    // Neither slip is ever taxed — see the note on SlipDocument.
    gstRatePercent: 0,
    currency,
    stipendPeriodStart: stipendPeriodStart || undefined,
    stipendPeriodEnd: stipendPeriodEnd || undefined,
    stipendMonth,
    paymentMethod,
    paymentReference: paymentReference || undefined,
    deductionsNote,
    deductions,
    daysInPeriod: toCount(daysInPeriod),
    daysPaid: toCount(daysPaid),
    lopDays: toCount(lopDays),
    content,
    createdAt: doc?.createdAt ?? 0,
    updatedAt: 0,
  };

  // What the slip will print — the source for every content input's value. Its
  // terms follow the slip type, and the stipend's follow the employee's
  // engagement type, until they are edited.
  const resolved = contentOf(previewDoc, spec);

  /**
   * `employeeId` goes in the payload as well as the positional argument:
   * `stipendDraftSchema` requires it, and omitting it failed `safeParse` on
   * every save with a bare "Invalid input."
   */
  const buildPayload = (values: SlipFormValues) => ({
    employeeId: values.employeeId,
    issueDate: values.issueDate,
    gstRatePercent: 0 as const,
    currency: values.currency,
    lineItems: toLineItems(values.lineItems),
    stipendMonth: values.stipendMonth,
    stipendPeriodStart: values.stipendPeriodStart || undefined,
    stipendPeriodEnd: values.stipendPeriodEnd || undefined,
    paymentMethod: values.paymentMethod,
    paymentReference: values.paymentReference || undefined,
    deductionsNote: values.deductionsNote,
    // Undefined on a stipend slip, so its schema (which has no such keys)
    // parses unchanged and no empty array is written to a slip that has none.
    deductions: isPay ? toLineItems(values.deductions) : undefined,
    daysInPeriod: toCount(values.daysInPeriod),
    daysPaid: toCount(values.daysPaid),
    lopDays: toCount(values.lopDays),
    content,
  });

  const onSaveDraft = handleSubmit(async (values) => {
    setServerError(null);
    setSaved(false);
    setIsSubmitting(true);
    try {
      const payload = buildPayload(values);
      const result = doc
        ? await updateDraft(doc.id, values.employeeId, payload)
        : await createDraft(type, values.employeeId, payload);
      if (!result.success) {
        setServerError(result.error ?? "Something went wrong.");
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
  });

  const onFinalize = async () => {
    if (!doc) return;
    setServerError(null);
    setIsSubmitting(true);
    try {
      const values = getValues();
      const saveResult = await updateDraft(
        doc.id,
        values.employeeId,
        buildPayload(values),
      );
      if (!saveResult.success) {
        setServerError(saveResult.error ?? "Something went wrong.");
        return;
      }
      const result = await finalizeDocument(doc.id);
      if (!result.success) {
        setServerError(result.error ?? "Something went wrong.");
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
        setServerError(result.error ?? "Something went wrong.");
        return;
      }
      router.push("/");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DocumentWorkspace title={heading} preview={<SlipSheet doc={previewDoc} />}>
      <form onSubmit={onSaveDraft} className="flex flex-col gap-4" noValidate>
        <FieldGroup size="form">
          <EditorSection title="Recipient & date" description="Who it is for, and when" defaultOpen>
          <Field>
            <FieldLabel htmlFor="stp-employee">
              Employee {seeding ? <Spinner className="size-3.5" /> : null}
            </FieldLabel>
            <Combobox
              id="stp-employee"
              size="form"
              options={eligible.map((e) => ({
                value: e.id,
                label: `${e.name} — ${e.role}`,
              }))}
              value={employeeId}
              onValueChange={onSelectEmployee}
              placeholder="Select an employee…"
              emptyMessage={
                isPay ? "No matching employees." : "No matching interns."
              }
            />
          </Field>

          {internOnPaySlip ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>
                {employee?.name} is engaged as an intern. A pay slip states that
                wages were paid under a contract of employment — issue a stipend
                slip instead. This cannot be finalized.
              </AlertDescription>
            </Alert>
          ) : null}

          <Field>
            <FieldLabel htmlFor="stp-issue-date">Issue date</FieldLabel>
            <Controller
              control={control}
              name="issueDate"
              render={({ field }) => (
                <DatePicker
                  id="stp-issue-date"
                  size="form"
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
          </Field>

          {/* Currency before the amounts it applies to — you pick the unit,
              then the figures. */}
          {/* <Field>
            <FieldLabel htmlFor="stp-currency">Currency</FieldLabel>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                >
                  <SelectTrigger
                    id="stp-currency"
                    size="form"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent size="form">
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} {c.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field> */}
          </EditorSection>

          {/*
            Line items rather than a single amount: a slip run often carries
            reimbursed expenses (a subscription paid on the studio's behalf)
            alongside the payment itself, and a pay slip's earnings are itemised
            by law anyway (Basic, HRA, allowances). Item 1 is the payment.
          */}
          <LineItemsEditor
            control={control}
            register={register}
            fieldArray={fieldArray}
            currency={currency}
            legend={isPay ? "Earnings" : "Line items"}
            addLabel={isPay ? "Add earning" : "Add line item"}
            itemLabel={isPay ? "earning" : "line item"}
            hideDetail
          />

          {/*
            A wage slip must itemise what was withheld — Payment of Wages Act
            s.7 permits only prescribed deductions and s.13A requires them
            recorded. Starts empty and may stay empty: nothing withheld is a
            perfectly ordinary month.
          */}
          {isPay ? (
            <LineItemsEditor
              control={control}
              register={register}
              fieldArray={deductionsArray}
              currency={currency}
              name="deductions"
              legend="Deductions"
              addLabel="Add deduction"
              itemLabel="deduction"
              hideQty
              hideDetail
              allowEmpty
            />
          ) : null}

          <EditorSection title="Period & payment" description="Month, dates and how it was paid" defaultOpen>
          <Field>
            <FieldLabel htmlFor="stp-month">
              {isPay ? "Salary month" : "Stipend month"}
            </FieldLabel>
            {/* Native month input — the browser's own month/year dropdown, no
                dependency and no bespoke picker to keep accessible. */}
            <Controller
              control={control}
              name="stipendMonth"
              render={({ field }) => (
                <Input
                  id="stp-month"
                  type="month"
                  size="form"
                  value={field.value}
                  onChange={(e) => onChangeMonth(e.target.value)}
                />
              )}
            />
          </Field>

          <FieldRow>
            <Field>
              <FieldLabel htmlFor="stp-period-start">Period start</FieldLabel>
              <Controller
                control={control}
                name="stipendPeriodStart"
                render={({ field }) => (
                  <DatePicker
                    id="stp-period-start"
                    size="form"
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="stp-period-end">Period end</FieldLabel>
              <Controller
                control={control}
                name="stipendPeriodEnd"
                render={({ field }) => (
                  <DatePicker
                    id="stp-period-end"
                    size="form"
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </Field>
          </FieldRow>

          <FieldRow>
            <Field>
              <FieldLabel htmlFor="stp-method">Payment method</FieldLabel>
              <Controller
                control={control}
                name="paymentMethod"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                  >
                    <SelectTrigger
                      id="stp-method"
                      size="form"
                      className="w-full"
                    >
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
            <Field>
              <FieldLabel htmlFor="stp-reference">
                Reference
              </FieldLabel>
              <Input
                id="stp-reference"
                size="form"
                {...register("paymentReference")}
              />
            </Field>
          </FieldRow>

          {/*
            Days worked and paid are prescribed wage-slip contents. Left blank
            they simply do not print — an unrecorded count is absent, not zero.
          */}
          {isPay ? (
            <FieldRow>
              <Field>
                <FieldLabel htmlFor="stp-days-paid">Days paid</FieldLabel>
                <Input
                  id="stp-days-paid"
                  size="form"
                  {...numericField(register("daysPaid"))}
                  />
              </Field>
              <Field>
                <FieldLabel htmlFor="stp-days-period">
                  Days in period
                </FieldLabel>
                <Input
                  id="stp-days-period"
                  size="form"
                  {...numericField(register("daysInPeriod"))}
                  />
              </Field>
              <Field>
                <FieldLabel htmlFor="stp-lop">Loss of pay</FieldLabel>
                <Input
                  id="stp-lop"
                  size="form"
                  {...numericField(register("lopDays"))}
                  />
              </Field>
            </FieldRow>
          ) : null}

          {/*
            Editable rather than fixed boilerplate: whether statutory deductions
            apply depends on the individual engagement, and this line is a legal
            assertion either way (CONTEXT.md §6). It prints once, inside the pay
            term in TERMS.
          */}
          <Field>
            <FieldLabel htmlFor="stp-deductions">
              {isPay ? "Deductions note" : "Deductions / terms note"}
            </FieldLabel>
            <Textarea
              id="stp-deductions"
              size="form"
              rows={2}
              placeholder={
                isPay ? "e.g. TDS deducted under section 192." : undefined
              }
              {...register("deductionsNote")}
            />
          </Field>
          </EditorSection>

          <EditorSection title="Terms" description="The clauses printed at the foot">
            <TermsFields
              terms={shown(content, resolved, "terms")}
              onChange={(terms) => patchContent({ terms })}
            />
          </EditorSection>

          <EditorSection title="Heading" description="The printed title">
            <ContentText
              id="stp-masthead"
              label="Masthead"
              value={shown(content, resolved, "masthead")}
              onChange={(masthead) => patchContent({ masthead })}
            />
          </EditorSection>

          <EditorSection title="Footer" description="QR caption and the closing line">
            <ContentText
              id="stp-qr-caption"
              label="QR caption"
              value={shown(content, resolved, "qrCaption")}
              onChange={(qrCaption) => patchContent({ qrCaption })}
            />
            <ContentText
              id="stp-thanks"
              label="Closing line"
              value={shown(content, resolved, "thanksLine")}
              onChange={(thanksLine) => patchContent({ thanksLine })}
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
              {isSubmitting ? "Saving…" : "Save draft"}
            </Button>
            {doc ? (
              <>
                <ConfirmActionButton
                  label="Finalize & assign number"
                  title={`Finalize this ${spec.label.toLowerCase()}?`}
                  description="A number will be assigned and the slip becomes immutable. Corrections after this mean duplicating it as a new draft."
                  confirmLabel="Finalize"
                  onConfirm={onFinalize}
                  disabled={isSubmitting || internOnPaySlip}
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
