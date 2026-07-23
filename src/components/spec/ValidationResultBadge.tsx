import { Badge } from '@/components/ui/badge';
import type { ValidationResult, ValidationTriState } from '@/lib/spec/types';

function statusFor(ok: ValidationTriState): { label: string; variant: 'default' | 'destructive' | 'secondary' } {
  if (ok === 'unknown') return { label: 'Unknown', variant: 'secondary' };
  return ok ? { label: 'Pass', variant: 'default' } : { label: 'Fail', variant: 'destructive' };
}

export default function ValidationResultBadge({ result }: { result: ValidationResult }) {
  const dimensions = statusFor(result.dimensionsOk);
  const format = statusFor(result.formatOk);

  const transparency =
    result.transparency === 'unknown'
      ? { label: 'Unknown', variant: 'secondary' as const }
      : result.transparencyIsWarning
        ? { label: 'Warning', variant: 'destructive' as const }
        : { label: 'Pass', variant: 'default' as const };

  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      <li className="flex items-center gap-2">
        <Badge variant={dimensions.variant}>{dimensions.label}</Badge>
        <span className="text-muted-foreground">
          Dimensions
          {result.actualWidth && result.actualHeight ? ` — ${result.actualWidth}×${result.actualHeight}px` : ''}
        </span>
      </li>
      <li className="flex items-center gap-2">
        <Badge variant={format.variant}>{format.label}</Badge>
        <span className="text-muted-foreground">Format{result.actualFormat ? ` — ${result.actualFormat}` : ''}</span>
      </li>
      <li className="flex items-center gap-2">
        <Badge variant={transparency.variant}>{transparency.label}</Badge>
        <span className="text-muted-foreground">
          {result.transparency === 'unknown'
            ? 'Transparency — not checked for this format'
            : result.transparency === 'transparent'
              ? 'Transparency detected — this slot expects a solid/opaque background'
              : 'No transparency detected'}
        </span>
      </li>
      {result.note && <li className="text-xs text-muted-foreground">{result.note}</li>}
    </ul>
  );
}
