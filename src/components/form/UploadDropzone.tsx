'use client';

import { useRef, useState, type ReactNode } from 'react';
import { TrayArrowIcon } from '@/components/ui/tray-arrow-icon';
import { cn } from '@/lib/utils';

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
  onFileSelected: (file: File) => void;
  /** Whether something is already attached, which changes the prompt. */
  hasFile?: boolean;
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
}

export default function UploadDropzone({
  id,
  accept,
  onFileSelected,
  hasFile: hasFileProp,
  hint,
  label,
  disabled,
  attachment,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasFile = hasFileProp ?? Boolean(attachment);
  const action = label ?? (hasFile ? 'Replace file' : 'Upload file');

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
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
        if (event.key === 'Enter' || event.key === ' ') {
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
        const file = event.dataTransfer.files?.[0];
        if (file) onFileSelected(file);
      }}
      className={cn(
        'group/tray flex w-full cursor-pointer flex-col rounded-md border border-dashed border-input bg-muted text-sm transition-colors',
        'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragging && 'border-primary bg-accent text-accent-foreground',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        aria-label={action}
        className="sr-only"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelected(file);
          // Cleared so re-picking the same file fires `change` again.
          event.target.value = '';
        }}
      />

      {/* Prompt — always the top section; it is the click/drop target. */}
      <div className="flex flex-col items-center gap-1 px-3 py-4 text-center">
        <TrayArrowIcon direction="up" className="text-muted-foreground" />
        <span className="font-medium">{isDragging ? 'Drop to upload' : action}</span>
        {!hasFile ? (
          <span className="text-xs text-muted-foreground">
            {hint ?? 'Drag & drop or click to browse'}
          </span>
        ) : null}
      </div>

      {/* What is attached — inside the box, below a divider. */}
      {attachment ? (
        <div
          className="border-t border-border/60 px-2 py-2"
          onClick={(event) => event.stopPropagation()}
        >
          {attachment}
        </div>
      ) : null}
    </div>
  );
}
