"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Controller, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  deleteDraftAction,
  finalizeDocument,
} from "@/server/actions/documents";
import { computeTotals } from "@/lib/domain/money";
import { contentOf, type DocContent } from "@/lib/domain/docContent";
import { DELETE_DRAFT_CONSEQUENCE, DOC_TYPES } from "@/lib/domain/registry";
import { DerivedNote } from "@/components/ui/derived-note";
import { gstStateName } from "@/lib/domain/gstStates";
import {
  placeOfSupplyOf,
  zeroRatingEndorsement,
  zeroRatingLabel,
} from "@/lib/domain/placeOfSupply";
import { gstTreatmentOf } from "@/lib/domain/gstTreatment";
import { rateUnitOf, type ContractService } from "@/lib/domain/service";
import { addDays } from "@/lib/domain/dates";
import {
  clientSnapshotOf,
  type ClientRecord,
  type ClientSnapshot,
  type CreditNoteDocument,
  type InvoiceDocument,
  type ReceiptDocument,
} from "@/lib/domain/types";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { FieldRow } from "@/components/ui/field-row";
import { Input } from "@/components/ui/input";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import FieldInfo, { InfoTip } from "@/components/form/FieldInfo";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DocumentSheet from "@/components/docs/sheets/DocumentSheet";
import DocumentWorkspace from "@/components/docs/DocumentWorkspace";
import LineItemsEditor from "./LineItemsEditor";
import { Spinner } from "@/components/ui/spinner";
import { usePulse } from "@/lib/useMinimumDuration";
import EditorSection from "./EditorSection";
import WordingDrawer from "./WordingDrawer";
import {
  ContentText,
  TermsFields,
  shown,
  type ContentPatch,
} from "./ContentFields";
import InvoicePicker from "./InvoicePicker";
// import TotalsPanel from './TotalsPanel';
import { paiseToRupees } from "@/lib/domain/money";
import type { InvoiceOption, PaymentMethod } from "@/lib/domain/types";
import type { StudioInfo } from "@/lib/domain/studio";
import {
  toPayload,
  useDocumentForm,
  type EditorFormValues,
} from "./useDocumentForm";
import { useDraftAutosave } from "./useDraftAutosave";
import { AutosaveStatus, SaveError, UnsavedChangesDialog } from "./draftStatus";
import { workspaceTitle } from "../workspaceTitle";
import { numericField } from "@/components/form/inputFilters";
import { useProfile } from "@/lib/useProfile";

/** DocumentEditor only handles financial docs; contracts use ContractEditor. */
type FinancialDocument = InvoiceDocument | ReceiptDocument | CreditNoteDocument;
type FinancialTypeCode = FinancialDocument["type"];

const EMPTY_SNAPSHOT: ClientSnapshot = {
  name: "",
  address: "",
  email: "",
  phone: "",
};

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
    id: doc?.id ?? "preview",
    // A finalized document prints its own frozen studio details; a draft shows
    // whatever the settings say right now.
    studioSnapshot: doc?.studioSnapshot ?? studio,
    status: doc?.status ?? ("draft" as const),
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

  if (typeCode === "INV") {
    return { ...base, type: "INV", dueDate: fields.dueDate };
  }
  if (typeCode === "CRN") {
    return {
      ...base,
      type: "CRN",
      against: {
        invoiceNumber: fields.againstInvoiceNumber,
        invoiceDate: fields.againstInvoiceDate,
        invoiceId: fields.againstInvoiceId,
      },
      reason: fields.creditReason,
    };
  }
  return {
    ...base,
    type: "REC",
    payment: fields.payment ?? { date: "", method: "Bank Transfer" },
  };
}

interface DocumentEditorProps {
  typeCode: FinancialTypeCode;
  clients: ClientRecord[];
  /**
   * The service catalogue, for seeding line items and for the add-line menu.
   *
   * Passed to the editor of an **existing** document as well as a new one,
   * which is the opposite call from `ContractEditor`'s clause library, and the
   * difference is what a document does with the thing it takes. A contract
   * *freezes a copy* of a Part, so a live library there would rewrite an
   * agreement already signed (`CONTEXT.md` §5c). An invoice line is plain text
   * the operator owns the moment it lands: nothing on the document points back
   * at a Service, and nothing re-reads one. So the catalogue is a source of
   * words and a rate, and stale words are the only risk it carries.
   *
   * Optional so the slips and the tests that predate it keep working.
   */
  services?: ContractService[];
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

const PAYMENT_METHODS: PaymentMethod[] = [
  "Bank Transfer",
  "UPI",
  "Cash",
  "Card",
  "Other",
];

export default function DocumentEditor({
  typeCode,
  clients,
  services,
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
  const patchContent: ContentPatch = (patch) =>
    setContent((prev) => ({ ...prev, ...patch }));

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
  /**
   * The rate to come back to. Turning GST off zeroes the rate, and turning it
   * back on used to leave the zero standing, so a document toggled twice was
   * silently a 0% invoice with a place of supply on it. The last rate that was
   * actually charged is the only honest answer to "back on at what?"; the
   * derived treatment is the fallback for a document that has never had one.
   */
  const lastRate = useRef(
    doc && doc.gstRatePercent > 0 ? String(doc.gstRatePercent) : "18",
  );
  const setGstApplies = (next: boolean) => {
    setGstAppliesState(next);
    if (next) {
      setValue("gstLabel", "", { shouldDirty: true });
      setValue("gstRatePercent", lastRate.current, { shouldDirty: true });
    } else {
      const current = getValues("gstRatePercent");
      if (current && current !== "0") lastRate.current = current;
      setValue("gstRatePercent", "0", { shouldDirty: true });
      setValue("placeOfSupplyStateCode", "", { shouldDirty: true });
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
   * How this client's supply is taxed, and whether that is anybody's to change.
   *
   * The same move as place of supply, one field over. Whether GST applies and
   * at what rate were both editable, and for an Indian recipient neither is a
   * choice: the tax is charged under CGST s.9 whatever the invoice says, and
   * the rate follows the classification of the service. Three controls that are
   * each legally wrong to touch is three chances to issue a wrong invoice.
   *
   * An export stays editable: nothing in Indian law fixes what a foreign
   * invoice charges. See `gstTreatment.ts`.
   */
  const treatment = selectedClient ? gstTreatmentOf(selectedClient) : null;
  const [gstOverridden, setGstOverridden] = useState(
    Boolean(doc?.gstOverrideReason),
  );
  const taxLocked = Boolean(treatment?.locked) && !gstOverridden;

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
  /**
   * What `zeroRatingLabel` would say for this client, so the note under the GST
   * note can tell "the app filled this in" from "somebody typed it". Recomputed
   * rather than flagged, for the same reason the due date is: the answer stops
   * being true the moment the text is edited, and no state has to remember it.
   */
  const zeroRatedLabel = selectedClient
    ? zeroRatingLabel({
        addressParts: selectedClient.addressParts,
        sez: selectedClient.tax?.sez,
      })
    : undefined;

  /**
   * The client's engaged services, as rows ready to be a line item.
   *
   * The whole reason onboarding asks which services a client is on. A retainer
   * is the same amount every month against the same description, and it was
   * being re-typed from memory into every invoice, which is the shape of thing
   * `PRINCIPLES.md` rule 3 exists to stop.
   *
   * The rate is the client's own agreed one where they have it, and the
   * catalogue's list price otherwise. A blank rate on the client record means
   * "the catalogue rate", deliberately not zero (`ServicesStep`), so a service
   * with neither leaves the line at nothing and the operator fills it in, which
   * is what "quoted per engagement" means.
   *
   * A stored code with no catalogue row is skipped rather than rendered as a
   * blank line. That case already exists: `ServicesStep` drops it from its own
   * summary the same way.
   */
  const engagedRows = (selectedClient?.commercial?.services ?? []).flatMap(
    (engaged) => {
      const service = services?.find((s) => s.code === engaged.code);
      if (!service) return [];
      const ratePaise = engaged.ratePaise ?? service.ratePaise;
      return [
        {
          service,
          item: {
            description: service.name,
            /* No `detail`. The Service's overview used to seed one and the
               sheet printed it under the description: a second, longer account
               of the same supply that no rule asks for and that can disagree
               with the first. The name, the rate and the SAC are what the
               catalogue is for. */
            rate: ratePaise ? paiseToRupees(ratePaise) : "",
            qty: "1",
            sacCode: service.sacCode ?? "",
          },
        },
      ];
    },
  );

  /**
   * What the Add menu offers: this client's own services, and nothing else.
   *
   * The whole catalogue used to follow them, which read as a price list on a
   * document that bills one client — twenty-two rows of things nobody agreed
   * to, under a heading that made them look agreed. Work sold after onboarding
   * has no rate on the record and no line in the contract, so it is a custom
   * line until the record catches up, and that is the truer shape of it.
   *
   * A service already on the document drops out. The retainers are seeded onto
   * a blank invoice, so this list is normally the one-off work: the build, the
   * audit, the set-up.
   */
  const onDocument = new Set(
    values.lineItems.map((item) => item.description.trim().toLowerCase()),
  );
  const linePresets = engagedRows
    .filter(({ service }) => !onDocument.has(service.name.trim().toLowerCase()))
    .map(({ service, item }) => ({
      group: service.scheduleKey === "retainer" ? "Retainer" : "Engaged",
      label: `${service.name} (${rateUnitOf(service.scheduleKey)})`,
      item,
    }));

  const seededClientId = useRef<string | null>(
    doc ? (doc.clientId ?? null) : null,
  );
  useEffect(() => {
    if (!selectedClient || seededClientId.current === selectedClient.id) return;
    seededClientId.current = selectedClient.id;

    const terms = selectedClient.commercial?.paymentTermsDays;
    if (spec.hasDueDate && terms !== undefined && !values.dueDate) {
      setValue("dueDate", addDays(values.issueDate, terms), {
        shouldDirty: true,
      });
    }

    const zeroRated = zeroRatingLabel({
      addressParts: selectedClient.addressParts,
      sez: selectedClient.tax?.sez,
    });
    if (zeroRated) {
      setGstAppliesState(false);
      setValue("gstRatePercent", "0", { shouldDirty: true });
      setValue("gstLabel", zeroRated, { shouldDirty: true });
      /*
        And the statutory endorsement beside the explanation. `contentOf` can
        default the export case on its own — place of supply 96 says so — but an
        SEZ supply is zero-rated because the *client record* says the client is
        an SEZ unit, and content resolution never reads the client. So it is
        seeded here, the same way and at the same moment as `gstLabel`.
      */
      const endorsement = zeroRatingEndorsement({
        addressParts: selectedClient.addressParts,
        sez: selectedClient.tax?.sez,
      });
      if (endorsement) patchContent({ exportEndorsement: endorsement });
    }

    /**
     * Seed the retainer lines, and only onto an untouched list.
     *
     * Retainers alone: those are the lines that are the same every month and
     * are therefore the ones worth deriving. A build or an audit is billed once,
     * on a date nothing here knows, so it is offered in the menu instead of
     * assumed onto the document.
     *
     * `blank` is the guard that matters. Changing the client on an invoice that
     * has been written must not throw away what was written, so this only fires
     * while every row is still the empty default. The same rule as
     * `SlipEditor`'s earnings seed, for the same reason.
     */
    /**
     * An agreed billing currency is worth saying, and it is still not a second
     * currency in the arithmetic. A GST document shows tax in INR whatever was
     * agreed (`currency.ts`), so this states both facts instead of pretending
     * to convert between them.
     */
    const agreed = selectedClient.commercial?.currency;
    if (agreed && agreed !== "INR") {
      patchContent({
        currencyLine: `All amounts are in Indian Rupees (INR). The agreed billing currency is ${agreed}.`,
      });
    }

    const retainers = engagedRows.filter(
      (r) => r.service.scheduleKey === "retainer",
    );
    const blank = values.lineItems.every(
      (item) => !item.description.trim() && !item.rate.trim(),
    );
    if (retainers.length > 0 && blank && !spec.creditsInvoice) {
      pulseSeeding();
      lineItems.replace(retainers.map((r) => r.item));
    }
  }, [
    engagedRows,
    lineItems,
    patchContent,
    pulseSeeding,
    selectedClient,
    setValue,
    spec.creditsInvoice,
    spec.hasDueDate,
    values.dueDate,
    values.issueDate,
    values.lineItems,
  ]);

  /**
   * Keep the stored code equal to the derived one.
   *
   * The field is read-only, so nothing else writes it, and a document must
   * *carry* the code rather than recompute it at print time: the client's GSTIN
   * can be corrected next year and an issued invoice may not move.
   *
   * `placeOfSupplyOverrideReason` is cleared on sight. The override that wrote
   * it is gone, and a stale reason on a draft would freeze onto the document at
   * finalize as a justification for a departure that is not there.
   */
  useEffect(() => {
    if (!gstApplies) return;
    const next = derivedPlaceOfSupply.code ?? "";
    if (values.placeOfSupplyStateCode !== next) {
      setValue("placeOfSupplyStateCode", next, { shouldDirty: true });
    }
    if (values.placeOfSupplyOverrideReason) {
      setValue("placeOfSupplyOverrideReason", "", { shouldDirty: true });
    }
  }, [
    derivedPlaceOfSupply.code,
    gstApplies,
    setValue,
    values.placeOfSupplyOverrideReason,
    values.placeOfSupplyStateCode,
  ]);

  /**
   * Keep the tax fields equal to the derived treatment while it is locked.
   *
   * The read-only inputs below show the derived answer, but showing is not
   * storing: what finalize reads, what the sheet prints and what `computeTotals`
   * charges is the form value. Without this a draft written before the client's
   * GSTIN was recorded would keep whatever rate it was left on and merely look
   * correct. Deps are primitives because `treatment` is rebuilt every render.
   */
  const lockedApplies = treatment?.applies;
  const lockedRate = treatment?.ratePercent;
  const lockedLabel = treatment?.label ?? "";
  /*
    The endorsement is the one part of the treatment that lives in `content`
    rather than in the form, so the assertion above never reached it: it was
    written when a zero-rated client was picked and nothing ever unwrote it.
    What that printed is the worst kind of wrong on a tax invoice — an IGST-
    charged domestic supply carrying Rule 46's export declaration, a statement
    that is false on its face. `undefined` here is a *reset* rather than a blank
    override, so `contentOf` falls back to the document's own answer, which is
    the endorsement for place of supply 96 and nothing otherwise.
  */
  const lockedEndorsement = selectedClient
    ? (zeroRatingEndorsement({
        addressParts: selectedClient.addressParts,
        sez: selectedClient.tax?.sez,
      }) ?? undefined)
    : undefined;
  useEffect(() => {
    if (!taxLocked || lockedApplies === undefined) return;
    const rate = String(lockedApplies ? lockedRate : 0);
    if (values.gstRatePercent !== rate)
      setValue("gstRatePercent", rate, { shouldDirty: true });
    if (gstApplies !== lockedApplies) setGstAppliesState(lockedApplies);
    if ((values.gstLabel ?? "") !== lockedLabel) {
      setValue("gstLabel", lockedLabel, { shouldDirty: true });
    }
    if (content.exportEndorsement !== lockedEndorsement)
      patchContent({ exportEndorsement: lockedEndorsement });
    if (values.gstOverrideReason)
      setValue("gstOverrideReason", "", { shouldDirty: true });
    // `patchContent` is a fresh closure each render and only ever calls the
    // state setter, so it is deliberately not a dependency.
  }, [
    content.exportEndorsement,
    gstApplies,
    lockedApplies,
    lockedEndorsement,
    lockedLabel,
    lockedRate,
    setValue,
    taxLocked,
    values.gstLabel,
    values.gstOverrideReason,
    values.gstRatePercent,
  ]);

  const previewDoc = buildPreviewDoc(
    typeCode,
    values,
    clients,
    doc,
    studio,
    content,
  );
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
  const { docId, setServerError } = autosave;

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
        setServerError(result.error ?? "Something went wrong.");
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
      setValue("againstInvoiceId", "", { shouldDirty: true });
      setValue("againstInvoiceNumber", "", { shouldDirty: true });
      setValue("againstInvoiceDate", "", { shouldDirty: true });
      return;
    }

    pulseSeeding();
    setValue("againstInvoiceId", invoice.id, { shouldDirty: true });
    setValue("againstInvoiceNumber", invoice.number, { shouldDirty: true });
    // Rule 53(1A)(f) wants the credited invoice's date as well as its number.
    // Harmless on a receipt, which never reads it.
    setValue("againstInvoiceDate", invoice.issueDate, { shouldDirty: true });
    setValue("gstRatePercent", String(invoice.gstRatePercent), {
      shouldDirty: true,
    });
    setValue("placeOfSupplyStateCode", invoice.placeOfSupplyStateCode ?? "", {
      shouldDirty: true,
    });
    setValue("gstLabel", invoice.gstLabel ?? "", { shouldDirty: true });
    lineItems.replace(
      invoice.lineItems.map((item) => ({
        description: item.description,
        detail: item.detail ?? "",
        rate: item.ratePaise > 0 ? paiseToRupees(item.ratePaise) : "",
        qty: String(item.qty),
        sacCode: item.sacCode ?? "",
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
    if (getValues("againstInvoiceId")) {
      setValue("againstInvoiceId", "", { shouldDirty: true });
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
      setServerError(result.error ?? "Something went wrong.");
      autosave.thaw();
      return;
    }
    router.push("/");
  };

  /**
   * Finalize and Delete, pinned under the rail's scroll rather than at the end
   * of the form.
   *
   * The form is as long as the document has words, so the one action that
   * issues the thing was wherever the scroll happened to leave it. Same shape
   * as `ContractEditor`'s footer, for the same reason, and the asymmetry is
   * deliberate: Finalize takes the row and Delete is an icon, because one of
   * them is what this page is for and the other is the way out.
   *
   * Both need a row to act on, which exists from the first autosave, not from
   * the route.
   */
  const railFooter = docId ? (
    <div className="flex items-center gap-2">
      <ConfirmActionButton
        label="Finalize & assign number"
        title="Finalize this document?"
        description="A number will be assigned and the document becomes immutable. Corrections after this mean duplicating it as a new draft."
        confirmLabel="Finalize"
        onConfirm={onFinalize}
        disabled={isSubmitting}
        /* Filled, not outlined. Every other control in the rail is an input or
           an outline button, so an outlined Finalize was the same weight as the
           thing beside it and the page's one irreversible action read as one
           more field. */
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
      status={<AutosaveStatus autosave={autosave} />}
      railFooter={railFooter}
      preview={<DocumentSheet doc={previewDoc} />}
    >
      {/* Not a submitting form any more — the draft writes itself. `onSubmit`
          is swallowed so a stray Enter in a text field cannot reload the page. */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col gap-4"
        noValidate
      >
        <FieldGroup size="form">
          {/*
            Who the document is for and when it was issued are not one topic
            among several: they are the document's identity, and everything
            below derives from them: the tax treatment, the due date, the line
            items. So they sit above the sections rather than inside a card that
            can be collapsed away from the things it decides.
          */}
          <Field>
            <FieldLabel htmlFor="doc-client">Client</FieldLabel>
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Combobox
                  id="doc-client"
                  size="form"
                  options={clients.map((client) => ({
                    value: client.id,
                    label: client.name,
                  }))}
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
                {/* No note saying where the date came from. Unlike place of
                    supply, the derived value here *is* the thing on screen: a
                    date the reader can check against the invoice in front of
                    them, not a two-digit code they cannot. */}
              </Field>
            ) : null}
          </FieldRow>

          <LineItemsEditor
            className="border-t border-border pt-6"
            control={control}
            register={register}
            fieldArray={lineItems}
            showSac
            lockNames
            presets={linePresets}
          />

          {/*
            Tax, and not inside a collapsible card.

            Every field here is either derived from the client record or the one
            departure from it that has to be justified, and none of it is a
            topic somebody folds away: it is the part of an invoice that is
            wrong in a way nobody notices until a return is filed. So it sits in
            the open beside the line items it is charged on.
          */}
          {/*
            No legend. "Tax" over a GST rate and a place of supply names what
            the reader is already looking at, and a heading per block turned a
            rail of six fields into a rail of six headings. The hairline is the
            separation, and it says the same thing without a word.
          */}
          <FieldSet className="border-t border-border pt-4">
            {/*
              GST either applies or it doesn't — a rate, a place of supply and a
              "GST not applicable" note are never all true of the same document.
              Showing them together invited exactly that contradiction onto an
              issued invoice, so one switch picks the branch.
            */}
            {taxLocked ? null : (
              <Field orientation="horizontal">
                <FieldLabel htmlFor="doc-gst-applies">GST applies</FieldLabel>
                <Switch
                  id="doc-gst-applies"
                  checked={gstApplies}
                  onCheckedChange={setGstApplies}
                />
              </Field>
            )}

            {gstApplies ? (
              <FieldRow>
                <Field>
                  <FieldLabel htmlFor="doc-gst-rate">GST rate (%)</FieldLabel>
                  {/*
                    One input, `readOnly` when it is locked, never two inputs
                    swapped by a branch. Rendering `value=` in one branch and
                    `{...register()}` in the other put a controlled and an
                    uncontrolled input in the same position, so React saw the
                    field change kind the moment the lock was lifted and logged
                    it three times over. The effect above keeps the form value
                    equal to the derivation, which is what makes one input
                    enough.
                  */}
                  <Input
                    id="doc-gst-rate"
                    size="form"
                    readOnly={taxLocked}
                    {...numericField(register("gstRatePercent"))}
                  />
                </Field>
                <Field>
                  <FieldInfo
                    htmlFor="doc-place-of-supply"
                    label="Place of supply"
                    info="Derived from the client: their GSTIN's first two digits, or the state on their address. It decides the CGST/SGST versus IGST split, so it is never typed by hand."
                    infoLabel="Where does place of supply come from?"
                  />
                  {/*
                    Read-only, with no way out of it. There was an override here
                    with a recorded reason, which is `PRINCIPLES.md` rule 3's
                    stated exception, and it was removed on the user's
                    instruction: the code comes from the recipient's
                    registration and an invoice that says another state is a
                    wrong return, not a preference. What that gives up is the
                    genuine s.12(3) case (a supply relating to immovable
                    property in another state). Qera does not make one, and the
                    day it does this field comes back rather than being typed
                    over quietly.
                  */}
                  <Input
                    id="doc-place-of-supply"
                    size="form"
                    readOnly
                    value={
                      derivedPlaceOfSupply.code
                        ? `${derivedPlaceOfSupply.code} · ${gstStateName(derivedPlaceOfSupply.code) ?? ""}`
                        : ""
                    }
                    placeholder="Pick a client first"
                  />
                </Field>
              </FieldRow>
            ) : (
              <Field>
                <FieldLabel htmlFor="doc-gst-label">GST note</FieldLabel>
                {/* Read-only for an SEZ unit, and that is not the same call as
                  an export. An SEZ supply is zero-rated *because the client
                  record says the client is an SEZ unit*, so the wording is as
                  derived as the rate. An export's recipient has their own
                  regime, which this cannot know about, so the line stays theirs
                  to write. */}
                <Input
                  id="doc-gst-label"
                  size="form"
                  readOnly={taxLocked}
                  {...register("gstLabel")}
                />
                {/* The zero-rating wording arrives on its own when the recipient
                  is an SEZ unit or overseas, and it is a legal claim about why
                  the rate is nil, not a placeholder. A reader who does not know
                  where it came from has no way to tell those apart. */}
                {values.gstLabel && values.gstLabel === zeroRatedLabel ? (
                  <DerivedNote>
                    Filled from the client record: this is a zero-rated supply
                    under an LUT, not an exemption.
                  </DerivedNote>
                ) : null}
              </Field>
            )}

            {/*
            The one way out, and it is deliberately one switch rather than three
            fields quietly becoming editable. `PRINCIPLES.md` rule 3's exception
            is *derived by default, override explicit and recorded*, so the
            reason is required and finalize refuses without it
            (`gstTreatmentMismatch`). A supply really can be exempt; what is not
            allowed is an invoice that silently charges something else.
          */}
            {treatment?.locked ? (
              <>
                <Field orientation="horizontal">
                  {/* `flex-1`, so this switch lands under the GST-applies
                      switch rather than halfway across the row. A bare
                      `FieldLabel` grows on its own; this wrapper has to be
                      told. */}
                  <FieldInfo
                    className="flex-1"
                    htmlFor="doc-gst-override"
                    label="Edit GST"
                    info="The rate and whether GST applies are derived from the client record, and for a domestic supply neither is optional: the tax is charged under CGST s.9 whatever the invoice says, and the rate follows how the service is classified. Change it only where the supply is genuinely exempt or rated differently, and say why."
                    infoLabel="Why is this locked?"
                  />
                  <Switch
                    id="doc-gst-override"
                    checked={gstOverridden}
                    onCheckedChange={setGstOverridden}
                  />
                </Field>

                {gstOverridden ? (
                  <Field>
                    <FieldInfo
                      htmlFor="doc-gst-reason"
                      label="Why"
                      info="Recorded on the document and frozen with it. Finalizing is refused without it."
                      infoLabel="Why is a reason required?"
                    />
                    <Input
                      id="doc-gst-reason"
                      size="form"
                      placeholder="e.g. exempt under Notification 12/2017, entry 66 (educational services)"
                      {...register("gstOverrideReason")}
                    />
                  </Field>
                ) : null}
              </>
            ) : null}
          </FieldSet>

          {spec.creditsInvoice ? (
            /*
              A credit note's identity, not one topic among several: which
              invoice it reduces is what makes it a credit note rather than a
              second bill, and s.34 gives it no meaning without one. Picking the
              invoice copies its lines and its whole tax position, because a
              credit note reverses tax that was actually charged and inventing a
              different rate here would put a figure in the return that matches
              nothing.
            */
            <FieldSet className="border-t border-border pt-4">
              <Field>
                <div className="flex items-center gap-1.5">
                  <FieldLabel htmlFor="doc-credit-invoice-picker">
                    Invoice being credited{" "}
                    {seeding ? <Spinner className="size-3.5" /> : null}
                  </FieldLabel>
                  <InfoTip
                    info="Fills in the line items and the whole tax position from that invoice. Section 34 needs the credit note to name the invoice it reduces, by number and date, so both are required before it can be finalized."
                    label="Why must a credit note name an invoice?"
                  />
                </div>
                <InvoicePicker
                  id="doc-credit-invoice-picker"
                  clientId={values.clientId}
                  value={values.againstInvoiceId}
                  onSelect={applyInvoice}
                />
              </Field>

              <FieldRow>
                <Field>
                  <FieldLabel htmlFor="doc-credit-invoice-number">
                    Invoice number
                  </FieldLabel>
                  <Input
                    id="doc-credit-invoice-number"
                    size="form"
                    placeholder="QS-INV-2627-001"
                    {...register("againstInvoiceNumber", {
                      onChange: clearInvoiceLink,
                    })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="doc-credit-invoice-date">
                    Invoice date
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="againstInvoiceDate"
                    render={({ field }) => (
                      <DatePicker
                        id="doc-credit-invoice-date"
                        size="form"
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    )}
                  />
                </Field>
              </FieldRow>

              <Field>
                <FieldInfo
                  htmlFor="doc-credit-reason"
                  label="Reason"
                  info="Printed on the note. Not one of Rule 53's mandatory particulars, but it is what makes the credit reconcilable against the invoice a year later."
                  infoLabel="Why state a reason?"
                />
                <Input
                  id="doc-credit-reason"
                  size="form"
                  placeholder="e.g. post-supply discount agreed on 20th August 2026"
                  {...register("creditReason")}
                />
              </Field>
            </FieldSet>
          ) : null}

          {spec.hasPayment ? (
            <EditorSection
              title="Payment"
              description="What was received, and against what"
              defaultOpen
            >
              <Field>
                <div className="flex items-center gap-1.5">
                  <FieldLabel htmlFor="doc-against-invoice-picker">
                    Against invoice{" "}
                    {seeding ? <Spinner className="size-3.5" /> : null}
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
                <FieldLabel htmlFor="doc-against-invoice">
                  Invoice number
                </FieldLabel>
                <Input
                  id="doc-against-invoice"
                  size="form"
                  {...register("againstInvoiceNumber", {
                    onChange: clearInvoiceLink,
                  })}
                />
              </Field>

              <FieldRow>
                <Field>
                  <FieldLabel htmlFor="doc-payment-date">
                    Payment date
                  </FieldLabel>
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
                        onValueChange={(v) =>
                          field.onChange(v as PaymentMethod)
                        }
                      >
                        <SelectTrigger
                          id="doc-payment-method"
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
              </FieldRow>

              <Field>
                <FieldLabel htmlFor="doc-payment-ref">Reference</FieldLabel>
                <Input
                  id="doc-payment-ref"
                  size="form"
                  {...register("paymentReference")}
                />
              </Field>
            </EditorSection>
          ) : null}

          {/*
            Everything the document *says*, behind one row. See `WordingDrawer`
            for why it is not four cards in the rail.

            The hairline above it is the same one that separates the line items
            from the tax block: this row opens a different *kind* of thing from
            the fields above it, and without the rule it read as one more field
            in the tax section it happened to follow.
          */}
          <div className="border-t border-border pt-4">
            <WordingDrawer
              label="Wording"
              description="Declarations, terms, heading and footer"
            >
              {/*
              The two statements CGST Rule 46 wants in words. Their own section
              rather than more Terms: a term is something the parties agree to,
              and these are declarations the *supplier* makes about the
              document. Editable because each is a claim about a specific
              supply, and the day one stops being true this is where it gets
              corrected.
            */}
              <EditorSection
                title="Declarations"
                description="Reverse charge, currency, endorsements"
                defaultOpen
              >
                {/* Rule 46's third proviso wants these exact words in capitals on
                  a zero-rated supply, so it prints as its own line rather than
                  inside the sentence the other two share. Blank on a taxed
                  supply, and it prints nothing when it is blank. */}
                <ContentText
                  id="doc-export-endorsement"
                  label="Zero-rating endorsement"
                  value={shown(content, resolved, "exportEndorsement")}
                  onChange={(exportEndorsement) =>
                    patchContent({ exportEndorsement })
                  }
                />
                <ContentText
                  id="doc-copy-marking"
                  label="Copy marking"
                  value={shown(content, resolved, "copyMarking")}
                  onChange={(copyMarking) => patchContent({ copyMarking })}
                />
                <ContentText
                  id="doc-reverse-charge"
                  label="Reverse charge"
                  value={shown(content, resolved, "reverseChargeLine")}
                  onChange={(reverseChargeLine) =>
                    patchContent({ reverseChargeLine })
                  }
                />
                <ContentText
                  id="doc-currency-line"
                  label="Currency"
                  value={shown(content, resolved, "currencyLine")}
                  onChange={(currencyLine) => patchContent({ currencyLine })}
                />
                {/* Rule 46(q)'s statement is not here: it is the last TERMS
                  clause, edited in the Terms section below with the rest. */}
              </EditorSection>

              <EditorSection
                title="Terms"
                description="The clauses at the foot"
              >
                <TermsFields
                  terms={shown(content, resolved, "terms")}
                  onChange={(terms) => patchContent({ terms })}
                />
              </EditorSection>

              <EditorSection
                title="Heading"
                description="The document's own title"
              >
                <ContentText
                  id="doc-masthead"
                  label="Masthead"
                  value={shown(content, resolved, "masthead")}
                  onChange={(masthead) => patchContent({ masthead })}
                />
              </EditorSection>

              {/* No notes field: notes were retired from the sheet, and an input
                for something the document never prints is a trap. */}
              <EditorSection
                title="Footer"
                description="QR caption and the closing line"
              >
                <ContentText
                  id="doc-qr-caption"
                  label="QR caption"
                  value={shown(content, resolved, "qrCaption")}
                  onChange={(qrCaption) => patchContent({ qrCaption })}
                />
                <ContentText
                  id="doc-thanks"
                  label="Closing line"
                  value={shown(content, resolved, "thanksLine")}
                  onChange={(thanksLine) => patchContent({ thanksLine })}
                />
              </EditorSection>
            </WordingDrawer>
          </div>
        </FieldGroup>
        {/* 
        <TotalsPanel
          totals={totals}
          gstRatePercent={previewDoc.gstRatePercent}
        /> */}

        <SaveError autosave={autosave} />
      </form>

      <UnsavedChangesDialog
        autosave={autosave}
        label={spec.label.toLowerCase()}
      />
    </DocumentWorkspace>
  );
}
