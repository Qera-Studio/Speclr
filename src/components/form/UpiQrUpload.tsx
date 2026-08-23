'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import UploadDropzone from './UploadDropzone';
import {
  compressImageToDataUrl,
  DEFAULT_MAX_BYTES,
} from '@/lib/images/compressImage';

/**
 * Upload for the employee's receiving UPI QR.
 *
 * The drop target is the shared `UploadDropzone` rather than a copy of it —
 * this file used to reimplement the same click/drop/Enter behaviour so that
 * uploading "feels the same everywhere", which is a goal better served by
 * being the same component.
 *
 * The image is downscaled and compressed in the browser to a data URL: the QR
 * is copied into the snapshot of every stipend slip issued to this employee,
 * so it must stay small.
 */

interface UpiQrUploadProps {
  id: string;
  value: string;
  onValueChange: (dataUrl: string) => void;
}

export default function UpiQrUpload({ id, value, onValueChange }: UpiQrUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const hasImage = Boolean(value);

  const accept = async (file: File) => {
    setError(null);
    try {
      onValueChange(await compressImageToDataUrl(file, { maxBytes: DEFAULT_MAX_BYTES }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that image.');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <UploadDropzone
        id={id}
        accept="image/png,image/jpeg,image/webp"
        hasFile={hasImage}
        label={hasImage ? 'Replace QR image' : 'Upload QR image'}
        hint="Prints on the stipend slip"
        onFileSelected={(file) => void accept(file)}
        attachment={
          hasImage ? (
            <div className="flex items-center gap-3 px-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="UPI QR code preview"
                className="size-12 shrink-0 rounded border border-border bg-card object-contain"
              />
              <span className="flex-1 text-xs text-muted-foreground">
                Shown on stipend slips issued to this employee.
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setError(null);
                  onValueChange('');
                }}
              >
                Clear
              </Button>
            </div>
          ) : null
        }
      />

      {error ? (
        <p role="alert" className="text-xs/relaxed text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
