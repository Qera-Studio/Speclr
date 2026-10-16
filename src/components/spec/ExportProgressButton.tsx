'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    // The browser's own download bar is the confirmation here; the button
    // used to swap its label to "Downloaded" as well, which said it twice.
    <Button
      type="button"
      variant="outline"
      onClick={handleExport}
      className="h-10 gap-2 px-5 text-sm [&_svg:not([class*='size-'])]:size-4"
    >
      <Download aria-hidden="true" />
      Export progress
    </Button>
  );
}
