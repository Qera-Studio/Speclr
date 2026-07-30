'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createDraft,
  deleteDraftAction,
  finalizeDocument,
  updateDraft,
} from '@/server/actions/documents';
import { todayISO } from '@/lib/domain/dates';
import { DOC_TYPES } from '@/lib/domain/registry';
import { paiseToRupees, rupeesToPaise } from '@/lib/domain/money';
import type { EmployeeRecord } from '@/lib/domain/employee';
import type { EmployeeSnapshot, LineItem, StipendDocument } from '@/lib/domain/types';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import DocumentWorkspace from '@/components/docs/DocumentWorkspace';
import StipendSheet from '@/components/docs/sheets/StipendSheet';
import { workspaceTitle } from '../workspaceTitle';

const EMPTY_SNAPSHOT: EmployeeSnapshot = {
  name: '',
  address: '',
  email: '',
  phone: '',
  role: '',
  engagementType: 'intern',
  pronoun: 'he',
  joiningDate: '',
  bank: { bankName: '', accountNo: '', ifsc: '' },
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


interface StipendEditorProps {
  employees: EmployeeRecord[];
  doc?: StipendDocument | null;
  /** Shown in the workspace bar; supplied by the route page. */
  title: string;
}

export default function StipendEditor({ employees, doc, title }: StipendEditorProps) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState(doc?.employeeId ?? '');
  const [issueDate, setIssueDate] = useState(doc?.issueDate ?? todayISO());
  const [description, setDescription] = useState(doc?.lineItems[0]?.description ?? '');
  const [amountRupees, setAmountRupees] = useState(
    doc?.lineItems[0] ? paiseToRupees(doc.lineItems[0].ratePaise) : '',
  );
  const [stipendPeriod, setStipendPeriod] = useState(doc?.stipendPeriod ?? '');
  const [stipendMonth, setStipendMonth] = useState(doc?.stipendMonth ?? '');
  const [paymentMethod, setPaymentMethod] = useState(doc?.paymentMethod ?? 'Bank transfer');
  const [paymentReference, setPaymentReference] = useState(doc?.paymentReference ?? '');
  const [deductionsNote, setDeductionsNote] = useState(
    doc?.deductionsNote ?? 'No statutory deductions applicable for this internship engagement.',
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const employee = employees.find((e) => e.id === employeeId);
  const heading = workspaceTitle(title, DOC_TYPES.STP.label, employee?.name);
  const employeeSnapshot: EmployeeSnapshot = employee
    ? snapshotOf(employee)
    : (doc?.employeeSnapshot ?? EMPTY_SNAPSHOT);

  const onSelectEmployee = (id: string) => {
    setEmployeeId(id);
    const e = employees.find((emp) => emp.id === id);
    // Pre-fill the stipend amount from the employee's pay if not already set.
    if (e && !amountRupees) setAmountRupees(paiseToRupees(e.payAmountPaise));
  };

  const lineItems: LineItem[] = [{ description, ratePaise: rupeesToPaise(amountRupees) ?? 0, qty: 1 }];

  const previewDoc: StipendDocument = {
    id: doc?.id ?? 'preview',
    type: 'STP',
    status: doc?.status ?? 'draft',
    number: doc?.number,
    employeeId,
    employeeSnapshot,
    issueDate,
    lineItems,
    gstRatePercent: 0,
    gstLabel: 'not applicable - registration in process',
    stipendPeriod,
    stipendMonth,
    paymentMethod,
    paymentReference: paymentReference || undefined,
    deductionsNote,
    createdAt: doc?.createdAt ?? 0,
    updatedAt: 0,
  };

  const buildPayload = () => ({
    issueDate,
    gstRatePercent: 0,
    gstLabel: 'not applicable - registration in process',
    lineItems,
    stipendPeriod,
    stipendMonth,
    paymentMethod,
    paymentReference: paymentReference || undefined,
    deductionsNote,
  });

  const onSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSaved(false);
    setIsSubmitting(true);
    try {
      const result = doc
        ? await updateDraft(doc.id, employeeId, buildPayload())
        : await createDraft('STP', employeeId, buildPayload());
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFinalize = async () => {
    if (!doc) return;
    setServerError(null);
    setIsSubmitting(true);
    try {
      const saveResult = await updateDraft(doc.id, employeeId, buildPayload());
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
        setServerError(result.error ?? 'Something went wrong.');
        return;
      }
      router.push('/');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DocumentWorkspace title={heading} preview={<StipendSheet doc={previewDoc} />}>
      <form onSubmit={onSaveDraft} className="flex flex-col gap-4" noValidate>
        <Field>
          <FieldLabel htmlFor="stp-employee">Employee</FieldLabel>
          <Combobox
            id="stp-employee"
            size="form"
            options={employees.map((e) => ({ value: e.id, label: `${e.name} — ${e.role}` }))}
            value={employeeId}
            onValueChange={onSelectEmployee}
            placeholder="Select an employee…"
            emptyMessage="No matching employees."
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="stp-issue-date">Issue date</FieldLabel>
          <DatePicker id="stp-issue-date" size="form" value={issueDate} onValueChange={setIssueDate} />
        </Field>

        <Field>
          <FieldLabel htmlFor="stp-description">Description</FieldLabel>
          <Input
            id="stp-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Internship Stipend — May 2026"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="stp-amount">Stipend amount (₹)</FieldLabel>
          <Input
            id="stp-amount"
            inputMode="decimal"
            value={amountRupees}
            onChange={(e) => setAmountRupees(e.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="stp-month">Stipend month</FieldLabel>
          <Input
            id="stp-month"
            value={stipendMonth}
            onChange={(e) => setStipendMonth(e.target.value)}
            placeholder="May 2026"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="stp-period">Period</FieldLabel>
          <Input
            id="stp-period"
            value={stipendPeriod}
            onChange={(e) => setStipendPeriod(e.target.value)}
            placeholder="12th – 31st May"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="stp-method">Payment method</FieldLabel>
          <Input id="stp-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
        </Field>

        <Field>
          <FieldLabel htmlFor="stp-reference">Payment reference (optional)</FieldLabel>
          <Input id="stp-reference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
        </Field>

        <Field>
          <FieldLabel htmlFor="stp-deductions">Deductions / terms note</FieldLabel>
          <Textarea
            id="stp-deductions"
            rows={2}
            value={deductionsNote}
            onChange={(e) => setDeductionsNote(e.target.value)}
          />
        </Field>

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
      </form>
    </DocumentWorkspace>
  );
}
