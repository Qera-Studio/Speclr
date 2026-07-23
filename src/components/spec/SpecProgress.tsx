interface SpecProgressProps {
  reviewed: number;
  total: number;
}

export default function SpecProgress({ reviewed, total }: SpecProgressProps) {
  const percent = total === 0 ? 0 : Math.round((reviewed / total) * 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-valuenow={reviewed}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${reviewed} of ${total} icon slots reviewed`}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {reviewed} of {total} reviewed
      </p>
    </div>
  );
}
