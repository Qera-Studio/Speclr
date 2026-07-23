interface MockupProps {
  imageUrl: string;
  alt: string;
}

// Uploaded assets are local blob: object URLs, not static paths next/image can
// optimize — a plain <img> is the correct tool here.
export default function BrowserTabMockup({ imageUrl, alt }: MockupProps) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <div className="flex">
        <div className="flex items-center gap-2 rounded-t-md border border-border bg-background px-3 py-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={alt} width={16} height={16} className="h-4 w-4 object-contain" />
          <span className="text-xs text-foreground">Sample Brand</span>
        </div>
      </div>
    </div>
  );
}
