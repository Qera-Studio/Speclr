'use client';

import { ICON_SPECS } from '@/lib/spec/iconSpecData';
import { useIconSpecState } from '@/lib/spec/useIconSpecState';
import ClientNameField from './ClientNameField';
import SpecProgress from './SpecProgress';
import ExportImportControls from './ExportImportControls';
import ResetProgressButton from './ResetProgressButton';
import IconSpecCard from './IconSpecCard';

export default function IconSpecTool() {
  const {
    clientName,
    setClientName,
    slots,
    updateSlot,
    exportProgress,
    importProgress,
    importError,
    resetProgress,
    resetNonce,
    reviewedCount,
    totalCount,
  } = useIconSpecState();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">Icon &amp; Logo Spec Checklist</h1>
        <p className="text-sm text-muted-foreground">
          Upload each asset variant, check it against the spec, and judge visual quality in a realistic context. Works
          for any brand/client — not tied to Qera.
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <ClientNameField value={clientName} onChange={setClientName} />
        <SpecProgress reviewed={reviewedCount} total={totalCount} />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <ExportImportControls
          clientName={clientName}
          onExport={exportProgress}
          onImport={importProgress}
          importError={importError}
        />
        <ResetProgressButton onReset={resetProgress} />
      </div>

      <div className="grid auto-rows-fr gap-6 md:grid-cols-2">
        {ICON_SPECS.map((spec) => (
          <IconSpecCard
            // resetNonce forces a fresh mount on reset so each card drops its
            // in-memory preview/validation state.
            key={`${spec.id}-${resetNonce}`}
            spec={spec}
            slotState={slots[spec.id] ?? { reviewed: false, passed: null, notes: '' }}
            onUpdate={(patch) => updateSlot(spec.id, patch)}
          />
        ))}
      </div>
    </div>
  );
}
