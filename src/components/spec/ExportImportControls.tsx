'use client';

import { useRef } from 'react';
import { Download, Upload, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ExportedProgress } from '@/lib/spec/types';

interface ExportImportControlsProps {
  clientName: string;
  onExport: () => ExportedProgress;
  onImport: (raw: string) => boolean;
  importError: string | null;
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'icon-spec';
}

export default function ExportImportControls({
  clientName,
  onExport,
  onImport,
  importError,
}: ExportImportControlsProps) {
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = onExport();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${slugify(clientName)}-icon-spec-progress.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onImport(reader.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-3">
      <ButtonGroup aria-label="Import and export progress" className="opacity-80">
        <ConfirmButton
          idleIcon={Download}
          idleLabel="Export progress"
          confirmIcon={CheckCheck}
          confirmLabel="Downloaded"
          onAction={handleExport}
          iconMotion="bob-down"
          revertAfterMs={3000}
          className="h-10 gap-2 px-5 text-sm [&_svg:not([class*='size-'])]:size-4"
        />
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => importInputRef.current?.click()}
          className="h-10 gap-2 px-5 text-sm [&_svg:not([class*='size-'])]:size-4"
        >
          <Upload aria-hidden="true" />
          Import progress
        </Button>
      </ButtonGroup>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        aria-label="Import progress file"
        className="sr-only"
        onChange={handleImportChange}
      />

      {importError && (
        <Alert variant="destructive">
          <AlertDescription>{importError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
