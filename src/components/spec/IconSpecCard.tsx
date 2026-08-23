'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { BlueCheck } from '@/components/ui/blue-check';
import { CopyButton } from '@/components/ui/copy-button';
import type { IconSpec, PreviewMockupKind, SlotState, ValidationResult } from '@/lib/spec/types';
import { useImageValidation } from '@/lib/spec/useImageValidation';
import { computePassed } from '@/lib/spec/computePassed';
import { applicableCriteria } from '@/lib/spec/applicableCriteria';
import { loadImageStore, saveSlotImage, removeSlotImage } from '@/lib/spec/imageStore';
import UploadDropzone from '@/components/form/UploadDropzone';
import { ACCEPT_BY_FORMAT } from '@/lib/spec/accept';
import UploadedAttachment from './UploadedAttachment';
import SpecDetailsTabs from './SpecDetailsTabs';
import ReviewedItem from './ReviewedItem';
import PreviewMockup from './PreviewMockups/PreviewMockup';

interface IconSpecCardProps {
  spec: IconSpec;
  slotState: SlotState;
  onUpdate: (patch: Partial<SlotState>) => void;
  /** Client/project name, shown as the brand label in previews (e.g. the browser tab). */
  clientName?: string;
  /** Website/domain, surfaced in preview mockups that show a URL. */
  domain?: string;
}

type Verdict = { label: string; variant: 'default' | 'destructive' | 'secondary' } | null;

// Mockups shown as a persistent, centred template in the card body (visible
// before upload). Others still live inside the checks dropdown post-upload.
const CENTER_PREVIEW_KINDS: PreviewMockupKind[] = [
  'browserTab',
  'bookmarksBar',
  'safariPinnedTab',
  'iosHomeScreen',
  'androidLauncher',
  'pwaInstall',
  'googleSerp',
];

// How each centred mockup meets the card's edges. Browser chrome and the
// bookmarks bar are strips that run off both sides, so they fade left/right.
// The phone is a whole object that must stay fully visible — it only runs off
// the bottom, so it fades there instead. Fading a phone at its sides would clip
// its frame and read as a rendering bug.
const EDGE_FADE: Partial<Record<PreviewMockupKind, string>> = {
  browserTab: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
  bookmarksBar: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
  // The pinned-tab row starts at the card's centre and runs off the right, so it
  // only fades on that side — fading the left would cut the uploaded tab.
  safariPinnedTab: 'linear-gradient(to right, black 55%, transparent)',
  // No entry for iosHomeScreen: that svg is h-auto and shorter than this
  // container, so a mask here would resolve in empty space below the phone. It
  // carries its own bottom fade instead.
  //
  // The SERP page is a zoomed crop, so it meets the frame on all four edges.
  // Both gradients fade at each end, intersected. The ramps are deliberately
  // tight — 2% leading, 4% trailing — because this preview is dense text: a
  // wider ramp reads as a shadow washing over the content rather than an edge.
  googleSerp:
    'linear-gradient(to right, transparent, black 2%, black 96%, transparent), linear-gradient(to bottom, transparent, black 2%, black 96%, transparent)',
};

/** Mask sources that layer two gradients need composited, not just stacked. */
const EDGE_FADE_COMPOSITE: Partial<Record<PreviewMockupKind, string>> = {
  // Without `intersect` the two gradients union, which leaves both edges opaque
  // and fades nothing.
  googleSerp: 'intersect',
};

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

/**
 * Map a reviewed slot's pass/fail outcome to a header pill, or null. A neutral
 * (passed === null) slot shows no badge — the mark-reviewed panel itself now
 * carries the "Manually reviewed" wording, so a top-right tag would be
 * redundant. Before review, no badge either.
 */
function verdictFor(slotState: SlotState): Verdict {
  if (!slotState.reviewed) return null;
  if (slotState.passed === true) return { label: 'Pass', variant: 'default' };
  if (slotState.passed === false) return { label: 'Fail', variant: 'destructive' };
  return null;
}

export default function IconSpecCard({ spec, slotState, onUpdate, clientName, domain }: IconSpecCardProps) {
  const { validateFile } = useImageValidation();
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Notes are collapsed by default to keep cards light; opened on demand, or
  // already-open when the slot arrives with a note (e.g. from an import).
  const [showNotes, setShowNotes] = useState(slotState.notes.trim().length > 0);

  // The blob: URL currently backing the preview. Each upload mints a new one via
  // URL.createObjectURL; we revoke the previous one when it's superseded and on
  // unmount so re-uploads don't leak blobs.
  const objectUrlRef = useRef<string | null>(null);

  const verdict = verdictFor(slotState);
  const reviewedAndPassed = slotState.reviewed && slotState.passed === true;
  // A centred live preview claims the card's free vertical space; when it's
  // shown the upload block drops its `mt-auto` so the preview can centre. These
  // mockups are persistent templates — visible even before a file is uploaded
  // (they show an empty favicon slot until then).
  const showCenterPreview = CENTER_PREVIEW_KINDS.includes(spec.previewMockup);

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
      setFileMeta({ name: file.name, size: file.size });
      const passed = computePassed(validation, applicableCriteria(spec));
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
    setFileMeta({ name: file.name, size: file.size });
    const passed = await runValidation(file, true);
    if (passed !== 'error') {
      // A fully-verified pass auto-marks the slot reviewed (one-step done). A
      // fail or a neutral/unverifiable result (.ico/SVG) records only the
      // outcome and leaves the explicit "reviewed" sign-off to the user.
      onUpdate(passed === true ? { passed, reviewed: true } : { passed });
    }
  };

  // Remove the uploaded file: clear local preview/validation, drop the stored
  // image, and reset the slot's verdict + reviewed state back to empty.
  const handleRemoveFile = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setResult(null);
    setFileMeta(null);
    setError(null);
    removeSlotImage(spec.id);
    onUpdate({ passed: null, reviewed: false });
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
            <BlueCheck aria-label="Passed" className="size-3.5 rounded-xs" />
          ) : (
            <>
              {verdict && <Badge variant={verdict.variant}>{verdict.label}</Badge>}
              <span
                className={cn(
                  'text-xs font-medium',
                  spec.priority === 'required' ? 'text-primary' : 'text-muted-foreground',
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
            <dt className="text-sm text-muted-foreground">Filename</dt>
            <dd className="flex items-center justify-between gap-1.5">
              <span className="truncate font-mono text-sm text-foreground" title={spec.filename}>
                {spec.filename}
              </span>
              <CopyButton
                value={spec.filename}
                label="Copy file name"
                className="size-5 shrink-0"
              />
            </dd>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-border px-3 py-2">
            <dt className="text-sm text-muted-foreground">Size</dt>
            <dd className="text-sm text-foreground">
              {spec.acceptedDimensions.length > 0
                ? spec.acceptedDimensions.map((d) => `${d.width}×${d.height}px`).join(' / ')
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

        {/* Live preview — how the uploaded asset actually looks where it's used.
            Centred in the card's middle space, always visible once a file is in.
            Rolling out one mockup kind at a time (browser tab first). */}
        {showCenterPreview && (
          <div
            // The shared 500x250 frame — every preview gets the same one, so no
            // mockup can set its card's height by being unusually tall, and
            // overflow-hidden contains the ones that scale up or bleed past it.
            // Fixed size, so the card's spare height is left to the spacer below
            // rather than padding this frame out.
            className="mx-auto flex h-[250px] w-full max-w-[500px] flex-none items-center justify-center overflow-hidden"
            // Blend the mockup into the card instead of hard-cutting it. The
            // direction depends on which way the mockup overflows — see EDGE_FADE.
            style={{
              maskImage: EDGE_FADE[spec.previewMockup],
              WebkitMaskImage: EDGE_FADE[spec.previewMockup],
              maskComposite: EDGE_FADE_COMPOSITE[spec.previewMockup],
              WebkitMaskComposite: EDGE_FADE_COMPOSITE[spec.previewMockup] && 'source-in',
            }}
          >
            <PreviewMockup
              kind={spec.previewMockup}
              imageUrl={result?.objectUrl}
              alt={`${spec.name} preview`}
              brandName={clientName}
              domain={domain}
            />
          </div>
        )}

        <div className={cn('flex flex-col gap-4 pt-2', !showCenterPreview && 'mt-auto')}>
          <UploadDropzone
            id={`upload-${spec.id}`}
            accept={ACCEPT_BY_FORMAT[spec.format]}
            hasFile={Boolean(fileMeta?.name)}
            onFileSelected={handleFileSelected}
            attachment={
              fileMeta && result ? (
                <UploadedAttachment
                  name={fileMeta.name}
                  size={fileMeta.size}
                  format={spec.format}
                  objectUrl={result.objectUrl}
                  onRemove={handleRemoveFile}
                />
              ) : undefined
            }
          />

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          {result && (
            // After any upload → a compact Item-style verdict row. It reads blue
            // "All checks passed" on a clean pass, or amber "N passed · M failed
            // · K warnings" otherwise. The individual check rows and the preview
            // live inside its collapsible body.
            <ReviewedItem
              result={result}
              criteria={applicableCriteria(spec)}
              preview={
                // Kinds already surfaced centrally are omitted here to avoid
                // duplication; the rest still live inside the dropdown until
                // they're moved out too.
                spec.previewMockup !== 'none' && !showCenterPreview ? (
                  <PreviewMockup kind={spec.previewMockup} imageUrl={result.objectUrl} alt={`${spec.name} preview`} />
                ) : undefined
              }
            />
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
