"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { todayISO } from "@/lib/domain/dates";
import { paiseToRupees, rupeesToPaise } from "@/lib/domain/money";
import { DOC_TYPES, type DocFields } from "@/lib/domain/registry";
import type {
  AdminDocument,
  DocTypeCode,
  PaymentMethod,
} from "@/lib/domain/types";

/**
 * Form state for the document editor. Inputs are strings (what <input>
 * produces); toPayload() converts to the typed integer-paise DocFields shape.
 * Client-side validation is deliberately light — the Server Action's zod
 * schema is the source of truth.
 */

export interface LineItemFormValues {
  description: string;
  rate: string; // decimal rupees, e.g. '1500.50'
  qty: string;
  /** Six digits beginning 99. Empty on a line nothing has classified yet. */
  sacCode: string;
  /**
   * The Service Quotation's sub-line, collected behind `showDetail` and left
   * empty everywhere else. On the shape rather than a separate quotation-only
   * type so `LineItemsEditor` and `LineItemPreset` stay one thing.
   */
  detail?: string;
}

export interface EditorFormValues {
  clientId: string;
  issueDate: string;
  dueDate: string;
  lineItems: LineItemFormValues[];
  gstRatePercent: string;
  gstLabel: string;
  /**
   * A discount off the taxable value, one field per way of typing it. Both are
   * strings because both are inputs; whichever the operator last touched is the
   * one kept, and the other is cleared as they type, because two figures for
   * one discount is a document that can disagree with itself.
   */
  discountPercent: string;
  discountAmount: string;
  placeOfSupplyStateCode: string;
  /**
   * Why the place of supply is not the one derived from the client.
   *
   * Place of supply is derived from the recipient (`placeOfSupply.ts`), but the
   * derivation has lawful exceptions — CGST s.12(3) puts it where immovable
   * property is, and bill-to/ship-to cases diverge too. `PRINCIPLES.md` rule 3
   * allows the override on one condition: it is explicit and *recorded*. An
   * override with no trace of why is the same bug wearing a different hat, so
   * this is required whenever the picked code differs from the derived one.
   */
  placeOfSupplyOverrideReason: string;
  gstOverrideReason: string;
  notes: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  /** What prints on the receipt. Authoritative. */
  againstInvoiceNumber: string;
  /**
   * Id of that same invoice. Set together with the number when one is picked,
   * and cleared if the number is then hand-edited — a stored id silently
   * disagreeing with the printed number would be worse than no id at all.
   */
  againstInvoiceId: string;
  /**
   * The credited invoice's own date. Rule 53(1A)(f) wants the credit note to
   * name the invoice by serial number *and* date, and the receipt has never
   * needed it: a receipt points at an invoice, a credit note identifies it.
   */
  againstInvoiceDate: string;
  /** Why the credit is issued. CRN only; see `CreditNoteDocument.reason`. */
  creditReason: string;
}

export function emptyLineItem(): LineItemFormValues {
  return { description: "", rate: "", qty: "1", sacCode: "" };
}

function defaultsFor(
  typeCode: DocTypeCode,
  doc?: AdminDocument | null,
): EditorFormValues {
  if (doc) {
    return {
      clientId: doc.clientId ?? "",
      issueDate: doc.issueDate,
      dueDate: doc.type === "INV" ? (doc.dueDate ?? "") : "",
      lineItems: doc.lineItems.map((item) => ({
        description: item.description,
        rate: item.ratePaise > 0 ? paiseToRupees(item.ratePaise) : "",
        qty: String(item.qty),
        sacCode: item.sacCode ?? "",
      })),
      gstRatePercent: String(doc.gstRatePercent),
      gstLabel: doc.gstLabel ?? "",
      discountPercent:
        doc.discountPercent !== undefined ? String(doc.discountPercent) : "",
      discountAmount:
        doc.discountPaise !== undefined ? paiseToRupees(doc.discountPaise) : "",
      placeOfSupplyStateCode: doc.placeOfSupplyStateCode ?? "",
      placeOfSupplyOverrideReason: doc.placeOfSupplyOverrideReason ?? "",
      gstOverrideReason: doc.gstOverrideReason ?? "",
      notes: doc.notes ?? "",
      paymentDate: doc.type === "REC" ? doc.payment.date : "",
      paymentMethod: doc.type === "REC" ? doc.payment.method : "Bank Transfer",
      paymentReference: doc.type === "REC" ? (doc.payment.reference ?? "") : "",
      againstInvoiceNumber:
        doc.type === "REC"
          ? (doc.payment.againstInvoiceNumber ?? "")
          : doc.type === "CRN"
            ? (doc.against.invoiceNumber ?? "")
            : "",
      againstInvoiceId:
        doc.type === "REC"
          ? (doc.payment.againstInvoiceId ?? "")
          : doc.type === "CRN"
            ? (doc.against.invoiceId ?? "")
            : "",
      againstInvoiceDate:
        doc.type === "CRN" ? (doc.against.invoiceDate ?? "") : "",
      creditReason: doc.type === "CRN" ? (doc.reason ?? "") : "",
    };
  }

  const fields = DOC_TYPES[typeCode].defaultFields(todayISO());
  return {
    clientId: "",
    issueDate: fields.issueDate,
    dueDate: fields.dueDate ?? "",
    lineItems: fields.lineItems.map(() => emptyLineItem()),
    gstRatePercent: String(fields.gstRatePercent),
    gstLabel: fields.gstLabel ?? "",
    discountPercent: "",
    discountAmount: "",
    placeOfSupplyStateCode: fields.placeOfSupplyStateCode ?? "",
    placeOfSupplyOverrideReason: "",
    gstOverrideReason: "",
    notes: fields.notes ?? "",
    paymentDate: fields.payment?.date ?? "",
    paymentMethod: fields.payment?.method ?? "Bank Transfer",
    paymentReference: fields.payment?.reference ?? "",
    againstInvoiceNumber: "",
    againstInvoiceId: "",
    againstInvoiceDate: "",
    creditReason: "",
  };
}

/** Converts form strings into the typed payload the Server Actions validate. */
export function toPayload(
  typeCode: DocTypeCode,
  values: EditorFormValues,
  /** Edited text overrides. Kept out of the form: it is prose, not validated input. */
  content?: DocFields["content"],
): DocFields {
  const fields: DocFields = {
    issueDate: values.issueDate,
    lineItems: values.lineItems.map((item) => ({
      description: item.description,
      /* No `detail`. Nothing collects one and no sheet prints one; a draft
         written while the field existed keeps whatever it holds in the
         database and simply stops printing it. */
      ratePaise: rupeesToPaise(item.rate) ?? 0,
      qty: Number(item.qty) || 0,
      sacCode: item.sacCode || undefined,
    })),
    gstRatePercent: Number(values.gstRatePercent) || 0,
    gstLabel: values.gstLabel || undefined,
    /* One or the other, never both: the schema refuses a document carrying two
       figures for one discount, and a zero is no discount rather than a
       discount of nothing. */
    discountPercent: Number(values.discountPercent) || undefined,
    discountPaise: values.discountPercent
      ? undefined
      : rupeesToPaise(values.discountAmount) || undefined,
    placeOfSupplyStateCode: values.placeOfSupplyStateCode || undefined,
    placeOfSupplyOverrideReason:
      values.placeOfSupplyOverrideReason || undefined,
    gstOverrideReason: values.gstOverrideReason || undefined,
    notes: values.notes || undefined,
    content,
  };

  if (DOC_TYPES[typeCode].hasDueDate && values.dueDate) {
    fields.dueDate = values.dueDate;
  }
  if (DOC_TYPES[typeCode].hasPayment) {
    fields.payment = {
      date: values.paymentDate,
      method: values.paymentMethod,
      reference: values.paymentReference || undefined,
      againstInvoiceNumber: values.againstInvoiceNumber || undefined,
      againstInvoiceId: values.againstInvoiceId || undefined,
    };
  }
  if (DOC_TYPES[typeCode].creditsInvoice) {
    fields.againstInvoiceNumber = values.againstInvoiceNumber || undefined;
    fields.againstInvoiceDate = values.againstInvoiceDate || undefined;
    fields.againstInvoiceId = values.againstInvoiceId || undefined;
    fields.creditReason = values.creditReason || undefined;
  }
  return fields;
}

export function useDocumentForm(
  typeCode: DocTypeCode,
  doc?: AdminDocument | null,
) {
  const form = useForm<EditorFormValues>({
    defaultValues: defaultsFor(typeCode, doc),
    // First blur, then every keystroke. `onBlur` alone left the displayed state
    // one blur behind the value, so a field already visited kept whatever
    // verdict it was last given while being changed. Same fix as the onboarding
    // steps; the note in `TaxStep` has the detail.
    mode: "onTouched",
  });
  const lineItems = useFieldArray({ control: form.control, name: "lineItems" });
  return { form, lineItems };
}
