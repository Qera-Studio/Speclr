'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { TrayArrowIcon } from '@/components/ui/tray-arrow-icon';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportProgressControlsProps {
  onImport: (raw: string) => boolean;
  importError: string | null;
}

/**
 * Import (resume) is an ENTRY action — you load a saved session before working,
 * so it lives at the top of the tool. Export + Reset (the exit actions) live at
 * the bottom.
 */
export default function ImportProgressControls({ onImport, importError }: ImportProgressControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => inputRef.current?.click()}
        className="group/tray h-10 w-fit gap-2 px-5 text-sm opacity-80 [&_svg:not([class*='size-'])]:size-4"
      >
        <TrayArrowIcon direction="up" />
        Import progress
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        aria-label="Import progress file"
        className="sr-only"
        onChange={handleChange}
      />

      {importError && (
        <Alert variant="destructive">
          <AlertDescription>{importError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
