import { displayDomain } from '@/lib/spec/displayDomain';

interface MockupProps {
  imageUrl: string;
  alt: string;
  /** Client/project name shown as the result title. */
  brandName?: string;
  /** Domain shown under the title; falls back to a slugged brand name. */
  domain?: string;
}

export default function GoogleSerpMockup({ imageUrl, alt, brandName, domain }: MockupProps) {
  const title = brandName?.trim() || 'Sample Brand';
  const url = displayDomain(brandName, domain);

  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <div className="mb-1 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={alt} width={18} height={18} className="h-[18px] w-[18px] rounded-full object-cover" />
        <div>
          <p className="text-xs text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">www.{url}</p>
        </div>
      </div>
      <p className="text-sm text-primary">{title} — Home</p>
      <p className="text-xs text-muted-foreground">
        A short placeholder description showing how this favicon appears next to a search result.
      </p>
    </div>
  );
}
