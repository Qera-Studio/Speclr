'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { BlueCheck } from '@/components/ui/blue-check';
import { CopyButton } from '@/components/ui/copy-button';
import type { IconSpec, SlotState, ValidationResult } from '@/lib/spec/types';
import { useImageValidation } from '@/lib/spec/useImageValidation';
import { computePassed } from '@/lib/spec/computePassed';
import { loadImageStore, saveSlotImage, removeSlotImage } from '@/lib/spec/imageStore';
import UploadDropzone from './UploadDropzone';
import SpecDetailsTabs from './SpecDetailsTabs';
import ValidationResultBadge from './ValidationResultBadge';
import PreviewMockup from './PreviewMockups/PreviewMockup';

interface IconSpecCardProps {
  spec: IconSpec;
  slotState: SlotState;
  onUpdate: (patch: Partial<SlotState>) => void;
}

type Verdict = { label: string; variant: 'default' | 'destructive' | 'secondary' } | null;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

/** Reconstruct a File from a stored data URL so it can be re-validated on load. */
function dataUrlToFile(dataUrl: string, name: string): File | null {
  try {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const ext = mime.split('/')[1]?.split('+')[0] ?? 'bin';
    return new File([bytes], `${name}.${ext}`, { type: mime });
  } catch {
    return null;
  }
}

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
  // Notes are collapsed by default to keep cards light; opened on demand, or
  // already-open when the slot arrives with a note (e.g. from an import).
  const [showNotes, setShowNotes] = useState(slotState.notes.trim().length > 0);

  // The blob: URL currently backing the preview. Each upload mints a new one via
  // URL.createObjectURL; we revoke the previous one when it's superseded and on
  // unmount so re-uploads don't leak blobs.
  const objectUrlRef = useRef<string | null>(null);

  const verdict = verdictFor(slotState);

  // Validate a file and refresh the preview/result. `persist` controls whether
  // the image is written to localStorage (true for a fresh upload, false when
  // we're re-validating an already-stored image on mount). Returns the computed
  // pass state, or null if the file couldn't be read.
  const runValidation = async (file: File, persist: boolean): Promise<boolean | null | 'error'> => {
    try {
      const validation = await validateFile(file, spec);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = validation.objectUrl;
      setResult(validation);
      setFileName(file.name);
      const passed = computePassed(validation);
      if (persist) {
        const dataUrl = await fileToDataUrl(file);
        saveSlotImage(spec.id, dataUrl);
      }
      return passed;
    } catch {
      setError('Could not read this file — try a different image.');
      return 'error';
    }
  };

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  // On mount, restore a previously-uploaded image for this slot (if any) so its
  // preview + validation rows come back after a reload. Runs once.
  useEffect(() => {
    const stored = loadImageStore()[spec.id];
    if (!stored) return;
    const file = dataUrlToFile(stored, `${spec.id}-restored`);
    if (file) void runValidation(file, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelected = async (file: File) => {
    setError(null);
    setFileName(file.name);
    const passed = await runValidation(file, true);
    if (passed !== 'error') {
      // A fully-verified pass auto-marks the slot reviewed (one-step done). A
      // fail or a neutral/unverifiable result (.ico/SVG) records only the
      // outcome and leaves the explicit "reviewed" sign-off to the user.
      onUpdate(passed === true ? { passed, reviewed: true } : { passed });
    }
  };

  return (
    <Card aria-labelledby={`${spec.id}-heading`} className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <h3 id={`${spec.id}-heading`} className="text-base font-semibold text-foreground">
          {spec.name}
        </h3>
        <div className="flex flex-shrink-0 items-center gap-2">
          {slotState.reviewed && slotState.passed === true ? (
            // Reviewed AND passed: a single blue tick replaces both the verdict
            // badge and the priority text.
            <BlueCheck aria-label="Passed" className="rounded-xs" />
          ) : (
            <>
              {verdict && <Badge variant={verdict.variant}>{verdict.label}</Badge>}
              <span
                className={cn(
                  'text-xs font-medium',
                  spec.priority === 'required' ? 'text-blue-500' : 'text-muted-foreground',
                )}
              >
                {spec.priority === 'required' ? 'Required' : 'Nice to have'}
              </span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <dl className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 rounded-md border border-border px-3 py-2">
            <dt className="text-xs text-muted-foreground">Filename</dt>
            <dd className="flex items-center justify-between gap-1.5">
              <span className="truncate font-mono text-sm text-foreground" title={spec.filename}>
                {spec.filename}
              </span>
              <CopyButton
                value={spec.filename}
                label="Copy filename"
                className="size-5 shrink-0"
              />
            </dd>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-border px-3 py-2">
            <dt className="text-xs text-muted-foreground">Size</dt>
            <dd className="text-sm text-foreground">
              {spec.acceptedDimensions.length > 0
                ? spec.acceptedDimensions.map((d) => `${d.width}×${d.height}px`).join(' or ')
                : 'Vector — no fixed pixel size'}
            </dd>
          </div>
        </dl>

        <SpecDetailsTabs
          tabs={[
            { id: 'used-in', label: 'Used in', content: spec.usedIn },
            { id: 'why', label: 'Why it matters', content: spec.whyItMatters },
            { id: 'standard', label: 'Industry standard', content: spec.industryStandard },
          ]}
        />

        <div className="mt-auto flex flex-col gap-4 pt-2">
          <UploadDropzone id={spec.id} format={spec.format} fileName={fileName} onFileSelected={handleFileSelected} />

          {/* The primary per-card action — a full-width, easy-to-hit panel. The
              whole label toggles the checkbox natively. */}
          <label
            htmlFor={`${spec.id}-reviewed`}
            className={cn(
              'flex w-full cursor-pointer select-none items-center gap-3 rounded-md border px-4 py-3 text-sm font-medium transition-colors',
              slotState.reviewed
                ? 'border-primary/40 bg-primary/10 text-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Checkbox
              id={`${spec.id}-reviewed`}
              checked={slotState.reviewed}
              onCheckedChange={(checked) => onUpdate({ reviewed: Boolean(checked) })}
            />
            {slotState.reviewed ? 'Reviewed' : 'Mark reviewed'}
          </label>

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

          {showNotes ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={`${spec.id}-notes`}>Notes</Label>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate({ notes: '' });
                    setShowNotes(false);
                  }}
                  aria-label="Delete note"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Delete
                </button>
              </div>
              <Textarea
                id={`${spec.id}-notes`}
                value={slotState.notes}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                rows={2}
                placeholder="Optional notes for this slot…"
                autoFocus
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Add note
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
