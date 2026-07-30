'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createDraft,
  deleteDraftAction,
  finalizeDocument,
  updateDraft,
} from '@/server/actions/documents';
import { formatDisplayDate, todayISO } from '@/lib/domain/dates';
import { defaultLetterContent } from '@/lib/domain/hrContent';
import { pronounSet, type EmployeeRecord } from '@/lib/domain/employee';
import { formatINR } from '@/lib/domain/money';
import type { EmployeeSnapshot, LetterDocument } from '@/lib/domain/types';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { RemoveButton } from '@/components/ui/remove-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import LetterSheet from '@/components/docs/sheets/LetterSheet';
import DocumentWorkspace from '@/components/docs/DocumentWorkspace';

type LetterType = 'OFR' | 'EXP' | 'EXIT';

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
    bank: e.bank,
  };
}

/** Seed editable body from the default content for this letter type + employee. */
function seedContent(type: LetterType, e: EmployeeRecord) {
  const content = defaultLetterContent(type, e.engagementType, {
    role: e.role,
    payText: `${formatINR(e.payAmountPaise)} per month`,
    startDate: formatDisplayDate(e.joiningDate),
    endDate: e.endDate ? formatDisplayDate(e.endDate) : undefined,
    pronoun: pronounSet(e.pronoun),
  });
  return { bodyParagraphs: content.bodyParagraphs, bulletSections: content.bulletSections };
}


interface LetterEditorProps {
  type: LetterType;
  employees: EmployeeRecord[];
  doc?: LetterDocument | null;
  /** Shown in the workspace bar; supplied by the route page. */
  title: string;
}

export default function LetterEditor({ type, employees, doc, title }: LetterEditorProps) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState(doc?.employeeId ?? '');
  const [issueDate, setIssueDate] = useState(doc?.issueDate ?? todayISO());
  const [bodyParagraphs, setBodyParagraphs] = useState<string[]>(doc?.bodyParagraphs ?? []);
  const [bulletSections, setBulletSections] = useState<LetterDocument['bulletSections']>(
    doc?.bulletSections ?? [],
  );
  const [payAmountPaise, setPayAmountPaise] = useState<number | undefined>(doc?.payAmountPaise);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const employee = employees.find((e) => e.id === employeeId);
  const employeeSnapshot: EmployeeSnapshot = employee
    ? snapshotOf(employee)
    : (doc?.employeeSnapshot ?? EMPTY_SNAPSHOT);

  // Selecting an employee seeds the editable body from the default content for
  // this letter type + their engagement type (intern/employee wording).
  const onSelectEmployee = (id: string) => {
    setEmployeeId(id);
    const e = employees.find((emp) => emp.id === id);
    if (e) {
      const seeded = seedContent(type, e);
      setBodyParagraphs(seeded.bodyParagraphs);
      setBulletSections(seeded.bulletSections);
      if (type === 'OFR') setPayAmountPaise(e.payAmountPaise);
    }
  };

  const previewDoc: LetterDocument = {
    id: doc?.id ?? 'preview',
    type,
    status: doc?.status ?? 'draft',
    employeeId,
    employeeSnapshot,
    issueDate,
    bodyParagraphs,
    bulletSections,
    payAmountPaise,
    lineItems: [],
    gstRatePercent: 0,
    createdAt: doc?.createdAt ?? 0,
    updatedAt: 0,
  };

  const buildPayload = () => ({ issueDate, bodyParagraphs, bulletSections, payAmountPaise });

  const onSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSaved(false);
    setIsSubmitting(true);
    try {
      const payload = buildPayload();
      const result = doc
        ? await updateDraft(doc.id, employeeId, payload)
        : await createDraft(type, employeeId, payload);
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

  const updateParagraph = (i: number, value: string) =>
    setBodyParagraphs((prev) => prev.map((p, j) => (j === i ? value : p)));
  const addParagraph = () => setBodyParagraphs((prev) => [...prev, '']);
  const removeParagraph = (i: number) => setBodyParagraphs((prev) => prev.filter((_, j) => j !== i));

  const updateBulletItem = (si: number, ii: number, value: string) =>
    setBulletSections((prev) =>
      prev.map((s, j) => (j === si ? { ...s, items: s.items.map((it, k) => (k === ii ? value : it)) } : s)),
    );
  const updateBulletHeading = (si: number, value: string) =>
    setBulletSections((prev) => prev.map((s, j) => (j === si ? { ...s, heading: value } : s)));
  const addBulletItem = (si: number) =>
    setBulletSections((prev) => prev.map((s, j) => (j === si ? { ...s, items: [...s.items, ''] } : s)));
  const removeBulletItem = (si: number, ii: number) =>
    setBulletSections((prev) =>
      prev.map((s, j) => (j === si ? { ...s, items: s.items.filter((_, k) => k !== ii) } : s)),
    );

  return (
    <DocumentWorkspace title={title} preview={<LetterSheet doc={previewDoc} />}>
      <form onSubmit={onSaveDraft} className="flex flex-col gap-4" noValidate>
        <Field>
          <FieldLabel htmlFor="letter-employee">Employee</FieldLabel>
          <Combobox
            id="letter-employee"
            size="form"
            options={employees.map((e) => ({ value: e.id, label: `${e.name} — ${e.role}` }))}
            value={employeeId}
            onValueChange={onSelectEmployee}
            placeholder="Select an employee…"
            emptyMessage="No matching employees."
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="letter-issue-date">Issue date</FieldLabel>
          <DatePicker
            id="letter-issue-date"
            size="form"
            value={issueDate}
            onValueChange={setIssueDate}
          />
        </Field>

        <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium">Letter body</legend>
          {bodyParagraphs.map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <label htmlFor={`para-${i}`} className="sr-only">
                Paragraph {i + 1}
              </label>
              <Textarea
                id={`para-${i}`}
                rows={3}
                className="flex-1"
                value={p}
                onChange={(e) => updateParagraph(i, e.target.value)}
              />
              <RemoveButton
                label={`Remove paragraph ${i + 1}`}
                onConfirm={() => removeParagraph(i)}
              />
            </div>
          ))}
          <div>
            <Button type="button" variant="outline" onClick={addParagraph}>
              Add paragraph
            </Button>
          </div>
        </fieldset>

        {bulletSections.map((section, si) => (
          <fieldset key={si} className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <legend className="px-1 text-sm font-medium">Bullet section {si + 1}</legend>
            <Field>
              <FieldLabel htmlFor={`bh-${si}`}>Heading</FieldLabel>
              <Input
                id={`bh-${si}`}
                value={section.heading}
                onChange={(e) => updateBulletHeading(si, e.target.value)}
              />
            </Field>
            {section.items.map((item, ii) => (
              <div key={ii} className="flex items-center gap-2">
                <label htmlFor={`bi-${si}-${ii}`} className="sr-only">
                  Bullet {ii + 1}
                </label>
                <Input
                  id={`bi-${si}-${ii}`}
                  className="flex-1"
                  value={item}
                  onChange={(e) => updateBulletItem(si, ii, e.target.value)}
                />
                <RemoveButton
                  label={`Remove bullet ${ii + 1} in section ${si + 1}`}
                  onConfirm={() => removeBulletItem(si, ii)}
                />
              </div>
            ))}
            <div>
              <Button type="button" variant="outline" onClick={() => addBulletItem(si)}>
                Add bullet
              </Button>
            </div>
          </fieldset>
        ))}

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
                label="Finalize"
                title="Finalize this letter?"
                description="The letter becomes immutable. Corrections after this mean duplicating it as a new draft."
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
