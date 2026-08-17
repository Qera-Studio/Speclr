'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  ATTACHMENT_KIND_DESCRIPTIONS,
  ATTACHMENT_KIND_LABELS,
  attachmentAcceptFor,
  type AttachmentKind,
} from '@/lib/domain/client';

/**
 * Which document is this? Asked *before* the file picker opens.
 *
 * It replaces a `Combobox` sitting above the drop zone, which was the same
 * *mode* the per-document slots were built to remove: the type was set once and
 * stayed set, so the next upload was filed as whatever the last one had been.
 * Here the type is chosen and the picker opens in the same click, so there is
 * no state left behind to be wrong the next time.
 *
 * The cards show what each document looks like rather than only naming it,
 * because the operator is holding a scan and matching it to a card, not reading
 * a list of terms.
 */
interface AttachmentTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The kinds on offer, in the order they are shown. */
  kinds: readonly AttachmentKind[];
  /**
   * A file already in hand, from a drop onto the box. When set, choosing a card
   * uploads *this* file — asking for it again would be asking twice.
   */
  pendingFile?: File;
  onPicked: (kind: AttachmentKind, file: File) => void;
}

export default function AttachmentTypeDialog({
  open,
  onOpenChange,
  kinds,
  pendingFile,
  onPicked,
}: AttachmentTypeDialogProps) {
  const [query, setQuery] = useState('');
  /** The card whose picker is open, so the `change` handler knows the kind. */
  const chosen = useRef<AttachmentKind | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // A stale query would filter the next opening down to whatever was typed the
  // last time, which is the mode this dialog exists to remove.
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    // `other` is never filtered out. It is the answer for a document none of
    // the cards name, so a query matching nothing must still leave it standing
    // — an empty grid would be the one case where the operator most needs it.
    const listed = kinds.filter((kind) => kind !== 'other');
    const matched = q
      ? listed.filter((kind) => ATTACHMENT_KIND_LABELS[kind].toLowerCase().includes(q))
      : listed;
    return kinds.includes('other') ? [...matched, 'other' as AttachmentKind] : matched;
  }, [kinds, query]);

  const choose = (kind: AttachmentKind) => {
    if (pendingFile) {
      onPicked(kind, pendingFile);
      onOpenChange(false);
      return;
    }
    chosen.current = kind;
    // Set on the node and clicked in the same tick, not through state: a file
    // dialog only opens while the browser still counts this as the user's own
    // click, and waiting for a re-render spends that.
    if (!inputRef.current) return;
    inputRef.current.accept = attachmentAcceptFor(kind);
    inputRef.current.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a document</DialogTitle>
          <DialogDescription>
            {pendingFile
              ? `What is ${pendingFile.name}?`
              : 'Pick what you are adding, then choose the file.'}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            size="form"
            aria-label="Search document types"
            placeholder="Search document types…"
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <ul className="grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((kind) => (
            <li key={kind}>
              <button
                type="button"
                onClick={() => choose(kind)}
                className="group/card flex w-full cursor-pointer flex-col gap-2 rounded-md p-1 text-center transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <KindName kind={kind} />
                <span className="px-1 pb-1 text-xs text-balance text-muted-foreground">
                  {ATTACHMENT_KIND_DESCRIPTIONS[kind]}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* One picker for every card: the accept filter is set by whichever was
            clicked. `sr-only` rather than absent, the same rule as
            `UploadDropzone` — it is what carries the file dialog. */}
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file || !chosen.current) return;
            onPicked(chosen.current, file);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * The page, with its own name written on it.
 *
 * It held grey skeleton bars first, and they read as a card still loading:
 * every one identical, and the shape of a page carries less than the name of
 * the document does. The name goes in the frame instead, centred, which also
 * gives it the weight the row underneath was not giving it.
 */
function KindName({ kind }: { kind: AttachmentKind }) {
  return (
    <div className="flex aspect-3/4 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-md border border-border bg-card p-4 text-center transition-colors group-hover/card:border-primary/40">
      {kind === 'other' ? (
        <Plus aria-hidden className="size-5 text-muted-foreground" />
      ) : null}
      <span className="text-sm font-medium text-balance text-foreground">
        {ATTACHMENT_KIND_LABELS[kind]}
      </span>
    </div>
  );
}
