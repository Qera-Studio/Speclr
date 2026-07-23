interface MockupProps {
  imageUrl: string;
  alt: string;
}

export default function IOSHomeScreenMockup({ imageUrl, alt }: MockupProps) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md border border-border bg-muted/40 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={alt} width={80} height={80} className="h-20 w-20 rounded-[18px] object-cover" />
      <span className="text-xs text-foreground">Sample Brand</span>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        iOS applies its own rounded-corner mask — this is an approximation for judging centering and background color.
      </p>
    </div>
  );
}
