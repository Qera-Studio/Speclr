'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const action = fileName ? 'Replace file' : 'Upload file';

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
        'flex w-full cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed border-input bg-background px-3 py-4 text-center text-sm transition-colors',
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
      <Upload className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span className="font-medium">{isDragging ? 'Drop to upload' : action}</span>
      {fileName ? (
        <span className="text-muted-foreground">{fileName}</span>
      ) : (
        <span className="text-xs text-muted-foreground">Drag &amp; drop or click to browse</span>
      )}
    </div>
  );
}
