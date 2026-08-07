'use client';

import { AddButton } from '@/components/ui/add-button';
import { useNewDocument } from './NewDocumentCommand';

/**
 * The one create affordance: opens the ⌘D palette instead of picking a type
 * for the user.
 *
 * Replaces the dashboard's old `New invoice` link, which quietly asserted that
 * an invoice is the default document — it isn't; the studio issues seven kinds
 * and a contract or an offer letter is just as likely a starting point.
 */
export default function NewDocumentButton({
  children = 'New document',
  className,
  variant,
}: {
  children?: React.ReactNode;
  className?: string;
  variant?: React.ComponentProps<typeof AddButton>['variant'];
}) {
  const { open } = useNewDocument();

  return (
    <AddButton onClick={open} aria-haspopup="dialog" variant={variant} className={className}>
      {children}
    </AddButton>
  );
}
