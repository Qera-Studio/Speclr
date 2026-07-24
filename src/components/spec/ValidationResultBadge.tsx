import { X, Minus, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BlueCheck } from '@/components/ui/blue-check';
import type { ValidationResult, ValidationTriState } from '@/lib/spec/types';

type Status = 'pass' | 'fail' | 'unknown' | 'warning';

/** A status icon carrying its meaning to assistive tech via an accessible label. */
function StatusIcon({ status }: { status: Status }) {
  if (status === 'pass') {
    return <BlueCheck aria-label="Pass" className="rounded-full" />;
  }

  const meta = {
    fail: { label: 'Fail', Icon: X, className: 'text-destructive' },
    warning: { label: 'Warning', Icon: TriangleAlert, className: 'text-amber-500' },
    unknown: { label: 'Unknown', Icon: Minus, className: 'text-muted-foreground' },
  }[status];

  return (
    <span role="img" aria-label={meta.label} className={cn('inline-flex', meta.className)}>
      <meta.Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

function statusFor(ok: ValidationTriState): Status {
  if (ok === 'unknown') return 'unknown';
  return ok ? 'pass' : 'fail';
}

export default function ValidationResultBadge({ result }: { result: ValidationResult }) {
  const dimensions = statusFor(result.dimensionsOk);
  const format = statusFor(result.formatOk);

  const transparency: Status =
    result.transparency === 'unknown' ? 'unknown' : result.transparencyIsWarning ? 'warning' : 'pass';

  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      <li className="flex items-center gap-2">
        <StatusIcon status={dimensions} />
        <span className="text-foreground">
          Dimensions
          {result.actualWidth && result.actualHeight ? ` — ${result.actualWidth}×${result.actualHeight}px` : ''}
        </span>
      </li>
      <li className="flex items-center gap-2">
        <StatusIcon status={format} />
        <span className="text-foreground">Format{result.actualFormat ? ` — ${result.actualFormat}` : ''}</span>
      </li>
      <li className="flex items-center gap-2">
        <StatusIcon status={transparency} />
        <span className="text-foreground">
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
