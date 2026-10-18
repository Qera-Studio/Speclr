'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty';
import { DrawerSheet } from '@/components/ui/drawer-sheet';
import { DrawerToolbar } from '@/components/patterns/DrawerToolbar';
import { ArchiveButton } from '@/components/patterns/RowActions';
import ItemForm from './ItemForm';
import { archiveServiceItem, saveServiceItem } from '@/server/actions/services';
import { formatQuote } from '@/lib/domain/quotation';
import { Badge } from '@/components/ui/badge';
import { rupeesToPaise } from '@/lib/domain/money';
import { itemRateUnit, type ServiceItem } from '@/lib/domain/serviceItem';
import type { ContractService } from '@/lib/domain/service';
import { cn } from '@/lib/utils';
import { QUIET, TEXT_BUTTON } from './quiet';

/**
 * A Service's price list: every item, grouped under its rate-card heading,
 * with the price edited in place and everything else in the side panel.
 *
 * **Grouped, never paginated** (16 October 2026). The old table cut the list
 * into pages of ten, which split `WEB`'s six groups across pages and never
 * showed the group at all, though the group is how the rate cards are laid
 * out and how anybody looks for an item. Fifty-two rows at 40px is shorter
 * than the forms this page used to carry below them.
 *
 * **Which item is open belongs to the page**, not to this list, because the
 * page header's "Add item" opens the same panel.
 *
 * Saving still **posts one item, never the list** (`saveServiceItem`): two
 * people editing different items under one Service would otherwise each save
 * their own copy of all of them, and the second would undo the first.
 */
export default function ItemsManager({
  service,
  editingId,
  onEditingChange,
}: {
  service: ContractService;
  /** The open item's id, `''` for a new one, null for closed. */
  editingId: string | null;
  onEditingChange: (id: string | null) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState('');

  const all = useMemo(() => service.items ?? [], [service.items]);
  const archivedCount = all.filter((item) => item.archived).length;
  const q = query.trim().toLowerCase();
  const rows = all.filter(
    (item) =>
      (showArchived || !item.archived) &&
      (!q || item.name.toLowerCase().includes(q) || (item.blurb ?? '').toLowerCase().includes(q)),
  );

  /*
    Groups in the order their first item appears, which is the rate card's
    order. Items with no group close the list under "Other", and a service
    whose items carry no groups at all shows one unheaded list.
  */
  const sections = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, ServiceItem[]>();
    for (const item of rows) {
      const key = item.group ?? '';
      if (!byGroup.has(key)) {
        byGroup.set(key, []);
        if (key) order.push(key);
      }
      byGroup.get(key)!.push(item);
    }
    if (byGroup.has('')) order.push('');
    return order.map((group) => ({ group, items: byGroup.get(group)! }));
  }, [rows]);
  const grouped = sections.some((s) => s.group !== '');
  // The panel pages through the rows in the order they are drawn.
  const ordered = sections.flatMap((s) => s.items);

  const editing = editingId ? (all.find((item) => item.id === editingId) ?? null) : null;
  const at = editing ? ordered.findIndex((item) => item.id === editing.id) : -1;

  /*
    The groups this service already uses, offered as suggestions in the form,
    with how many items each holds for the remove-a-group confirmation.
    Derived from the items, never stored (`PRINCIPLES.md` rule 3).
  */
  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of all) {
      if (item.group) counts.set(item.group, (counts.get(item.group) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [all]);

  const onArchive = (item: ServiceItem, archived: boolean) =>
    startTransition(async () => {
      const result = await archiveServiceItem(service.code, item.id, archived);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to archive the item.');
        return;
      }
      router.refresh();
    });

  const live = all.filter((item) => !item.archived).length;

  return (
    <section aria-labelledby="price-list-heading" className="flex flex-col gap-4">
      <div className="flex h-7 items-center gap-2">
        <h2 id="price-list-heading" className="text-lead font-normal text-muted-foreground">
          Price list
        </h2>
        <Badge variant="secondary" className="font-normal text-muted-foreground tabular-nums">
          {live}
        </Badge>
        {all.length > 0 ? (
          <div className="ml-auto flex items-center gap-3">
            <div className="relative w-56">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-tab-label"
              />
              <Input
                type="search"
                aria-label="Search the price list"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-7 border-border/50 pl-8 hover:border-tab-label/50"
              />
            </div>
            {archivedCount > 0 ? (
              <Button
                size="sm"
                aria-pressed={showArchived}
                onClick={() => setShowArchived((v) => !v)}
                className={cn(QUIET, showArchived && 'border-tab-label/50 text-muted-foreground')}
              >
                Archived
                <span className="tabular-nums">{archivedCount}</span>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {all.length === 0 ? (
        <EmptyState
          preset="none-yet"
          noun="item"
          description="Items are what you price and quote: a page, a round of revisions, a monthly retainer."
          action={
            <Button size="sm" className={QUIET} onClick={() => onEditingChange('')}>
              Add the first item
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <p className="text-body text-tab-label">No items match “{query.trim()}”.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {sections.map(({ group, items }) => (
            <div key={group || 'other'} className="flex flex-col gap-2">
              {grouped ? <h3 className="px-1 text-meta text-tab-label">{group || 'Other'}</h3> : null}
              <ul className="divide-y divide-border/50 rounded-lg border border-border/50">
                {items.map((item) => (
                  <li key={item.id}>
                    <ItemRow
                      code={service.code}
                      item={item}
                      active={item.id === editingId}
                      onOpen={() => onEditingChange(item.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {editingId !== null ? (
        <DrawerSheet
          open
          onOpenChange={(next) => {
            if (!next) onEditingChange(null);
          }}
          float
          className="bg-background"
          title={editing ? editing.name : 'Add item'}
          toolbar={
            <DrawerToolbar
              onBack={() => onEditingChange(null)}
              backLabel="Back to the price list"
              /*
                Paging by position in the list as drawn, never by arithmetic on
                the id: ids are never reissued, so they have gaps.
              */
              paging={
                editing && at !== -1
                  ? {
                      onPage: (delta: -1 | 1) => {
                        const next = ordered[at + delta];
                        if (next) onEditingChange(next.id);
                      },
                      hasPrevious: at > 0,
                      hasNext: at < ordered.length - 1,
                      position: `${at + 1} of ${ordered.length}`,
                    }
                  : undefined
              }
              /*
                Archiving lives here and only here: in the panel the item is
                open and named, so there is no question which one is retired.
                No confirmation; the same button restores it.
              */
              actions={
                editing ? (
                  <ArchiveButton
                    label={editing.archived ? `Restore ${editing.name}` : `Archive ${editing.name}`}
                    archived={editing.archived}
                    onClick={() => onArchive(editing, !editing.archived)}
                  />
                ) : undefined
              }
            />
          }
        >
          {/* `key` remounts the form so paging shows the next item's values. */}
          <ItemForm
            key={editing?.id ?? 'new'}
            code={service.code}
            item={editing}
            groups={groups}
            onDone={() => onEditingChange(null)}
          />
        </DrawerSheet>
      ) : null}

      <span aria-live="polite" className="sr-only">
        {pending ? 'Saving' : ''}
      </span>
    </section>
  );
}

/** '₹4,000', '₹4,000 per page', '₹15,000 a month', '₹4,000 to ₹8,000', or null. */
function priceOf(item: ServiceItem, ratePaise = item.ratePaise): string | null {
  if (ratePaise === undefined) return null;
  const amount =
    item.rateMaxPaise !== undefined && item.rateMaxPaise > ratePaise
      ? `${formatQuote(ratePaise)} to ${formatQuote(item.rateMaxPaise)}`
      : formatQuote(ratePaise);
  return item.unit === 'fixed' ? amount : `${amount} ${itemRateUnit(item)}`;
}

/**
 * One item. The name opens the panel, and its `after` box stretches over the
 * row so the whole row does; the price sits above that box and edits in place.
 */
function ItemRow({
  code,
  item,
  active,
  onOpen,
}: {
  code: string;
  item: ServiceItem;
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <div
      className={cn(
        'relative flex min-h-10 items-center gap-4 px-4 py-2 transition-colors hover:bg-muted/40',
        active && 'bg-muted/40',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <Button
          variant="ghost"
          onClick={onOpen}
          className={cn(TEXT_BUTTON, 'min-w-0 after:absolute after:inset-0', item.archived && 'text-tab-label')}
        >
          <span className="truncate">{item.name}</span>
        </Button>
        {item.blurb ? <span className="truncate text-meta text-tab-label">{item.blurb}</span> : null}
      </div>
      {item.archived ? <span className="text-meta text-tab-label">Archived</span> : null}
      <PriceCell code={code} item={item} />
    </div>
  );
}

/**
 * The price, edited where it is read: click it, type, Enter or click away to
 * save, Escape to cancel. The most frequent edit on the page, so it takes no
 * panel and no reload.
 *
 * **Optimistic, and honest about failure.** The new figure shows at once; if
 * the save is refused (a rate above the item's own top-of-band, say) the old
 * figure comes back and the reason is said in a toast. Blank means "quoted per
 * engagement", which is a real answer, and posts no rate rather than zero.
 */
function PriceCell({ code, item }: { code: string; item: ServiceItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  /** The figure on screen while a save is in flight; undefined means the item's own. */
  const [shown, setShown] = useState<number | null | undefined>(undefined);
  /** Escape was pressed: the blur that follows must not save. */
  const cancelled = useRef(false);
  const current = shown === undefined ? item.ratePaise : (shown ?? undefined);

  const start = () => {
    setDraft(current === undefined ? '' : String(current / 100));
    setEditing(true);
  };

  // Enter and Escape both end by blurring, so blur is the one place a save can
  // start and a price is never posted twice.
  const commit = async () => {
    setEditing(false);
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const text = draft.trim();
    const next = text === '' ? undefined : rupeesToPaise(text);
    if (next === null) {
      toast.error('A price is a number of rupees, with at most two decimals.');
      return;
    }
    if (next === item.ratePaise) return;
    setShown(next ?? null);
    // A cleared price posts no rate at all, which the schema reads as quoted.
    const result = await saveServiceItem(code, { ...item, ratePaise: next });
    if (!result.success) {
      setShown(undefined);
      toast.error(result.error ?? 'Failed to save the price.');
      return;
    }
    router.refresh();
    setShown(undefined);
  };

  if (editing) {
    return (
      <Input
        autoFocus
        inputMode="decimal"
        aria-label={`Price of ${item.name}, in rupees`}
        placeholder="Quoted"
        value={draft}
        // Digits and one decimal point only, refused as typed rather than
        // complained about afterwards (AGENTS.md, input rules).
        onChange={(e) => {
          const clean = e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
          setDraft(clean);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault();
            cancelled.current = e.key === 'Escape';
            e.currentTarget.blur();
          }
        }}
        onBlur={() => void commit()}
        className="relative z-10 h-7 w-36 border-border/50 text-right tabular-nums"
      />
    );
  }

  const price = priceOf(item, current);
  return (
    <Button
      variant="ghost"
      onClick={start}
      aria-label={`Change the price of ${item.name}${price ? `, now ${price}` : ', now quoted'}`}
      className={cn(
        TEXT_BUTTON,
        'relative z-10 px-2 py-1 tabular-nums',
        price ? 'text-muted-foreground' : 'text-tab-label',
      )}
    >
      {price ?? 'Quoted'}
    </Button>
  );
}
