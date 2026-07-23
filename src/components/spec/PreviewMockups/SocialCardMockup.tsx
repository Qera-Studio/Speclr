interface MockupProps {
  imageUrl: string;
  alt: string;
  square?: boolean;
}

export default function SocialCardMockup({ imageUrl, alt, square = false }: MockupProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-muted/40">
      <div className={square ? 'aspect-square' : 'aspect-[1200/630]'}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
      </div>
      <div className="p-3">
        <p className="text-sm text-foreground">Sample Brand — Home</p>
        <p className="text-xs text-muted-foreground">samplebrand.com</p>
      </div>
    </div>
  );
}
