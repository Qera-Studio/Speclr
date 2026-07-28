import { displayDomain } from '@/lib/spec/displayDomain';

interface MockupProps {
  imageUrl: string;
  alt: string;
  square?: boolean;
  /** Client/project name shown as the card title. */
  brandName?: string;
  /** Domain shown beneath the title; falls back to a slugged brand name. */
  domain?: string;
}

export default function SocialCardMockup({ imageUrl, alt, square = false, brandName, domain }: MockupProps) {
  const title = brandName?.trim() || 'Sample Brand';
  const url = displayDomain(brandName, domain);

  return (
    <div className="overflow-hidden rounded-md border border-border bg-muted/40">
      <div className={square ? 'aspect-square' : 'aspect-[1200/630]'}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
      </div>
      <div className="p-3">
        <p className="text-sm text-foreground">{title} — Home</p>
        <p className="text-xs text-muted-foreground">{url}</p>
      </div>
    </div>
  );
}
