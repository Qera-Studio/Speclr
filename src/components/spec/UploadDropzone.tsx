'use client';

import type { IconFormat } from '@/lib/spec/types';

const ACCEPT_BY_FORMAT: Record<IconFormat, string> = {
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
}

export default function UploadDropzone({ id, format, fileName, onFileSelected }: UploadDropzoneProps) {
  const inputId = `upload-${id}`;
  const label = fileName ? 'Replace file' : 'Upload file';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        id={inputId}
        type="file"
        aria-label={label}
        className="sr-only"
        accept={ACCEPT_BY_FORMAT[format]}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
      <label
        htmlFor={inputId}
        className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-within:ring-2 focus-within:ring-ring"
      >
        {label}
      </label>
      {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
    </div>
  );
}
