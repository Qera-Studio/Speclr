import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * @level molecule
 *
 * An identity string: a document number, a GSTIN, a PAN, an IFSC, an
 * employee code, a uuid, an amount in a column that is scanned down. Anything
 * a reader compares character by character against a certificate or a bank
 * statement is set in mono with tabular figures (`docs/design.md` §1.4), and
 * this is the one place that is decided; `font-mono` outside it fails the
 * build. Prose never gets it.
 */
export function Mono({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('font-mono tabular-nums', className)} {...props} />;
}
