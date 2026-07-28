'use client';

import { useRef, useState, type ReactNode } from 'react';
import { TrayArrowIcon } from '@/components/ui/tray-arrow-icon';
import { cn } from '@/lib/utils';
import type { IconFormat } from '@/lib/spec/types';

export const ACCEPT_BY_FORMAT: Record<IconFormat, string> = {
  ico: '.ico',
  png: 'image/png',
  svg: 'image/svg+xml,.svg',
  jpeg: 'image/jpeg',
};

interface UploadDropzoneProps {
  id: string;
  format: IconFormat;
  fileName: string | null;
  onFileSelected: (file: File) => void;
  /**
   * When a file is present, its Attachment card — rendered inside the box below
   * a divider. The box itself remains the re-upload affordance (click/drop).
   */
  attachment?: ReactNode;
}

export default function UploadDropzone({ id, format, fileName, onFileSelected, attachment }: UploadDropzoneProps) {
  const inputId = `upload-${id}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasFile = Boolean(fileName || attachment);
  const action = hasFile ? 'Replace file' : 'Upload file';

  const openPicker = () => inputRef.current?.click();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Drag and drop a file here, or activate to browse"
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'group/tray flex w-full cursor-pointer flex-col rounded-md border border-dashed border-input bg-muted text-sm transition-colors',
        'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragging && 'border-primary bg-accent text-accent-foreground',
      )}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        aria-label={action}
        className="sr-only"
        accept={ACCEPT_BY_FORMAT[format]}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />

      {/* Prompt — always the top section; it is the click/drop target. */}
      <div className="flex flex-col items-center gap-1 px-3 py-4 text-center">
        <TrayArrowIcon direction="up" className="text-muted-foreground" />
        <span className="font-medium">{isDragging ? 'Drop to upload' : action}</span>
        {!hasFile && <span className="text-xs text-muted-foreground">Drag &amp; drop or click to browse</span>}
      </div>

      {/* Uploaded file — inside the box, below a divider, no extra background. */}
      {attachment && (
        <div className="border-t border-border/60 px-2 py-2" onClick={(e) => e.stopPropagation()}>
          {attachment}
        </div>
      )}
    </div>
  );
}
