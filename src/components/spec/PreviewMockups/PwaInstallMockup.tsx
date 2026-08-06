import { displayDomain } from '@/lib/spec/displayDomain';

interface PwaInstallMockupProps {
  /** Uploaded icon; when absent the slot shows an empty placeholder. */
  imageUrl?: string;
  alt: string;
  /** App name shown in the sheet — the client/project name. */
  brandName?: string;
  /** Origin shown beneath the name; falls back to a slugged brand name. */
  domain?: string;
}

/**
 * The browser's "Install app" sheet — the surface the 512px manifest icon
 * exists for.
 *
 * This is where the icon is rendered largest anywhere in the install flow, so a
 * low-resolution or upscaled mark is most obvious here. Chrome renders the icon
 * at 64dp in this sheet, sourced from the largest manifest icon available.
 */
export default function PwaInstallMockup({ imageUrl, alt, brandName, domain }: PwaInstallMockupProps) {
  const name = brandName?.trim() || 'Sample Brand';
  const origin = displayDomain(brandName, domain);

  return (
    <div className="w-full max-w-[320px] rounded-xl border border-border bg-background p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full rounded-xl border border-dashed border-muted-foreground/40 bg-muted-foreground/10" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{origin}</p>
        </div>
      </div>

      {/* The sheet's actions. Inert markup, not buttons — this is an
          illustration of Chrome's chrome, and a focusable control here would
          put a dead stop in the card's tab order. */}
      <div className="mt-4 flex justify-end gap-2" aria-hidden="true">
        <span className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground">Cancel</span>
        <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
          Install
        </span>
      </div>
    </div>
  );
}
