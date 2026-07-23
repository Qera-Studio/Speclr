interface MockupProps {
  imageUrl: string;
  alt: string;
}

export default function GoogleSerpMockup({ imageUrl, alt }: MockupProps) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <div className="mb-1 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={alt} width={18} height={18} className="h-[18px] w-[18px] rounded-full object-cover" />
        <div>
          <p className="text-xs text-foreground">Sample Brand</p>
          <p className="text-xs text-muted-foreground">www.samplebrand.com</p>
        </div>
      </div>
      <p className="text-sm text-primary">Sample Brand — Home</p>
      <p className="text-xs text-muted-foreground">
        A short placeholder description showing how this favicon appears next to a search result.
      </p>
    </div>
  );
}
