'use client';

import { Button } from '@/components/ui/button';
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
  return slug || 'kessler-spec';
}

export default function ExportImportControls({
  clientName,
  onExport,
  onImport,
  importError,
}: ExportImportControlsProps) {
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
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={handleExport}>
          Export progress (JSON)
        </Button>

        <input
          id="import-progress"
          type="file"
          accept="application/json"
          aria-label="Import progress"
          className="sr-only"
          onChange={handleImportChange}
        />
        <label
          htmlFor="import-progress"
          className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-within:ring-2 focus-within:ring-ring"
        >
          Import progress
        </label>
      </div>

      {importError && (
        <Alert variant="destructive">
          <AlertDescription>{importError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
