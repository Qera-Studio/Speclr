"use client";

import { useRef, useState, type ReactNode } from "react";
import { TrayArrowIcon } from "@/components/ui/tray-arrow-icon";
import { cn } from "@/lib/utils";

/**
 * The app's file drop zone — click, drop, or Enter/Space to browse.
 *
 * **There is one of these, and this is it.** It began in the icon tool; the UPI
 * QR upload then copied it wholesale ("mirrors the icon tool's
 * UploadDropzone"), and client attachments were about to make a third. Three
 * copies of a drop target is three places to fix a focus bug, so the original
 * moved here and lost the one thing that tied it to the icon tool — it took an
 * `IconFormat` and looked the accept string up itself, which no other caller
 * could satisfy. It now takes `accept` as the plain string an `<input>` wants.
 *
 * The real `<input type="file">` is `sr-only` rather than absent: the styled
 * box is a `role="button"`, but the input is what carries the accept filter,
 * the file dialog and the change event, and a screen reader user must be able
 * to reach it. Hiding it visually and keeping it in the tree is the whole
 * trick.
 */
interface UploadDropzoneProps {
  /** Id for the underlying input, so a `FieldLabel` can point at it. */
  id: string;
  /** The `accept` attribute, verbatim — e.g. `'image/png,.svg'`. */
  accept: string;
  /**
   * One file, and the number that were actually offered.
   *
   * The box takes a single file: the fields around it describe *this* file, so
   * a batch would land under one description. The count is passed rather than
   * swallowed so a caller can say so, which is the part that was missing when
   * dropping three documents quietly uploaded one.
   *
   * Optional only because `onActivate` replaces it: a box that asks which
   * document this is has nowhere to send a file until it has been answered.
   */
  onFileSelected?: (file: File, offered: number) => void;
  /**
   * Opens something other than the file dialog.
   *
   * The "anything else" box has no type yet, so picking a file first would be
   * picking it for nothing. With this set the box asks *which document* first
   * and the picker follows. A drop still works: the file is handed over, and
   * whatever this opens can upload it once it knows the type.
   */
  onActivate?: (file?: File) => void;
  /** Whether something is already attached, which changes the prompt. */
  hasFile?: boolean;
  /** Replaces the tray arrow in the empty state. */
  icon?: ReactNode;
  /** The second line, shown only when nothing is attached yet. */
  hint?: ReactNode;
  /** Overrides the prompt entirely — "Upload file" / "Replace file" by default. */
  label?: string;
  disabled?: boolean;
  /**
   * What is attached, rendered inside the box below a divider. The box itself
   * stays the re-upload affordance.
   */
  attachment?: ReactNode;
  /**
   * The document itself, filling the top of the box in place of the prompt.
   *
   * A thumbnail beside the filename tells you a file is there, which the
   * filename already said. A cropped first page tells you *which* file, which
   * is the only question worth asking of a wall of scanned certificates. The
   * prompt moves to a hover overlay, so the box is still the way to replace it.
   */
  preview?: ReactNode;
  /** Extra classes on the box — height, mostly. */
  className?: string;
}

export default function UploadDropzone({
  id,
  accept,
  onFileSelected,
  onActivate,
  hasFile: hasFileProp,
  icon,
  hint,
  label,
  disabled,
  attachment,
  preview,
  className,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasFile = hasFileProp ?? Boolean(attachment);
  const action = label ?? (hasFile ? "Replace file" : "Upload file");

  const openPicker = () => {
    if (disabled) return;
    if (onActivate) {
      onActivate();
      return;
    }
    inputRef.current?.click();
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      // Deliberately does not repeat the action: the `<input>` inside carries
      // that, and naming both "Upload file" makes the same control appear
      // twice to anyone querying by name — sighted or otherwise.
      aria-label="Drag and drop a file here, or activate to browse"
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(event) => {
        if (disabled) return;
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        if (disabled) return;
        event.preventDefault();
        setIsDragging(false);
        const files = event.dataTransfer.files;
        if (!files?.[0]) return;
        if (onActivate) onActivate(files[0]);
        else onFileSelected?.(files[0], files.length);
      }}
      className={cn(
        "group/tray flex w-full cursor-pointer flex-col rounded-md border border-dashed border-input bg-muted text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        // A wash of the same blue the border turns, not the neutral hover
        // grey: the box being armed to receive the file is a different state
        // from the pointer merely resting on it, and it should not look like it.
        isDragging && "border-primary bg-primary/10 text-foreground",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {/* No input in activate mode: there is no type yet, so a file dialog here
          would be picking a file for nothing. Whatever `onActivate` opens
          carries the picker once it knows which document this is. */}
      {onActivate ? null : (
        <input
          ref={inputRef}
          id={id}
          type="file"
          aria-label={action}
          className="sr-only"
          accept={accept}
          disabled={disabled}
          onChange={(event) => {
            const files = event.target.files;
            if (files?.[0]) onFileSelected?.(files[0], files.length);
            // Cleared so re-picking the same file fires `change` again.
            event.target.value = "";
          }}
        />
      )}

      {/* The top section, and the click/drop target: the document if there is
          one, the prompt if there is not. */}
      {preview ? (
        // Inset, not edge to edge: the page sits as its own card on top of the
        // box rather than being the box's own top half, which is what stops a
        // scan's white background reading as part of the chrome around it.
        <div className="flex-1 p-1">
          <div className="relative h-full overflow-hidden rounded-sm bg-background">
            {preview}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/80 text-center opacity-0 transition-opacity group-hover/tray:opacity-100 group-focus-visible/tray:opacity-100">
              <TrayArrowIcon direction="up" className="text-muted-foreground" />
              <span className="font-medium">
                {isDragging ? "Drop to upload" : "Replace"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-3 py-8 text-center">
          {icon ?? <TrayArrowIcon direction="up" className="text-muted-foreground" />}
          <span className="font-medium">
            {isDragging ? "Drop to upload" : action}
          </span>
          {!hasFile ? (
            <span className="text-xs text-muted-foreground">
              {hint ?? "Drag & drop or click to browse"}
            </span>
          ) : null}
        </div>
      )}

      {/* What is attached — inside the box, below a divider. */}
      {attachment ? (
        <div
          // No rule under an inset preview: the card's own edge already
          // separates them, and a second line there is one too many.
          className={cn("px-1 py-1", !preview && "border-t border-border/60")}
          onClick={(event) => event.stopPropagation()}
        >
          {attachment}
        </div>
      ) : null}
    </div>
  );
}
