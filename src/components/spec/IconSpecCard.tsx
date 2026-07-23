'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { IconSpec, SlotState, ValidationResult } from '@/lib/spec/types';
import { useImageValidation } from '@/lib/spec/useImageValidation';
import UploadDropzone from './UploadDropzone';
import ValidationResultBadge from './ValidationResultBadge';
import PreviewMockup from './PreviewMockups/PreviewMockup';

interface IconSpecCardProps {
  spec: IconSpec;
  slotState: SlotState;
  onUpdate: (patch: Partial<SlotState>) => void;
}

export default function IconSpecCard({ spec, slotState, onUpdate }: IconSpecCardProps) {
  const { validateFile } = useImageValidation();
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (file: File) => {
    setError(null);
    setFileName(file.name);
    try {
      const validation = await validateFile(file, spec);
      setResult(validation);
      const passed =
        validation.dimensionsOk !== false && validation.formatOk !== false && !validation.transparencyIsWarning;
      onUpdate({ reviewed: true, passed });
    } catch {
      setError('Could not read this file — try a different image.');
    }
  };

  return (
    <Card aria-labelledby={`${spec.id}-heading`}>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <h3 id={`${spec.id}-heading`} className="text-base font-semibold text-foreground">
          {spec.name}
        </h3>
        <Badge variant={spec.priority === 'required' ? 'default' : 'secondary'}>
          {spec.priority === 'required' ? 'Required' : 'Nice to have'}
        </Badge>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Filename</dt>
          <dd>
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{spec.filename}</code>
          </dd>
          <dt className="text-muted-foreground">Size</dt>
          <dd>
            {spec.acceptedDimensions.length > 0
              ? spec.acceptedDimensions.map((d) => `${d.width}×${d.height}px`).join(' or ')
              : 'Vector — no fixed pixel size'}
          </dd>
          <dt className="text-muted-foreground">Used in</dt>
          <dd>{spec.usedIn}</dd>
          <dt className="text-muted-foreground">Why it matters</dt>
          <dd>{spec.whyItMatters}</dd>
          <dt className="text-muted-foreground">Industry standard</dt>
          <dd>{spec.industryStandard}</dd>
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <UploadDropzone id={spec.id} format={spec.format} fileName={fileName} onFileSelected={handleFileSelected} />
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${spec.id}-reviewed`}
              checked={slotState.reviewed}
              onCheckedChange={(checked) => onUpdate({ reviewed: Boolean(checked) })}
            />
            <Label htmlFor={`${spec.id}-reviewed`}>Mark reviewed</Label>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {result && (
          <div className="flex flex-col gap-3">
            <ValidationResultBadge result={result} />
            {spec.previewMockup !== 'none' && (
              <PreviewMockup kind={spec.previewMockup} imageUrl={result.objectUrl} alt={`${spec.name} preview`} />
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${spec.id}-notes`}>Notes</Label>
          <Textarea
            id={`${spec.id}-notes`}
            value={slotState.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            rows={2}
            placeholder="Optional notes for this slot…"
          />
        </div>
      </CardContent>
    </Card>
  );
}
