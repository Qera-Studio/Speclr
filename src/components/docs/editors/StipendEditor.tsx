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
  formatDisplayMonth,
  isISOMonth,
  lastDayOfMonth,
  todayISO,
} from "@/lib/domain/dates";
import type { StudioInfo } from "@/lib/domain/studio";
import { DOC_TYPES, PAYMENT_METHODS } from "@/lib/domain/registry";
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
  StipendDocument,
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
import StipendSheet from "@/components/docs/sheets/StipendSheet";
import LineItemsEditor from "./LineItemsEditor";
import { emptyLineItem, type LineItemFormValues } from "./useDocumentForm";
import { workspaceTitle } from "../workspaceTitle";

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
  };
}

/**
 * Form state. Inputs are strings (what `<input>` produces); `toPayload`
 * converts to the typed integer-paise shape, exactly as the invoice editor
 * does.
 */
interface StipendFormValues {
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
}

const DEFAULT_DEDUCTIONS_NOTE =
  "No statutory deductions (PF, ESI, TDS) are applicable.";

/** The month a slip covers, as 'YYYY-MM'. Falls back to the issue month. */
function monthOfISODate(iso: string): string {
  return iso.slice(0, 7);
}

function defaultsFor(doc?: StipendDocument | null): StipendFormValues {
  if (doc) {
    return {
      employeeId: doc.employeeId,
      issueDate: doc.issueDate,
      currency: doc.currency ?? DEFAULT_CURRENCY,
      lineItems: doc.lineItems.length
        ? doc.lineItems.map((item) => ({
            description: item.description,
            detail: item.detail ?? "",
            rate: item.ratePaise > 0 ? paiseToRupees(item.ratePaise) : "",
            qty: String(item.qty),
          }))
        : [emptyLineItem()],
      stipendMonth: doc.stipendMonth,
      stipendPeriodStart: doc.stipendPeriodStart ?? "",
      stipendPeriodEnd: doc.stipendPeriodEnd ?? "",
      paymentMethod: doc.paymentMethod,
      paymentReference: doc.paymentReference ?? "",
      deductionsNote: doc.deductionsNote,
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
    deductionsNote: DEFAULT_DEDUCTIONS_NOTE,
  };
}

interface StipendEditorProps {
  employees: EmployeeRecord[];
  doc?: StipendDocument | null;
  /** Live studio details, for a draft's preview. See the note in DocumentEditor. */
  studio?: StudioInfo;
  /** Shown in the workspace bar; supplied by the route page. */
  title: string;
}

export default function StipendEditor({
  employees,
  doc,
  studio,
  title,
}: StipendEditorProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, watch, setValue, getValues, handleSubmit } =
    useForm<StipendFormValues>({ defaultValues: defaultsFor(doc) });
  const fieldArray = useFieldArray({ control, name: "lineItems" });

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

  const employee = employees.find((e) => e.id === employeeId);
  const heading = workspaceTitle(title, DOC_TYPES.STP.label, employee?.name);
  const employeeSnapshot: EmployeeSnapshot = employee
    ? snapshotOf(employee)
    : (doc?.employeeSnapshot ?? EMPTY_SNAPSHOT);

  const currencySymbol = currencyByCode(currency)?.symbol ?? "₹";

  /**
   * Selecting an employee seeds the first line item with their pay and their
   * recorded currency — the common case is "this month's stipend, as agreed".
   * Only an untouched first item is overwritten; anything already typed stays.
   */
  const onSelectEmployee = (id: string) => {
    setValue("employeeId", id);
    const e = employees.find((emp) => emp.id === id);
    if (!e) return;
    setValue("currency", e.payCurrency ?? DEFAULT_CURRENCY);
    const first = getValues("lineItems")[0];
    if (first && !first.description && !first.rate) {
      const month = getValues("stipendMonth");
      setValue(
        "lineItems.0.description",
        `Stipend — ${formatDisplayMonth(month)}`,
      );
      setValue("lineItems.0.rate", paiseToRupees(e.payAmountPaise));
      setValue("lineItems.0.qty", "1");
    }
  };

  /**
   * The period defaults to the whole selected month. Changing the month moves
   * the dates with it, but only while they still match the previous month's
   * bounds — a hand-picked mid-month range must survive.
   */
  const onChangeMonth = (month: string) => {
    const previous = getValues("stipendMonth");
    setValue("stipendMonth", month);
    if (!isISOMonth(month)) return;

    const wasDefault =
      !isISOMonth(previous) ||
      (getValues("stipendPeriodStart") === firstDayOfMonth(previous) &&
        getValues("stipendPeriodEnd") === lastDayOfMonth(previous));
    if (wasDefault) {
      setValue("stipendPeriodStart", firstDayOfMonth(month) ?? "");
      setValue("stipendPeriodEnd", lastDayOfMonth(month) ?? "");
    }
  };

  const lineItems: LineItem[] = (lineItemValues ?? []).map((item) => ({
    description: item.description,
    detail: item.detail || undefined,
    ratePaise: rupeesToPaise(item.rate) ?? 0,
    qty: Number(item.qty) || 0,
  }));

  const previewDoc: StipendDocument = {
    id: doc?.id ?? "preview",
    studioSnapshot: doc?.studioSnapshot ?? studio,
    type: "STP",
    status: doc?.status ?? "draft",
    number: doc?.number,
    employeeId,
    employeeSnapshot,
    issueDate,
    lineItems,
    // A stipend is never taxed — see the note on StipendDocument.
    gstRatePercent: 0,
    currency,
    stipendPeriodStart: stipendPeriodStart || undefined,
    stipendPeriodEnd: stipendPeriodEnd || undefined,
    stipendMonth,
    paymentMethod,
    paymentReference: paymentReference || undefined,
    deductionsNote,
    createdAt: doc?.createdAt ?? 0,
    updatedAt: 0,
  };

  /**
   * `employeeId` goes in the payload as well as the positional argument:
   * `stipendDraftSchema` requires it, and omitting it failed `safeParse` on
   * every save with a bare "Invalid input."
   */
  const buildPayload = (values: StipendFormValues) => ({
    employeeId: values.employeeId,
    issueDate: values.issueDate,
    gstRatePercent: 0 as const,
    currency: values.currency,
    lineItems: values.lineItems.map((item) => ({
      description: item.description,
      detail: item.detail || undefined,
      ratePaise: rupeesToPaise(item.rate) ?? 0,
      qty: Number(item.qty) || 0,
    })),
    stipendMonth: values.stipendMonth,
    stipendPeriodStart: values.stipendPeriodStart || undefined,
    stipendPeriodEnd: values.stipendPeriodEnd || undefined,
    paymentMethod: values.paymentMethod,
    paymentReference: values.paymentReference || undefined,
    deductionsNote: values.deductionsNote,
  });

  const onSaveDraft = handleSubmit(async (values) => {
    setServerError(null);
    setSaved(false);
    setIsSubmitting(true);
    try {
      const payload = buildPayload(values);
      const result = doc
        ? await updateDraft(doc.id, values.employeeId, payload)
        : await createDraft("STP", values.employeeId, payload);
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
    <DocumentWorkspace
      title={heading}
      preview={<StipendSheet doc={previewDoc} />}
    >
      <form onSubmit={onSaveDraft} className="flex flex-col gap-4" noValidate>
        <FieldGroup size="form">
          <Field>
            <FieldLabel htmlFor="stp-employee">Employee</FieldLabel>
            <Combobox
              id="stp-employee"
              size="form"
              options={employees.map((e) => ({
                value: e.id,
                label: `${e.name} — ${e.role}`,
              }))}
              value={employeeId}
              onValueChange={onSelectEmployee}
              placeholder="Select an employee…"
              emptyMessage="No matching employees."
            />
          </Field>

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

          {/*
            Line items rather than a single amount: a stipend run often carries
            reimbursed expenses (a subscription paid on the studio's behalf)
            alongside the stipend itself. The stipend is simply item 1.
          */}
          <LineItemsEditor
            register={register}
            fieldArray={fieldArray}
            currencySymbol={currencySymbol}
          />

          <Field>
            <FieldLabel htmlFor="stp-month">Stipend month</FieldLabel>
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
                Reference (optional)
              </FieldLabel>
              <Input
                id="stp-reference"
                size="form"
                {...register("paymentReference")}
              />
            </Field>
          </FieldRow>

          {/* <Field>
            <FieldLabel htmlFor="stp-deductions">Deductions / terms note</FieldLabel>
            <Textarea id="stp-deductions" size="form" rows={2} {...register('deductionsNote')} />
          </Field> */}

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
                  title="Finalize this stipend slip?"
                  description="A number will be assigned and the slip becomes immutable. Corrections after this mean duplicating it as a new draft."
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
