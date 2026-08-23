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
import { PageBody, PageHeader } from "@/components/admin/Page";

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
    <PageBody className="mx-auto max-w-6xl">
      <PageHeader
        title={<>Icon &amp; Logo Spec Checklist</>}
        description="Upload each asset variant, check it against the spec, and judge visual quality in a realistic context. Works for any brand or client, not tied to Qera."
      />

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

      {/* Equal-height rows. Safe now that every preview sits in the same fixed
          500x250 frame — cards differ only by their text, so the slack a short
          card absorbs is small rather than a visible hole. */}
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
    </PageBody>
  );
}
