"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteDraftAction,
  finalizeDocument,
} from "@/server/actions/documents";
import { useDraftAutosave } from "./useDraftAutosave";
import { AutosaveStatus, SaveError, UnsavedChangesDialog } from "./draftStatus";
import { formatDisplayDate, todayISO } from "@/lib/domain/dates";
import { DELETE_DRAFT_CONSEQUENCE, DOC_TYPES } from "@/lib/domain/registry";
import type { StudioInfo } from "@/lib/domain/studio";
import { defaultLetterContent } from "@/lib/domain/hrContent";
import { contentOf, type DocContent } from "@/lib/domain/docContent";
import { pronounSet, type EmployeeRecord } from "@/lib/domain/employee";
import { formatINR } from "@/lib/domain/money";
import type { EmployeeSnapshot, LetterDocument } from "@/lib/domain/types";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import FieldInfo from "@/components/form/FieldInfo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { RemoveButton } from "@/components/ui/remove-button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Spinner } from "@/components/ui/spinner";
import { usePulse } from "@/lib/useMinimumDuration";
import EditorSection from "./EditorSection";
import { ContentText, shown, type ContentPatch } from "./ContentFields";
import {
  letterBlocks,
  LETTER_COVER_CLASSNAME,
} from "@/components/docs/sheets/LetterSheet";
import {
  LETTER_PADDING,
  LETTER_PADDING_Y,
} from "@/components/docs/sheets/frame";
import DocumentWorkspace from "@/components/docs/DocumentWorkspace";
import { workspaceTitle } from "../workspaceTitle";
import { useProfile } from "@/lib/useProfile";

type LetterType = "OFR" | "EXP" | "EXIT";

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
    bank: e.bank,
  };
}

/** A blank line separates paragraphs; runs of blank lines collapse to one. */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Seed the editable body from the default content for this letter type +
 * employee.
 *
 * The subject is lifted out of the body into its own field. It was always the
 * first paragraph, which meant editing it meant editing prose around it — and
 * the sheet had to sniff for `Subject:` to set it apart. Letters written before
 * this keep theirs in the body, and the sheet still styles those.
 */
function seedContent(type: LetterType, e: EmployeeRecord) {
  const content = defaultLetterContent(type, e.engagementType, {
    role: e.role,
    /**
     * The amount each engagement is quoted in — an annual salary for an
     * employee, a monthly stipend for an intern. The unit is added by whichever
     * letter prints it, so this is the bare figure. Employees recorded before
     * the annual column existed fall back to twelve months of their monthly
     * pay, which is the same money stated the way an offer letter states it.
     */
    payText: formatINR(
      e.engagementType === "employee"
        ? (e.annualSalaryPaise ?? e.payAmountPaise * 12)
        : e.payAmountPaise,
    ),
    startDate: formatDisplayDate(e.joiningDate),
    endDate: e.endDate ? formatDisplayDate(e.endDate) : undefined,
    pronoun: pronounSet(e.pronoun),
  });
  const [first, ...rest] = content.bodyParagraphs;
  const hasSubject = Boolean(first) && SUBJECT_RE.test(first);
  return {
    subject: hasSubject ? first : "",
    bodyParagraphs: hasSubject ? rest : content.bodyParagraphs,
    bulletSections: content.bulletSections,
  };
}

const SUBJECT_RE = /^\s*subject\s*:/i;

interface LetterEditorProps {
  type: LetterType;
  employees: EmployeeRecord[];
  doc?: LetterDocument | null;
  /** Live studio details, for a draft's preview. See the note in DocumentEditor. */
  studio?: StudioInfo;
  /** Shown in the workspace bar; supplied by the route page. */
  title: string;
}

export default function LetterEditor({
  type,
  employees,
  doc,
  studio,
  title,
}: LetterEditorProps) {
  const router = useRouter();
  const profile = useProfile();
  const [employeeId, setEmployeeId] = useState(doc?.employeeId ?? "");
  const [issueDate, setIssueDate] = useState(doc?.issueDate ?? todayISO());
  /**
   * The body is edited as one document, not a stack of boxes: it is *stored* as
   * a paragraph array but *edited* as a single pane, with a blank line as the
   * separator.
   *
   * The raw text is the state, and the array is derived from it — never the
   * other way around. Round-tripping (split → trim → join) on every keystroke
   * ate any character the trim touched, so a trailing space vanished as soon as
   * it was typed and words ran together.
   */
  const [bodyText, setBodyText] = useState(() =>
    (doc?.bodyParagraphs ?? []).join("\n\n"),
  );
  const bodyParagraphs = splitParagraphs(bodyText);
  const [bulletSections, setBulletSections] = useState<
    LetterDocument["bulletSections"]
  >(doc?.bulletSections ?? []);
  /**
   * Stored text overrides. Only what has actually been edited lives here —
   * every input renders `content[key] ?? resolved[key]`, so an untouched field
   * keeps resolving its default (and keeps following the employee's engagement
   * type). Finalize freezes the resolved lot onto the document.
   */
  // Picking an employee rewrites the subject, the body and the pay figure in
  // one go. The pulse says which action did that.
  const [seeding, pulseSeeding] = usePulse();
  const [content, setContent] = useState<DocContent>(doc?.content ?? {});
  const patchContent: ContentPatch = (patch) =>
    setContent((prev) => ({ ...prev, ...patch }));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const employee = employees.find((e) => e.id === employeeId);
  const heading = workspaceTitle(title, DOC_TYPES[type].label, employee?.name);
  const employeeSnapshot: EmployeeSnapshot = employee
    ? snapshotOf(employee)
    : (doc?.employeeSnapshot ?? EMPTY_SNAPSHOT);

  /**
   * Derived from the employee, never held in state — same rule as the snapshot
   * above and as the slip's earnings: on a draft, anything taken from the
   * employee record stays taken from it, and only finalize freezes. Held in
   * state it went stale the moment a salary was corrected.
   *
   * Only the offer letter records it, and no sheet prints it — the figure a
   * letter *shows* is prose inside `bodyParagraphs`, which is edited text and
   * so can only be re-seeded by re-picking the employee.
   */
  const payAmountPaise =
    type === "OFR"
      ? (employee?.payAmountPaise ?? doc?.payAmountPaise)
      : doc?.payAmountPaise;

  // Selecting an employee seeds the editable body from the default content for
  // this letter type + their engagement type (intern/employee wording).
  const onSelectEmployee = (id: string) => {
    setEmployeeId(id);
    const e = employees.find((emp) => emp.id === id);
    if (e) {
      pulseSeeding();
      const seeded = seedContent(type, e);
      setBodyText(seeded.bodyParagraphs.join("\n\n"));
      setBulletSections(seeded.bulletSections);
      patchContent({ subject: seeded.subject });
    }
  };

  const previewDoc: LetterDocument = {
    id: doc?.id ?? "preview",
    studioSnapshot: doc?.studioSnapshot ?? studio,
    type,
    status: doc?.status ?? "draft",
    employeeId,
    employeeSnapshot,
    issueDate,
    bodyParagraphs,
    bulletSections,
    payAmountPaise,
    content,
    lineItems: [],
    gstRatePercent: 0,
    createdAt: doc?.createdAt ?? 0,
    updatedAt: 0,
  };

  // What the sheet will print, so an input shows the real words rather than a
  // blank box. Resolved from the preview document, which already carries the
  // live employee and studio.
  const resolved = contentOf(previewDoc, DOC_TYPES[type]);

  // `employeeId` belongs in the payload as well as the positional argument:
  // `letterDraftSchema` requires it, and omitting it failed `safeParse` on
  // every save with a bare "Invalid input."
  const buildPayload = () => ({
    employeeId,
    issueDate,
    bodyParagraphs,
    bulletSections,
    payAmountPaise,
    content,
  });

  /** The letter writes itself — see `useDraftAutosave`. */
  const autosave = useDraftAutosave({
    typeCode: type,
    initialDocId: doc?.id,
    recipientId: employeeId,
    payload: buildPayload(),
  });
  const { docId, setServerError } = autosave;

  const onFinalize = async () => {
    if (!docId) return;
    setServerError(null);
    setIsSubmitting(true);
    // Freeze before flushing — see the note in `DocumentEditor.onFinalize`.
    autosave.freeze();
    try {
      if (!(await autosave.flush())) {
        autosave.thaw();
        return;
      }
      const result = await finalizeDocument(docId);
      if (!result.success) {
        setServerError(result.error ?? "Something went wrong.");
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
    setServerError(null);
    setIsSubmitting(true);
    autosave.freeze();
    try {
      const result = await deleteDraftAction(docId);
      if (!result.success) {
        setServerError(result.error ?? "Something went wrong.");
        autosave.thaw();
        return;
      }
      router.push("/");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateBulletItem = (si: number, ii: number, value: string) =>
    setBulletSections((prev) =>
      prev.map((s, j) =>
        j === si
          ? { ...s, items: s.items.map((it, k) => (k === ii ? value : it)) }
          : s,
      ),
    );
  const updateBulletHeading = (si: number, value: string) =>
    setBulletSections((prev) =>
      prev.map((s, j) => (j === si ? { ...s, heading: value } : s)),
    );
  const addBulletItem = (si: number) =>
    setBulletSections((prev) =>
      prev.map((s, j) => (j === si ? { ...s, items: [...s.items, ""] } : s)),
    );
  const removeBulletItem = (si: number, ii: number) =>
    setBulletSections((prev) =>
      prev.map((s, j) =>
        j === si ? { ...s, items: s.items.filter((_, k) => k !== ii) } : s,
      ),
    );

  return (
    <DocumentWorkspace
      title={heading}
      status={<AutosaveStatus autosave={autosave} recipient="employee" />}
      // Feed the flat block list, not the monolithic sheet: the preview packs
      // blocks into A4 pages, and a single over-tall block would be clipped to
      // its first page. Offer letters pin their black cover as page 1.
      coverFirst={type === "OFR"}
      firstPageClassName={type === "OFR" ? LETTER_COVER_CLASSNAME : undefined}
      selfPaddedSheet={false}
      // Letters print roomier pages than the shared A4 margin. The pair must
      // agree — `pagePaddingY` is the height pagination reserves.
      pagePadding={LETTER_PADDING}
      pagePaddingY={LETTER_PADDING_Y}
      preview={letterBlocks(previewDoc)}
    >
      {/* No longer submits — the draft writes itself. See `DocumentEditor`. */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col gap-4"
        noValidate
      >
        <FieldGroup size="form">
          <EditorSection
            title="Recipient & date"
            description="Who it is for, and when"
            defaultOpen
          >
            <Field>
              <FieldLabel htmlFor="letter-employee">
                Employee {seeding ? <Spinner className="size-3.5" /> : null}
              </FieldLabel>
              <Combobox
                id="letter-employee"
                size="form"
                options={employees.map((e) => ({
                  value: e.id,
                  label: `${e.name} · ${e.role}`,
                }))}
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
          </EditorSection>

          <EditorSection
            title="Letter"
            description="Subject and body"
            defaultOpen
          >
            <ContentText
              id="letter-subject"
              label="Subject"
              value={shown(content, resolved, "subject")}
              onChange={(subject) => patchContent({ subject })}
            />

            <Field>
              <FieldInfo
                htmlFor="letter-body"
                label="Letter body"
                info={`One blank line starts a new paragraph. {name} is replaced with the employee's name.`}
                infoLabel="How is the letter body formatted?"
              />
              <Textarea
                id="letter-body"
                rows={18}
                className="font-normal leading-relaxed"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
              />
            </Field>

            <ContentText
              id="letter-closing-line"
              label="Closing line"
              description="Printed after the listed sections, above the signature rule. Leave empty for none."
              value={shown(content, resolved, "closingLine")}
              onChange={(closingLine) => patchContent({ closingLine })}
            />
          </EditorSection>

          {bulletSections.length > 0 ? (
            <EditorSection
              title="Bullet sections"
              description="Listed points under the body"
            >
              {bulletSections.map((section, si) => (
                <fieldset
                  key={si}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4"
                >
                  <legend className="px-1 text-sm font-medium">
                    Bullet section {si + 1}
                  </legend>
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
                        onChange={(e) =>
                          updateBulletItem(si, ii, e.target.value)
                        }
                      />
                      <RemoveButton
                        label={`Remove bullet ${ii + 1} in section ${si + 1}`}
                        onConfirm={() => removeBulletItem(si, ii)}
                      />
                    </div>
                  ))}
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addBulletItem(si)}
                    >
                      Add bullet
                    </Button>
                  </div>
                </fieldset>
              ))}
            </EditorSection>
          ) : null}

          <EditorSection title="Heading" description="Masthead and sub-heading">
            <ContentText
              id="letter-masthead"
              label="Masthead"
              value={shown(content, resolved, "masthead")}
              onChange={(masthead) => patchContent({ masthead })}
            />
            {type === "OFR" ? null : (
              <ContentText
                id="letter-subheading"
                label="Sub-heading"
                value={shown(content, resolved, "subheading")}
                onChange={(subheading) => patchContent({ subheading })}
              />
            )}
          </EditorSection>

          <EditorSection
            title="Signature"
            description="Acknowledgement and signatory"
          >
            {type === "OFR" ? (
              <ContentText
                id="letter-acknowledgement"
                label="Acknowledgement"
                description="{name} is replaced with the employee’s name."
                rows={3}
                value={shown(content, resolved, "acknowledgement")}
                onChange={(acknowledgement) =>
                  patchContent({ acknowledgement })
                }
              />
            ) : null}
            <ContentText
              id="letter-signatory-name"
              label="Signatory"
              value={shown(content, resolved, "signatoryName")}
              onChange={(signatoryName) => patchContent({ signatoryName })}
            />
            <ContentText
              id="letter-signatory-title"
              label="Designation"
              value={shown(content, resolved, "signatoryTitle")}
              onChange={(signatoryTitle) => patchContent({ signatoryTitle })}
            />
            <ContentText
              id="letter-signatory-qualifier"
              label="Qualifier"
              value={shown(content, resolved, "signatoryQualifier")}
              onChange={(signatoryQualifier) =>
                patchContent({ signatoryQualifier })
              }
            />
          </EditorSection>

          {/* Every letter prints these two lines, so every letter can edit them. */}
          <EditorSection
            title="Footer"
            description="Registered office and website"
          >
            <ContentText
              id="letter-registered-office"
              label="Registered office line"
              rows={3}
              value={shown(content, resolved, "registeredOffice")}
              onChange={(registeredOffice) =>
                patchContent({ registeredOffice })
              }
            />
            <ContentText
              id="letter-website"
              label="Website"
              value={shown(content, resolved, "website")}
              onChange={(website) => patchContent({ website })}
            />
          </EditorSection>

          <SaveError autosave={autosave} />

          <div className="flex flex-wrap gap-2">
            {docId ? (
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
                  description={DELETE_DRAFT_CONSEQUENCE}
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

      <UnsavedChangesDialog autosave={autosave} label="letter" />
    </DocumentWorkspace>
  );
}
