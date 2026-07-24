'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { IconSpec, SlotState, ValidationResult } from '@/lib/spec/types';
import { useImageValidation } from '@/lib/spec/useImageValidation';
import { computePassed } from '@/lib/spec/computePassed';
import UploadDropzone from './UploadDropzone';
import ValidationResultBadge from './ValidationResultBadge';
import PreviewMockup from './PreviewMockups/PreviewMockup';

interface IconSpecCardProps {
  spec: IconSpec;
  slotState: SlotState;
  onUpdate: (patch: Partial<SlotState>) => void;
}

type Verdict = { label: string; variant: 'default' | 'destructive' | 'secondary' } | null;

/** Map a reviewed slot's pass/fail/neutral outcome to a header pill, or null before review. */
function verdictFor(slotState: SlotState): Verdict {
  if (!slotState.reviewed) return null;
  if (slotState.passed === true) return { label: 'Pass', variant: 'default' };
  if (slotState.passed === false) return { label: 'Fail', variant: 'destructive' };
  return { label: 'Review manually', variant: 'secondary' };
}

export default function IconSpecCard({ spec, slotState, onUpdate }: IconSpecCardProps) {
  const { validateFile } = useImageValidation();
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The blob: URL currently backing the preview. Each upload mints a new one via
  // URL.createObjectURL; we revoke the previous one when it's superseded and on
  // unmount so re-uploads don't leak blobs.
  const objectUrlRef = useRef<string | null>(null);

  const verdict = verdictFor(slotState);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const handleFileSelected = async (file: File) => {
    setError(null);
    setFileName(file.name);
    try {
      const validation = await validateFile(file, spec);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = validation.objectUrl;
      setResult(validation);
      onUpdate({ reviewed: true, passed: computePassed(validation) });
    } catch {
      setError('Could not read this file — try a different image.');
    }
  };

  return (
    <Card aria-labelledby={`${spec.id}-heading`} className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <h3 id={`${spec.id}-heading`} className="text-base font-semibold text-foreground">
          {spec.name}
        </h3>
        <div className="flex flex-shrink-0 items-center gap-2">
          {verdict && <Badge variant={verdict.variant}>{verdict.label}</Badge>}
          <span
            className={cn(
              'text-xs font-medium',
              spec.priority === 'required' ? 'text-blue-500' : 'text-muted-foreground',
            )}
          >
            {spec.priority === 'required' ? 'Required' : 'Nice to have'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
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

        <div className="mt-auto flex flex-col gap-4 pt-2">
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
        </div>
      </CardContent>
    </Card>
  );
}
