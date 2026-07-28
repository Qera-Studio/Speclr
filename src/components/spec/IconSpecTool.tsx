'use client';

import { ICON_SPECS } from '@/lib/spec/iconSpecData';
import { useIconSpecState } from '@/lib/spec/useIconSpecState';
import { ButtonGroup } from '@/components/ui/button-group';
import ClientDetailsFields from './ClientDetailsFields';
import SpecProgress from './SpecProgress';
import ImportProgressControls from './ImportProgressControls';
import ExportProgressButton from './ExportProgressButton';
import ResetProgressButton from './ResetProgressButton';
import IconSpecCard from './IconSpecCard';

export default function IconSpecTool() {
  const {
    clientName,
    setClientName,
    domain,
    setDomain,
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

      {/* Identity block — these two fields drive every preview mockup, so they
          lead the page rather than sitting inline with the progress meter. */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card/50 p-4 sm:p-5">
        <ClientDetailsFields
          clientName={clientName}
          domain={domain}
          onClientNameChange={setClientName}
          onDomainChange={setDomain}
        />
        <div className="flex justify-end border-t border-border pt-3">
          <SpecProgress reviewed={reviewedCount} total={totalCount} />
        </div>
      </div>

      <ImportProgressControls onImport={importProgress} importError={importError} />

      <div className="grid auto-rows-fr gap-6 md:grid-cols-2">
        {ICON_SPECS.map((spec) => (
          <IconSpecCard
            // resetNonce forces a fresh mount on reset so each card drops its
            // in-memory preview/validation state.
            key={`${spec.id}-${resetNonce}`}
            spec={spec}
            slotState={slots[spec.id] ?? { reviewed: false, passed: null, notes: '' }}
            onUpdate={(patch) => updateSlot(spec.id, patch)}
            clientName={clientName}
            domain={domain}
          />
        ))}
      </div>

      {/* Exit actions — save your work, then optionally wipe. Grouped at the
          bottom, out of the primary flow. */}
      <div className="flex justify-start border-t border-border pt-4">
        <ButtonGroup aria-label="Export or reset progress" className="opacity-80">
          <ExportProgressButton clientName={clientName} onExport={exportProgress} />
          <ResetProgressButton onReset={resetProgress} />
        </ButtonGroup>
      </div>
    </div>
  );
}
