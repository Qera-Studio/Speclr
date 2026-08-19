"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { FileLock2, FileText, Plus, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Attachment,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Field, FieldLabel } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { RemoveButton } from "@/components/ui/remove-button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import FieldInfo, { InfoTip } from "@/components/form/FieldInfo";
import UploadDropzone from "@/components/form/UploadDropzone";
import {
  ATTACHMENT_KIND_LABELS,
  ATTACHMENT_KIND_NOTES,
  ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  attachmentExtraKindsFor,
  attachmentSlotsFor,
  type AttachmentKind,
  type ClientAttachment,
} from "@/lib/domain/client";
import AttachmentTypeDialog from "./AttachmentTypeDialog";
import {
  deleteClientAttachment,
  uploadClientAttachment,
} from "@/server/actions/attachments";
import type { ClientRecord } from "@/lib/domain/types";
import { StepForm, type StepProps } from "./stepKit";

/** A file picked but not yet stored. The id is local, not the attachment's. */
type Queued = { id: number; kind: AttachmentKind; file: File };

/** Local ids, so two files of the same kind and name are still two entries. */
let nextQueueId = 0;

/**
 * Attachments.
 *
 * **One slot per document, rather than one box and a type picker.** The picker
 * was a mode: it was set once and stayed set, so uploading a PAN card straight
 * after a GST certificate filed it as a GST certificate and nothing could
 * catch it. A slot is a label instead of a setting, which removes the step that
 * could be skipped, and it lets the server name the file from the slot rather
 * than keeping whatever the scanner called it.
 *
 * Which slots exist is derived from where the client is and what they are
 * (`attachmentSlotsFor`): an individual has no certificate of incorporation
 * because no registrar ever issued one.
 * Anything a client can have several of — purchase orders, signed contracts —
 * is not a slot, and arrives through the box at the bottom with its own type.
 *
 * Uploads go straight to the server action, which sniffs the real type from the
 * bytes, stores the blob **private**, and only then records it. Nothing here is
 * a security control — the accept attribute and the size hint are a courtesy to
 * whoever is uploading, and the action re-checks both, because a file picker is
 * not a trust boundary.
 *
 * This step saves on each upload rather than on a submit button: a file is
 * either stored or it is not, and a "save" that could leave a blob written but
 * unreferenced would be the worse of the two states.
 */
export default function AttachmentsStep({
  client,
  onSaved,
  onRecordChanged,
  submitLabel,
  kind = "company",
}: StepProps & {
  /**
   * The record changed, but the step is not finished. This step writes to the
   * row on every upload and delete rather than on a submit, and routing those
   * through `onSaved` walked the operator to the next step the moment a file
   * landed. Two meanings, two callbacks.
   */
  onRecordChanged: (client: ClientRecord) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  /** What a drop of several files left behind, if anything. */
  const [ignored, setIgnored] = useState<string | null>(null);
  /**
   * Files picked but not yet stored, oldest first. The head is the one in
   * flight; the rest are waiting.
   *
   * **A queue, because the uploads have to be serialised and that is not the
   * operator's problem to solve.** `saveClient` rewrites the whole client row,
   * so two uploads in flight both read the same `attachments` array and the
   * second one's save drops the first one's entry, leaving a blob in storage
   * that nothing points at. Refusing the second pick was the honest version of
   * that constraint and a poor way to spend it: the file is right there, it just
   * has to go second. It now waits its turn and the card says so.
   */
  const [queue, setQueue] = useState<Queued[]>([]);
  /** Which attachment is being deleted, so its row can say it is going. */
  const [removing, setRemoving] = useState<string | null>(null);
  /** The "which document is this?" dialog, and a file dropped before it opened. */
  const [picking, setPicking] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | undefined>(undefined);
  const [pending, startTransition] = useTransition();
  /** The queue entry already handed to the server, so a re-render cannot resend it. */
  const started = useRef<number | null>(null);

  const attachments = client?.attachments ?? [];
  // Both halves derived from the record: where they are, and what they are.
  const context = { country: client?.addressParts?.country, clientKind: kind };
  const slots = attachmentSlotsFor(context);
  const extras = attachments.filter((a) => !slots.includes(a.kind));
  /**
   * An individual is asked for two documents, not three, which left the row a
   * card short and a full-width rectangle sitting under the hole. The box takes
   * the empty place instead: same grid, same shape as its neighbours.
   */
  const inlineExtra = slots.length < 3;

  const upload =
    (kind: AttachmentKind) =>
    (file: File, offered = 1) => {
      if (!client) return;
      setError(null);
      // Checked here as well as on the server, because the framework gets there
      // first: an over-sized body is cut off mid-stream and the action rejects
      // with "Unexpected end of form", which reaches the operator as a crashed
      // step rather than a file that is too big. The server check stays: this one
      // is a courtesy, not the enforcement.
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setError(`${file.name} is larger than ${maxMb} MB.`);
        return;
      }
      // Dropping three documents used to upload one and say nothing. Uploading
      // all three is not the fix: a drop lands in one slot, and the other two
      // files are not that document.
      setIgnored(
        offered > 1
          ? `${offered - 1} other ${offered === 2 ? "file was" : "files were"} not uploaded. Each document has its own upload, so add them one at a time.`
          : null,
      );
      // The card fills the moment the file is picked, whether it goes now or
      // waits. The round trip is three or four seconds, and a slot that shows
      // nothing for that long reads as a click that did not land.
      setQueue((q) => [...q, { id: nextQueueId++, kind, file }]);
    };

  // Drains the queue one file at a time. The guard is the entry's own id rather
  // than `pending`: `pending` is set asynchronously and is shared with deletes,
  // and an id that has already been sent is the fact actually being checked.
  const head = queue[0];
  useEffect(() => {
    if (!client || !head || pending || started.current === head.id) return;
    started.current = head.id;

    const data = new FormData();
    data.set("file", head.file);
    data.set("kind", head.kind);

    startTransition(async () => {
      // A Server Action that never returns (the request cut off, the network
      // dropped) rejects, and an uncaught rejection here takes the whole step
      // down with it. The file did not upload either way; say so and leave the
      // rest of the form standing.
      const result = await uploadClientAttachment(client.id, data).catch(
        (cause) => {
          // The operator gets the sentence, and whoever is debugging gets the
          // reason. Which leg failed is infrastructure detail: it tells anyone
          // watching where the seams are, and does not tell the operator
          // anything they can act on that "try again" does not.
          console.error("Attachment upload failed", cause);
          return {
            success: false as const,
            error:
              "That upload did not go through. Check the connection and try again.",
            id: undefined,
          };
        },
      );
      setQueue((q) => q.filter((entry) => entry.id !== head.id));
      if (!result.success || !result.id) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      // Mirrors what the action stored, including the replacement of whatever
      // was in this slot before. The bytes are already written; this is the
      // record catching up so the card shows it without a round trip.
      const added: ClientAttachment = {
        id: result.id,
        kind: head.kind,
        filename: head.file.name,
        mime: head.file.type,
        size: head.file.size,
        key: `clients/${client.id}/${result.id}`,
        uploadedAt: Date.now(),
        // The action read the bytes; the card would otherwise show the viewer's
        // "Password required" panel until something refetched the row.
        encrypted: result.encrypted,
      };
      const replaced = slots.includes(head.kind)
        ? attachments.filter((a) => a.kind !== head.kind)
        : attachments;
      // Not `onSaved` — the record changed, the step did not finish. See
      // `StepProps`: attaching a file used to walk the operator to the next
      // step, which is not what adding a second document means.
      onRecordChanged({
        ...client,
        attachments: [...replaced, added],
      } as ClientRecord);
    });
  }, [head, pending, client, attachments, slots, onRecordChanged]);

  const onRemove = (attachment: ClientAttachment) => {
    if (!client) return;
    setError(null);
    // Deleting a file is a round trip too, and the only thing that used to
    // happen in it was the button going faintly disabled under a pointer that
    // had already left it. The card now says it is going.
    setRemoving(attachment.id);
    startTransition(async () => {
      const result = await deleteClientAttachment(client.id, attachment.id);
      setRemoving(null);
      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      onRecordChanged({
        ...client,
        attachments: attachments.filter((a) => a.id !== attachment.id),
      } as ClientRecord);
    });
  };

  const maxMb = Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024);

  const fileUrl = (attachment: ClientAttachment) =>
    `/api/clients/${client?.id}/files/${attachment.id}`;

  /**
   * The document's own first page, cropped to the top of the card.
   *
   * A PDF renders in the browser's built-in viewer through an `<iframe>` —
   * `#toolbar=0&view=FitH` strips its chrome and fits the page to the width, so
   * the container crops the rest. pdf.js on a canvas would be the other way to
   * do this, and it is a dependency plus a worker plus a bundle for a picture
   * nobody studies. The frame is inert: `pointer-events-none` sends the click
   * to the box behind it, which is how the file gets replaced.
   *
   * An image gets a plain `<img>`. `next/image` would proxy it through the
   * optimizer, which caches what it fetches, and a third party's PAN card does
   * not belong in a CDN cache.
   *
   * A password-protected PDF gets neither. The viewer draws its own "Password
   * required" panel, half-cropped by the card, which reads as a preview that
   * broke rather than a file that is locked. A lock on the box's own colour
   * says the same thing and says it deliberately.
   */
  const preview = (attachment: ClientAttachment) =>
    attachment.encrypted ? (
      <div className="flex h-full items-center justify-center bg-muted">
        <FileLock2
          aria-hidden
          className="size-10 stroke-[1.25] text-muted-foreground/40"
        />
        <span className="sr-only">
          {attachment.filename} is password-protected, so it cannot be
          previewed.
        </span>
      </div>
    ) : attachment.mime === "application/pdf" ? (
      <iframe
        src={`${fileUrl(attachment)}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        title={`Preview of ${attachment.filename}`}
        tabIndex={-1}
        // Taller than the box so an A4 page fills the width and the foot of it
        // is cropped, rather than being letterboxed inside a short frame.
        //
        // The scale widens past the viewer's own dark surround on the sides,
        // and `-mt-4` lifts the top one out of the frame: scaling from the top
        // edge leaves that edge exactly where it was, so the strip above the
        // page survives a scale of any size and has to be moved instead.
        className="pointer-events-none -mt-4 h-[180%] w-full origin-top scale-105 border-0"
      />
    ) : (
      <img
        src={fileUrl(attachment)}
        alt=""
        className="h-full w-full object-cover object-top"
      />
    );

  /** A file on its way to storage: uploading if it is the head, waiting if not. */
  const queuedCard = (entry: Queued) => {
    const active = head?.id === entry.id;
    return (
      <Attachment className="w-full" state="uploading">
        <AttachmentMedia>
          <Spinner />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{entry.file.name}</AttachmentTitle>
          {active ? (
            /*
              Indeterminate, not a percentage. Only the browser → server leg
              reports bytes; the server → Blob leg is the slow half and reports
              none, so a number would sit at 100% and lie.
            */
            <Progress
              value={null}
              aria-label={`Uploading ${entry.file.name}`}
              className="mt-1.5"
            />
          ) : (
            // No bar for a file that has not started: a second indeterminate
            // bar beside a running one says both are moving.
            <AttachmentDescription>Waiting to upload…</AttachmentDescription>
          )}
        </AttachmentContent>
      </Attachment>
    );
  };

  /** The row under a slot's preview, or the one in flight. */
  const card = (
    kind: AttachmentKind,
    attachment: ClientAttachment | undefined,
  ) => {
    const queued = queue.find((entry) => entry.kind === kind);
    if (queued) return queuedCard(queued);
    if (!attachment) return undefined;
    return (
      // No surface of its own. The inset preview above is the card; a second
      // bordered panel under it makes one document look like two things.
      <Attachment
        aria-busy={removing === attachment.id || undefined}
        className={`w-full border-transparent bg-transparent hover:bg-transparent! ${
          removing === attachment.id ? "opacity-60" : ""
        }`}
      >
        {/* No media here: the document itself is the top of the card now, and a
            second thumbnail beside the name would be the same picture twice. */}
        <AttachmentContent>
          <AttachmentTitle>
            <a
              href={fileUrl(attachment)}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline"
            >
              {/* The slot's name, not the filename: the file is called
                  "Clayora Private Limited - GST registration certificate.pdf",
                  which in a quarter-width card is three lines of the client's
                  own name. The full name is still the link's target. */}
              {ATTACHMENT_KIND_LABELS[kind]}
            </a>
          </AttachmentTitle>
          {/*
            Format and size. "completed" was a success marker for an upload that
            has been over for some time — the page being there says it landed.
          */}
          <AttachmentDescription>
            {fileFormat(attachment.filename, attachment.mime)} ·{" "}
            {formatBytes(attachment.size)}
          </AttachmentDescription>
        </AttachmentContent>
        {/* Deleting is rare and destructive, so it waits for the pointer. It
            stays for keyboard focus, or it would be unreachable without one.
            While the delete is in flight the actions stay visible: the pointer
            has usually left the card by then, and a row that goes back to
            looking untouched is a click that appears not to have landed. */}
        <AttachmentActions
          className={
            removing === attachment.id
              ? "pr-1.5"
              : "pr-1.5 opacity-0 transition-opacity group-hover/tray:opacity-100 group-focus-within/tray:opacity-100"
          }
        >
          {removing === attachment.id ? (
            <span className="flex size-7 items-center justify-center">
              <Spinner />
              <span className="sr-only">Deleting {attachment.filename}…</span>
            </span>
          ) : (
            <RemoveButton
              label={`Remove ${attachment.filename}`}
              onConfirm={() => onRemove(attachment)}
              disabled={pending}
              confirmDescription="The file itself is deleted, not just the link to it."
              // `!`, because the class it overrides is the form group's
              // `group-data-[size=form]/field-group:size-9`, which is right for a
              // form control and too big for a 40px row.
              className="size-7!"
            />
          )}
        </AttachmentActions>
      </Attachment>
    );
  };

  /*
    One box, and the type is asked for *after* it is activated. The type picker
    used to sit above this as a `Combobox`, which was the same mode the slots
    removed: set once, it stayed set, so the next upload was filed as whatever
    the last one had been.
  */
  const extraDropzone = (
    <UploadDropzone
      id="attachment-extra"
      accept={ATTACHMENT_MIME_TYPES.join(",")}
      disabled={!client}
      // In the grid it is a card like its neighbours. Below it, `shrink-0`, or
      // the list squeezes the drop box as it fills: a flex item's default is to
      // give up height, and this one is a target.
      className={inlineExtra ? "min-h-56" : "shrink-0"}
      // Turns a quarter on hover, so this card answers the pointer the way the
      // `TrayArrowIcon` boxes beside it do.
      icon={
        <Plus
          aria-hidden
          className="size-5 text-muted-foreground transition-transform duration-300 group-hover/tray:rotate-90"
        />
      }
      label="Add anything else"
      hint={`Add any document up to ${maxMb} MB`}
      onFileSelected={() => {}}
      onActivate={(file) => {
        setDroppedFile(file);
        setPicking(true);
      }}
    />
  );

  const queuedExtras = queue.filter((entry) => !slots.includes(entry.kind));

  return (
    /*
      `StepForm`, like the other six, even though this step saves on each upload
      and its submit does nothing but move on. The button is portalled into the
      wizard's footer from in here, so a hand-rolled one sat wherever the
      content happened to end — a different place on this step than on every
      other, for a control that is pressed seven times in a row.
    */
    <StepForm
      onSubmit={(event) => {
        event.preventDefault();
        if (client) onSaved(client);
      }}
      serverError={error}
      submitting={pending}
      submitLabel={submitLabel}
      // Take the band's height, so the extras list below can scroll instead of
      // the step. See `StepForm`'s `fill`.
      fill
    >
      <Field>
        <FieldInfo
          htmlFor={`attachment-${slots[0]}`}
          label="Documents"
          info="These are the client’s own identity documents. They are stored privately, readable only while signed in, and deleting one deletes the file itself."
          infoLabel="How are these stored?"
        />
        {/* One row on a desktop, because these are read as a set — "what is
            still missing" is a glance, not a scroll. */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {slots.map((slot) => {
            const held = attachments.find((a) => a.kind === slot);
            const label = ATTACHMENT_KIND_LABELS[slot];
            return (
              /*
                What the document is, behind an icon in the corner.

                An FIRC and a W-8BEN-E are unfamiliar until the first export
                invoice, and the cost of not knowing is finding out from an
                accountant a year later — by which time the bank issues the
                first one grudgingly. The card cannot say it: the whole box is
                already a button, and a paragraph on it would bury the one
                thing it is for.

                A sibling of the box rather than a child, because a button
                inside a button is not a control anyone can operate.
              */
              <div key={slot} className="relative">
                <InfoTip
                  className="absolute top-2 right-2 z-10"
                  info={ATTACHMENT_KIND_NOTES[slot]}
                  label={`What is a ${label}?`}
                />
                <UploadDropzone
                  id={`attachment-${slot}`}
                  accept={ATTACHMENT_MIME_TYPES.join(",")}
                  disabled={!client}
                  className="min-h-56"
                  // The slot names itself whether it is full or empty: "Replace"
                  // alone leaves a filled card with nothing saying what it is.
                  label={
                    held || queue.some((entry) => entry.kind === slot)
                      ? label
                      : `Add ${label}`
                  }
                  hasFile={
                    Boolean(held) || queue.some((entry) => entry.kind === slot)
                  }
                  hint={`PDF, PNG or JPEG · up to ${maxMb} MB`}
                  preview={held ? preview(held) : undefined}
                  attachment={card(slot, held)}
                  onFileSelected={upload(slot)}
                />
              </div>
            );
          })}
          {inlineExtra ? extraDropzone : null}
        </div>
      </Field>

      <AttachmentTypeDialog
        open={picking}
        onOpenChange={(next) => {
          setPicking(next);
          if (!next) setDroppedFile(undefined);
        }}
        kinds={attachmentExtraKindsFor(context)}
        pendingFile={droppedFile}
        onPicked={(kind, file) => upload(kind)(file)}
      />

      {/* `warning`, not `destructive`: the file that was picked is uploading. */}
      {ignored ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden />
          <AlertDescription>{ignored}</AlertDescription>
        </Alert>
      ) : null}

      {/* With the box up in the grid there is nothing to head until something
          has actually been added, and a lone "Anything else" label over an
          empty box reads as a section that failed to render. */}
      {inlineExtra &&
      extras.length === 0 &&
      queuedExtras.length === 0 ? null : (
        <>
          {/* The two halves are different things: above is the set a client is asked
          for, below is whatever else the relationship produced. A line says so
          more cheaply than a heading would. */}
          <Separator />

          {/* The last field is the one that gives: everything above it is a fixed
          set of controls, and this is the part with no ceiling. */}
          <Field className="min-h-0 flex-1">
            <FieldLabel htmlFor="attachment-extra">Anything else</FieldLabel>
            {inlineExtra ? null : extraDropzone}

            {/*
          The extras scroll in their own box.

          The list has no ceiling (a client can have three purchase orders and a
          year of TDS certificates) and left to grow it pushed the drop box, the
          primary slots and the step's own header off the top of the page. The
          controls a person is using stay put and only the record of what has
          already been added moves.

          `flex-1`, not a fixed `max-h`: a height picked by hand is either short
          enough to waste a tall window or tall enough that the step overflows a
          short one, and overflowing is what put the scrollbar back on the whole
          form. This takes exactly what is left. `min-h-0` is the load-bearing
          half — a flex item's floor is its content, so without it the box grows
          to fit the list and never scrolls at all.
        */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Extras have no slot to fill, so every one of them queued shows here.
              Several at once is the normal case: three purchase orders are three
              documents. */}
              {queuedExtras.map((entry) => (
                <div key={entry.id} className="mt-2">
                  {queuedCard(entry)}
                </div>
              ))}

              {extras.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-2">
                  {extras.map((attachment) => (
                    <li key={attachment.id}>
                      <Attachment
                        aria-busy={removing === attachment.id || undefined}
                        className={`w-full ${removing === attachment.id ? "opacity-60" : ""}`}
                      >
                        <AttachmentMedia>
                          <FileText aria-hidden />
                        </AttachmentMedia>
                        <AttachmentContent>
                          <AttachmentTitle>
                            <a
                              href={`/api/clients/${client?.id}/files/${attachment.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="underline-offset-2 hover:underline"
                            >
                              {attachment.filename}
                            </a>
                          </AttachmentTitle>
                          {/* Extras keep their own names, so the kind has to be said —
                          and then the format, or "Other · 325 KB" on a PNG reads
                          as the file's type having been read as "Other". */}
                          <AttachmentDescription>
                            {ATTACHMENT_KIND_LABELS[attachment.kind]} ·{" "}
                            {fileFormat(attachment.filename, attachment.mime)} ·{" "}
                            {formatBytes(attachment.size)}
                          </AttachmentDescription>
                        </AttachmentContent>
                        <AttachmentActions className="pr-1.5">
                          {removing === attachment.id ? (
                            <span className="flex size-7 items-center justify-center">
                              <Spinner />
                              <span className="sr-only">
                                Deleting {attachment.filename}…
                              </span>
                            </span>
                          ) : (
                            <RemoveButton
                              label={`Remove ${attachment.filename}`}
                              onConfirm={() => onRemove(attachment)}
                              disabled={pending}
                              confirmDescription="The file itself is deleted, not just the link to it."
                              className="size-7!"
                            />
                          )}
                        </AttachmentActions>
                      </Attachment>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Field>
        </>
      )}
    </StepForm>
  );
}

/**
 * The file's format, as a person names it: PDF, PNG, JPG.
 *
 * The extension first, because that is what the reader sees in the filename
 * above it. The MIME subtype is the fallback for a file uploaded without one,
 * and it is the type the server sniffed from the bytes rather than the
 * browser's claim.
 */
function fileFormat(filename: string, mime: string): string {
  const ext = filename.includes(".") ? filename.split(".").pop() : "";
  if (ext && ext.length <= 4) return ext.toUpperCase();
  const subtype = mime.split("/")[1];
  return subtype ? subtype.toUpperCase() : "File";
}

/** Bytes as something a person reads. Attachments are KB-to-MB, so two units. */
function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
