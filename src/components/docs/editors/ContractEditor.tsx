"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { deleteDraftAction, finalizeDocument } from "@/server/actions/documents";
import { formatDisplayDate, todayISO } from "@/lib/domain/dates";
import { DOC_TYPES } from "@/lib/domain/registry";
import { assemble } from "@/lib/domain/contract/assembly";
import {
  blanksOf,
  isUnfilled,
  type BlankValues,
} from "@/lib/domain/contract/blanks";
import { contractScopes } from "@/lib/domain/contract/completeness";
import type { MsaClause } from "@/lib/domain/contract/msa";
import type {
  ContractService,
  LibraryLine,
} from "@/lib/domain/contract/service";
import type { StudioInfo } from "@/lib/domain/studio";
import {
  clientSnapshotOf,
  type ClientRecord,
  type ClientSnapshot,
  type ContractData,
  type ContractDocument,
} from "@/lib/domain/types";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import PartCard from "@/components/contract/PartCard";
import ServiceDialog from "@/components/contract/ServiceDialog";
import ServiceCatalog from "@/components/contract/ServiceCatalog";
import TermsForm from "@/components/contract/TermsForm";
import {
  contractBlocks,
  contractPageProps,
} from "@/components/docs/sheets/ContractSheet";
import DocumentWorkspace from "@/components/docs/DocumentWorkspace";
import {
  ClauseFields,
  ContentText,
  shown,
  type ContentPatch,
} from "./ContentFields";
import { useDraftAutosave } from "./useDraftAutosave";
import { UnsavedChangesDialog } from "./draftStatus";
import { contentOf, type DocContent } from "@/lib/domain/docContent";
import { workspaceTitle } from "../workspaceTitle";
import { useProfile } from '@/lib/useProfile';

const EMPTY_SNAPSHOT: ClientSnapshot = {
  name: "",
  address: "",
  email: "",
  phone: "",
};
const EMPTY_CONTRACT: ContractData = { parts: [], blanks: {}, library: {} };

/** Services → the standing terms → the document. */
type Step = "services" | "terms" | "preview";

interface ContractEditorProps {
  clients: ClientRecord[];
  /** The live services library — the source a Part is copied from. */
  services: ContractService[];
  exclusions: LibraryLine[];
  clientInputs: LibraryLine[];
  /**
   * The live clause library, for a *new* contract only.
   *
   * A new draft copies this onto itself the moment it exists, exactly as it
   * copies a Part from `services`. From then on the contract carries its own
   * clauses and editing the library cannot reach it — which is the same rule
   * `studioSnapshot` enforces for the studio's details and `materialiseContent`
   * for the rest of the wording (CONTEXT.md §5, §5b).
   *
   * Omitted when opening an existing document: it already has its copy, and
   * handing it a fresh one would be the compliance bug this seeds to avoid.
   */
  clauseLibrary?: MsaClause[];
  doc?: ContractDocument | null;
  /** Live studio details, for a draft's preview. See the note in DocumentEditor. */
  studio?: StudioInfo;
  /** Shown in the workspace bar; supplied by the route page. */
  title: string;
}

/**
 * Building a contract, in three passes.
 *
 * Everything used to live in one 384px rail — client, a twenty-two row list, one
 * collapsible per Part holding its blanks *and* its twenty-odd exclusions, then
 * thirty figures of standing terms, the cover and twenty-eight clauses. Each
 * stage now gets the whole card: the library while services are being chosen,
 * the standing terms while they are being set, the document once there is one.
 * The rail carries only what is being decided, and on the last stage only a
 * summary of what has been.
 *
 * The stage is local state rather than a route: every field on all three feeds
 * one `contract` object, and a remount between them would throw it away.
 */
export default function ContractEditor({
  clients,
  services,
  exclusions,
  clientInputs,
  clauseLibrary,
  doc,
  studio,
  title,
}: ContractEditorProps) {
  const router = useRouter();
  const profile = useProfile();
  const [clientId, setClientId] = useState(doc?.clientId ?? "");
  const [issueDate, setIssueDate] = useState(doc?.issueDate ?? todayISO());
  const [contract, setContract] = useState<ContractData>(
    doc?.contract ?? EMPTY_CONTRACT,
  );
  /**
   * Text overrides — see the note in `DocumentEditor`.
   *
   * A new contract starts with the clause library already copied in, so the
   * words it prints are the ones stored today rather than whatever
   * `MSA_CLAUSES` happens to say when it is finalized. An existing document is
   * left exactly as it was saved.
   */
  const [content, setContent] = useState<DocContent>(
    doc?.content ?? (clauseLibrary ? { clauses: clauseLibrary } : {}),
  );
  const [serviceQuery, setServiceQuery] = useState("");
  /** Which Service the dialog is showing, by code. */
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(
    doc?.contract.parts.length ? "preview" : "services",
  );
  const [clausesOpen, setClausesOpen] = useState(false);
  const [termsPrompt, setTermsPrompt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const buildPayload = () => ({ issueDate, contract, content });

  /**
   * The draft writes itself. This editor had that first and alone; the logic now
   * lives in `useDraftAutosave`, where the other three editors share it.
   *
   * `docId` is the draft's own id once there is one — from the route, or from
   * the save that runs the moment a client is chosen. Everything that used to
   * ask "is there a `doc`?" asks this instead, because a contract created here
   * is just as real as one loaded from the URL.
   */
  const autosave = useDraftAutosave({
    typeCode: "CON",
    initialDocId: doc?.id,
    recipientId: clientId,
    payload: buildPayload(),
  });
  const { docId, saveState, serverError, setServerError } = autosave;

  const client = clients.find((c) => c.id === clientId);
  const heading = workspaceTitle(title, DOC_TYPES.CON.label, client?.name);
  const clientSnapshot: ClientSnapshot = client
    ? clientSnapshotOf(client)
    : (doc?.clientSnapshot ?? EMPTY_SNAPSHOT);

  const previewDoc: ContractDocument = {
    id: docId ?? "preview",
    studioSnapshot: doc?.studioSnapshot ?? studio,
    type: "CON",
    status: doc?.status ?? "draft",
    clientId,
    clientSnapshot,
    issueDate,
    lineItems: [],
    gstRatePercent: 0,
    contract,
    content,
    createdAt: doc?.createdAt ?? 0,
    updatedAt: 0,
  };

  const assembled = assemble(contract.parts);
  const added = new Set(contract.parts.map((p) => p.code));

  // No `setDirty` here or in any other mutator: `useDraftAutosave` compares the
  // payload by value, so a change is a change whether or not someone remembered
  // to say so. Four hand-maintained flags used to live in these functions.
  const patchContent: ContentPatch = (patch) =>
    setContent((prev) => ({ ...prev, ...patch }));

  /**
   * Committing copies the Service onto the contract, with the text of every
   * library line it names. From this moment the contract owns its words:
   * editing the library afterwards cannot change them, and — because blank keys
   * are derived from the text — cannot move this draft's fields either.
   */
  const commitPart = (part: ContractService, partBlanks: BlankValues) => {
    const library = { ...contract.library };
    for (const line of [...exclusions, ...clientInputs]) {
      if (
        part.exclusionIds.includes(line.id) ||
        part.clientInputIds.includes(line.id)
      ) {
        library[line.id] = line.text;
      }
    }
    setContract((prev) => ({
      parts: prev.parts.some((p) => p.code === part.code)
        ? prev.parts.map((p) => (p.code === part.code ? part : p))
        : [...prev.parts, part],
      blanks: { ...prev.blanks, ...partBlanks },
      library,
    }));
    setOpenCode(null);
  };

  /**
   * Removing drops the Part but leaves its blank values and library lines in
   * place. Adding it again then restores what was typed, which is what someone
   * who removed it by accident expects; the stale keys are inert and are
   * dropped at finalize, when only the resolved contract is materialised.
   */
  const removePart = (code: string) => {
    setContract((prev) => ({
      ...prev,
      parts: prev.parts.filter((p) => p.code !== code),
    }));
  };

  const setBlank = (key: string, value: string) => {
    setContract((prev) => ({
      ...prev,
      blanks: { ...prev.blanks, [key]: value },
    }));
  };

  const scopes = useMemo(() => contractScopes(contract), [contract]);
  const termScopes = scopes.filter((s) => !s.scope.startsWith("part."));
  const termFigures = termScopes.reduce(
    (n, s) => n + blanksOf(s.parsed).length,
    0,
  );
  const unfilled = scopes.flatMap((scope) =>
    blanksOf(scope.parsed).filter((blank) =>
      isUnfilled(contract.blanks, blank),
    ),
  );
  const unfilledIn = (code: string) =>
    scopes
      .filter((s) => s.scope.startsWith(`part.${code}.`))
      .flatMap((s) => blanksOf(s.parsed))
      .filter((blank) => isUnfilled(contract.blanks, blank)).length;

  // What the contract will print — the source for every content input's value.
  const resolved = contentOf(previewDoc, DOC_TYPES.CON);

  const onFinalize = async () => {
    if (!docId) return;
    setServerError(null);
    setIsSubmitting(true);
    // Freeze before flushing — see the note in `DocumentEditor.onFinalize`. The
    // flush goes behind whatever autosave already has in flight, so the
    // document being frozen is the one on screen.
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

  /**
   * What the contract holds, in the order it prints.
   *
   * The Agreement is one row — it is in every contract and there is nothing to
   * decide about it. The services fold into a card of their own, open while they
   * are being chosen (it is the only feedback that a click landed) and shut
   * afterwards, when the rail is about the document rather than its parts.
   */
  const partCards = (openByDefault: boolean) => (
    <>
      <PartCard title="Master Service Agreement" />
      <PartCard
        title="Services"
        subtitle={`${contract.parts.length} added`}
        unfilled={unfilled.length}
        defaultOpen={openByDefault}
      >
        {contract.parts.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            Add a service
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {assembled.flatMap(({ parts }) =>
              parts.map(({ part }) => (
                <PartCard
                  key={part.code}
                  title={part.name}
                  unfilled={unfilledIn(part.code)}
                  onOpen={() => setOpenCode(part.code)}
                  onRemove={() => removePart(part.code)}
                />
              )),
            )}
          </div>
        )}
      </PartCard>
    </>
  );

  const clientFields = (
    <>
      <Field>
        <FieldLabel htmlFor="con-client">Client</FieldLabel>
        <Combobox
          id="con-client"
          size="form"
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
          value={clientId}
          onValueChange={setClientId}
          placeholder="Select a client…"
          emptyMessage="No matching clients."
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="con-issue-date">Agreement date</FieldLabel>
        <DatePicker
          id="con-issue-date"
          size="form"
          value={issueDate}
          onValueChange={setIssueDate}
        />
      </Field>
    </>
  );

  /**
   * The client and the date, as one line. A "Client & date" title above
   * "Clayora · 9 Aug 2026" says nothing the line does not already say.
   */
  const clientCard = (
    <PartCard
      title={`${client?.name ?? "No client selected"} · ${formatDisplayDate(issueDate)}`}
    >
      {clientFields}
    </PartCard>
  );

  /**
   * The forward button, greyed and explaining itself until there is a Part.
   *
   * Full width, because it is the one thing the stage is asking for and it sits
   * alone in the pinned footer.
   */
  const advance = (label: string, to: Step) =>
    contract.parts.length === 0 ? (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex w-full" />}>
          <Button
            type="button"
            variant="secondary"
            disabled
            className="w-full cursor-not-allowed"
          >
            {label}
            <ArrowRight />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add a service</TooltipContent>
      </Tooltip>
    ) : (
      <Button type="button" className="w-full" onClick={() => setStep(to)}>
        {label}
        <ArrowRight />
      </Button>
    );

  /** Going back is a small move, so it is a small button — it hugs its label. */
  const back = (label: string, to: Step) => (
    <Button
      type="button"
      variant="outline"
      className="self-start"
      onClick={() => setStep(to)}
    >
      <ArrowLeft />
      {label}
    </Button>
  );

  /**
   * The stage's action, pinned below the rail's scroll.
   *
   * A contract's rail runs to twenty-odd cards; with the buttons at the end of
   * the form, the two that matter most — go on, and finalize — were the two you
   * had to go looking for. Finalize is the primary action and takes the width;
   * deleting a draft is rare, destructive and understood from its glyph, so it
   * is a square beside it.
   */
  const railFooter =
    step === "services" ? (
      advance("Agreement terms", "terms")
    ) : step === "terms" ? (
      advance("Preview", "preview")
    ) : docId ? (
      <div className="flex items-center gap-2">
        <ConfirmActionButton
          label="Finalize"
          title="Finalize this contract?"
          description="The contract becomes immutable and takes its number. Corrections after this mean duplicating it as a new draft."
          confirmLabel="Finalize"
          variant="default"
          className="flex-1"
          onConfirm={onFinalize}
          disabled={
            isSubmitting || unfilled.length > 0 || contract.parts.length === 0
          }
        />
        <ConfirmActionButton
          label="Delete draft"
          icon={<Trash2 />}
          size="icon"
          title="Delete this draft?"
          description="This cannot be undone."
          confirmLabel="Delete"
          confirmVariant="destructive"
          className="shrink-0 text-destructive hover:text-destructive"
          onConfirm={onDelete}
          disabled={isSubmitting}
        />
      </div>
    ) : null;

  const openService = openCode
    ? services.find((s) => s.code === openCode)
    : undefined;

  return (
    <DocumentWorkspace
      title={heading}
      {...contractPageProps(previewDoc)}
      railFooter={railFooter}
      // The card carries the library while services are being chosen, the
      // standing terms while they are being set, and the document once there is
      // one worth looking at.
      main={
        step === "services" ? (
          <ServiceCatalog
            services={services}
            query={serviceQuery}
            onQueryChange={setServiceQuery}
            added={added}
            onPick={(service) => setOpenCode(service.code)}
          />
        ) : step === "terms" ? (
          <TermsForm
            scopes={termScopes}
            values={contract.blanks}
            onChange={setBlank}
          />
        ) : undefined
      }
      preview={step === "preview" ? contractBlocks(previewDoc) : undefined}
    >
      {/*
        Still a form — the fields want its semantics — but there is nothing to
        submit any more, so Enter in a text field does nothing rather than
        reloading the page.
      */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col gap-4"
        noValidate
      >
        {/*
          Keyed on the stage: the three screens are different content sitting at
          the same positions in one branch, so React would otherwise reuse each
          card across the switch and hand an uncontrolled Collapsible a new
          `defaultOpen`.
        */}
        <FieldGroup key={step} size="form">
          {step === "services" ? (
            <>
              {clientFields}
              {partCards(true)}
            </>
          ) : step === "terms" ? (
            <>
              {back("Services", "services")}
              {clientCard}
              {partCards(false)}
            </>
          ) : (
            <>
              {back("Terms", "terms")}

              {clientCard}
              {partCards(false)}

              {/* Thirty figures do not belong in a rail — the card holds them. */}
              <PartCard
                title="Agreement & schedule terms"
                subtitle={`${termFigures} figure${termFigures === 1 ? "" : "s"} in the standing text`}
                onOpen={() => setTermsPrompt(true)}
              />

              <PartCard
                title="Clauses"
                // This contract's own count, not the constant's: it may carry a
                // clause the library has since added, or predate one.
                subtitle={`${resolved.clauses.length} clauses of the Master Agreement`}
                onOpen={() => setClausesOpen(true)}
              />

              <PartCard
                title="Cover"
                subtitle="Masthead, intro and the parties preamble"
              >
                <ContentText
                  id="con-masthead"
                  label="Masthead"
                  value={shown(content, resolved, "masthead")}
                  onChange={(masthead) => patchContent({ masthead })}
                />
                <ContentText
                  id="con-intro"
                  label="Cover intro"
                  rows={5}
                  value={shown(content, resolved, "intro")}
                  onChange={(intro) => patchContent({ intro })}
                />
                <ContentText
                  id="con-preamble"
                  label="Parties preamble"
                  rows={3}
                  value={shown(content, resolved, "preamble")}
                  onChange={(preamble) => patchContent({ preamble })}
                />
              </PartCard>

              {unfilled.length > 0 ? (
                <Alert role="status">
                  <AlertTitle>
                    {unfilled.length} blank{unfilled.length === 1 ? "" : "s"}{" "}
                    still to fill
                  </AlertTitle>
                  <AlertDescription>
                    They show in the preview. The contract cannot be issued
                    until every one is filled.
                  </AlertDescription>
                </Alert>
              ) : null}

              {serverError ? (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              ) : null}
              {/*
                The draft writes itself, so this is the only thing that says a
                change has landed. It is a status region, not a control.
              */}
              {saveState === "idle" ? null : (
                <p role="status" className="text-sm text-muted-foreground">
                  {saveState === "saving" ? "Saving…" : "Saved"}
                </p>
              )}
            </>
          )}
        </FieldGroup>
      </form>

      {openService ? (
        <ServiceDialog
          key={openService.code}
          service={openService}
          part={contract.parts.find((p) => p.code === openService.code)}
          blanks={contract.blanks}
          exclusions={exclusions}
          clientInputs={clientInputs}
          onClose={() => setOpenCode(null)}
          onCommit={commitPart}
        />
      ) : null}

      {/* The clauses are long but they are only text — no gate, no local copy. */}
      <Dialog open={clausesOpen} onOpenChange={setClausesOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Clauses</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto border-y py-4">
            <FieldGroup size="form">
              <ClauseFields
                clauses={shown(content, resolved, "clauses")}
                onChange={(clauses) => patchContent({ clauses })}
              />
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setClausesOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={termsPrompt} onOpenChange={setTermsPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit the standing terms?</AlertDialogTitle>
            <AlertDialogDescription>
              The Agreement&apos;s and Schedules&apos; figures have a page of
              their own — there are too many to set from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay here</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setTermsPrompt(false);
                setStep("terms");
              }}
            >
              Go to the terms
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UnsavedChangesDialog autosave={autosave} label="contract" />
    </DocumentWorkspace>
  );
}
