'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Pencil, Printer } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { RemoveButton } from '@/components/ui/remove-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { deleteDraftAction, duplicateDocument } from '@/server/actions/documents';
import { DEV_UNLIMITED } from '@/lib/devMode';
import type { AdminDocument } from '@/lib/domain/types';

/**
 * Per-row actions on the documents list, revealed on hover.
 *
 * A draft can be edited or thrown away; a finalized document can only be
 * printed or duplicated — it is immutable by design, so there is deliberately
 * no edit here. (`Delete` on a finalized document is the pre-launch escape
 * hatch only; `DEV_UNLIMITED` is inlined at build time, so it is not in the
 * production bundle.)
 *
 * The buttons fade in on hover but are never `display:none` — they stay in the
 * tab order, and `focus-within` on the row reveals them for keyboard users.
 */
export default function DocumentRowActions({ doc }: { doc: AdminDocument }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onDuplicate = async () => {
    setBusy(true);
    const result = await duplicateDocument(doc.id);
    setBusy(false);
    if (result.success && result.id) router.push(`/docs/${result.id}`);
  };

  // Refreshed either way: if the delete was refused, the row stays — which is
  // the honest outcome, and better than a row that vanishes optimistically.
  const onDelete = async () => {
    await deleteDraftAction(doc.id);
    router.refresh();
  };

  const iconLink = (href: string, label: string, Icon: typeof Printer) => (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            aria-label={label}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon' }),
              'text-muted-foreground transition-colors hover:text-foreground',
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
          </Link>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  const isDraft = doc.status === 'draft';

  return (
    <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
      {isDraft ? (
        iconLink(`/docs/${doc.id}`, 'Edit draft', Pencil)
      ) : (
        <>
          {/* `auto=1` prints on arrival — from a list row, Print means print.
              The document number in the first column is the way to preview. */}
          {iconLink(`/docs/${doc.id}/print?auto=1`, 'Print', Printer)}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  onClick={onDuplicate}
                  aria-label="Duplicate as new draft"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Copy aria-hidden="true" className="size-4" />
                </Button>
              }
            />
            <TooltipContent>Duplicate as new draft</TooltipContent>
          </Tooltip>
        </>
      )}

      {isDraft ? (
        <RemoveButton
          label="Delete draft"
          confirmTitle="Delete this draft?"
          confirmDescription="This cannot be undone."
          onConfirm={onDelete}
        />
      ) : DEV_UNLIMITED ? (
        <RemoveButton
          label="Delete (dev only)"
          confirmTitle="Delete this finalized document?"
          confirmDescription="Testing escape hatch — finalized documents are permanent in production. This cannot be undone."
          onConfirm={onDelete}
        />
      ) : null}
    </div>
  );
}
