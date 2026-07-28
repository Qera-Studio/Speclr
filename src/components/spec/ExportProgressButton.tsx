'use client';

import { Download, CheckCheck } from 'lucide-react';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { TrayArrowIcon } from '@/components/ui/tray-arrow-icon';
import type { ExportedProgress } from '@/lib/spec/types';

interface ExportProgressButtonProps {
  clientName: string;
  onExport: () => ExportedProgress;
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'icon-spec';
}

/**
 * Export (save your work) is an EXIT action — it lives at the bottom, grouped
 * with Reset. Downloads the current progress as a JSON file.
 */
export default function ExportProgressButton({ clientName, onExport }: ExportProgressButtonProps) {
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

  return (
    <ConfirmButton
      idleIcon={Download}
      idleIconSlot={<TrayArrowIcon direction="down" />}
      idleLabel="Export progress"
      confirmIcon={CheckCheck}
      confirmLabel="Downloaded"
      onAction={handleExport}
      revertAfterMs={3000}
      className="group/tray h-10 gap-2 px-5 text-sm [&_svg:not([class*='size-'])]:size-4"
    />
  );
}
