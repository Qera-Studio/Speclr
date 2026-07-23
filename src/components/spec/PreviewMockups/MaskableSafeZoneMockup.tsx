interface MockupProps {
  imageUrl: string;
  alt: string;
}

export default function MaskableSafeZoneMockup({ imageUrl, alt }: MockupProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-muted/40 p-3">
      <div className="relative h-24 w-24 overflow-hidden rounded-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto h-[80%] w-[80%] rounded-full border-2 border-dashed border-primary/70"
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Keep essential content inside the circle — Android may crop anything outside it into a circle, squircle, or
        rounded square.
      </p>
    </div>
  );
}
