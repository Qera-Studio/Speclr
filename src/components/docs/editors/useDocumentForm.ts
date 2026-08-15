'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import { todayISO } from '@/lib/domain/dates';
import { paiseToRupees, rupeesToPaise } from '@/lib/domain/money';
import { DOC_TYPES, type DocFields } from '@/lib/domain/registry';
import type { AdminDocument, DocTypeCode, PaymentMethod } from '@/lib/domain/types';

/**
 * Form state for the document editor. Inputs are strings (what <input>
 * produces); toPayload() converts to the typed integer-paise DocFields shape.
 * Client-side validation is deliberately light — the Server Action's zod
 * schema is the source of truth.
 */

export interface LineItemFormValues {
  description: string;
  detail: string;
  rate: string; // decimal rupees, e.g. '1500.50'
  qty: string;
}

export interface EditorFormValues {
  clientId: string;
  issueDate: string;
  dueDate: string;
  lineItems: LineItemFormValues[];
  gstRatePercent: string;
  gstLabel: string;
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
}

export function emptyLineItem(): LineItemFormValues {
  return { description: '', detail: '', rate: '', qty: '1' };
}

function defaultsFor(typeCode: DocTypeCode, doc?: AdminDocument | null): EditorFormValues {
  if (doc) {
    return {
      clientId: doc.clientId ?? '',
      issueDate: doc.issueDate,
      dueDate: doc.type === 'INV' ? (doc.dueDate ?? '') : '',
      lineItems: doc.lineItems.map((item) => ({
        description: item.description,
        detail: item.detail ?? '',
        rate: item.ratePaise > 0 ? paiseToRupees(item.ratePaise) : '',
        qty: String(item.qty),
      })),
      gstRatePercent: String(doc.gstRatePercent),
      gstLabel: doc.gstLabel ?? '',
      placeOfSupplyStateCode: doc.placeOfSupplyStateCode ?? '',
      placeOfSupplyOverrideReason: doc.placeOfSupplyOverrideReason ?? '',
      notes: doc.notes ?? '',
      paymentDate: doc.type === 'REC' ? doc.payment.date : '',
      paymentMethod: doc.type === 'REC' ? doc.payment.method : 'Bank Transfer',
      paymentReference: doc.type === 'REC' ? (doc.payment.reference ?? '') : '',
      againstInvoiceNumber: doc.type === 'REC' ? (doc.payment.againstInvoiceNumber ?? '') : '',
      againstInvoiceId: doc.type === 'REC' ? (doc.payment.againstInvoiceId ?? '') : '',
    };
  }

  const fields = DOC_TYPES[typeCode].defaultFields(todayISO());
  return {
    clientId: '',
    issueDate: fields.issueDate,
    dueDate: fields.dueDate ?? '',
    lineItems: fields.lineItems.map(() => emptyLineItem()),
    gstRatePercent: String(fields.gstRatePercent),
    gstLabel: fields.gstLabel ?? '',
    placeOfSupplyStateCode: fields.placeOfSupplyStateCode ?? '',
    placeOfSupplyOverrideReason: '',
    notes: fields.notes ?? '',
    paymentDate: fields.payment?.date ?? '',
    paymentMethod: fields.payment?.method ?? 'Bank Transfer',
    paymentReference: fields.payment?.reference ?? '',
    againstInvoiceNumber: '',
    againstInvoiceId: '',
  };
}

/** Converts form strings into the typed payload the Server Actions validate. */
export function toPayload(
  typeCode: DocTypeCode,
  values: EditorFormValues,
  /** Edited text overrides. Kept out of the form: it is prose, not validated input. */
  content?: DocFields['content'],
): DocFields {
  const fields: DocFields = {
    issueDate: values.issueDate,
    lineItems: values.lineItems.map((item) => ({
      description: item.description,
      detail: item.detail || undefined,
      ratePaise: rupeesToPaise(item.rate) ?? 0,
      qty: Number(item.qty) || 0,
    })),
    gstRatePercent: Number(values.gstRatePercent) || 0,
    gstLabel: values.gstLabel || undefined,
    placeOfSupplyStateCode: values.placeOfSupplyStateCode || undefined,
    placeOfSupplyOverrideReason: values.placeOfSupplyOverrideReason || undefined,
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
  return fields;
}

export function useDocumentForm(typeCode: DocTypeCode, doc?: AdminDocument | null) {
  const form = useForm<EditorFormValues>({
    defaultValues: defaultsFor(typeCode, doc),
    mode: 'onBlur',
  });
  const lineItems = useFieldArray({ control: form.control, name: 'lineItems' });
  return { form, lineItems };
}
