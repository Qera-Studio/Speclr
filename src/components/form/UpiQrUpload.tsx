'use client';

import { useRef, useState } from 'react';
import { TrayArrowIcon } from '@/components/ui/tray-arrow-icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  compressImageToDataUrl,
  DEFAULT_MAX_BYTES,
} from '@/lib/images/compressImage';

/**
 * Upload for the employee's receiving UPI QR.
 *
 * Mirrors the icon tool's UploadDropzone interaction (click, drop, Enter/Space)
 * so uploading feels the same everywhere in the app. The image is downscaled
 * and compressed in the browser to a data URL — this project has no blob
 * storage, and the QR is copied into the snapshot of every stipend slip issued
 * to this employee, so it must stay small.
 */

interface UpiQrUploadProps {
  id: string;
  value: string;
  onValueChange: (dataUrl: string) => void;
}

export default function UpiQrUpload({ id, value, onValueChange }: UpiQrUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasImage = Boolean(value);
  const action = hasImage ? 'Replace QR image' : 'Upload QR image';

  const openPicker = () => inputRef.current?.click();

  const accept = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      onValueChange(await compressImageToDataUrl(file, { maxBytes: DEFAULT_MAX_BYTES }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that image.');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        aria-label={`${action}. Drag and drop, or activate to browse.`}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void accept(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          'group/tray flex w-full cursor-pointer flex-col rounded-md border border-dashed border-input bg-muted text-sm transition-colors',
          'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isDragging && 'border-primary bg-accent text-accent-foreground',
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          aria-label={action}
          className="sr-only"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => void accept(event.target.files?.[0])}
        />

        <div className="flex flex-col items-center gap-1 px-3 py-4 text-center">
          <TrayArrowIcon direction="up" className="text-muted-foreground" />
          <span className="font-medium">{isDragging ? 'Drop to upload' : action}</span>
          {!hasImage ? (
            <span className="text-xs text-muted-foreground">
              Prints on the stipend slip
            </span>
          ) : null}
        </div>

        {hasImage ? (
          <div
            className="flex items-center gap-3 border-t border-border/60 px-3 py-2"
            onClick={(event) => event.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="UPI QR code preview"
              className="size-12 shrink-0 rounded border border-border bg-white object-contain"
            />
            <span className="flex-1 text-xs text-muted-foreground">
              Shown on stipend slips issued to this employee.
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setError(null);
                onValueChange('');
              }}
            >
              Clear
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-xs/relaxed text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
