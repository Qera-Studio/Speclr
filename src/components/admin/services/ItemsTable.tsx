'use client';

import { Archive, Coins, Layers, Ruler, Tag, Type } from 'lucide-react';
import RecordTable from '../RecordTable';
import { NIL } from '@/lib/utils';
import { accentBadge, accentFor } from '@/lib/accent';
import { formatINR } from '@/lib/domain/money';
import { itemRateUnit, type ServiceItem } from '@/lib/domain/serviceItem';

/**
 * A Service's items, as a table.
 *
 * This replaced a stack of `FieldSet`s, one per item, each holding five inputs.
 * That shape is fine for the four rows a Part carries and unusable for the 52
 * `WEB` carries: every row was three lines tall whether or not anybody was
 * editing it, so finding one item meant scrolling past every other item's
 * inputs, and nothing could be scanned because a value and a text box look the
 * same from a distance.
 *
 * A row is read-only here and opens the panel to be edited, which is the
 * clients list's arrangement (`ClientsTableNext`) applied to a shorter row. The
 * trade is a click to change a rate where before there was none; what it buys
 * is being able to see fifty rates at once, which is what this screen is for.
 *
 * **The rate is the reason this is `tabular-nums` and right-aligned.** Fifty
 * figures in a column are compared against each other, and proportional digits
 * put the hundreds under the tens.
 */
export default function ItemsTable({
  items,
  onEdit,
  onArchive,
  isActive,
}: {
  items: ServiceItem[];
  onEdit: (item: ServiceItem) => void;
  onArchive: (item: ServiceItem, archived: boolean) => void;
  isActive?: (item: ServiceItem) => boolean;
}) {
  return (
    <RecordTable
      rows={items}
      id={(item) => item.id}
      noun="item"
      caption="The items under this service"
      open={(item) => ({ onClick: () => onEdit(item) })}
      rowLabel={(item) => item.name}
      isActive={isActive}
      /*
        **No sorting, deliberately**, and `design-system.test.ts` is what made
        that a decision rather than an omission: sorting's only off switch is a
        `SortToggle`, which lives in a `FilterBar` this component does not own,
        so a sortable table here would offer arrows with no way to clear them.

        It is also not wanted. The stored order is the order the operator
        arranged, grouped by the headings the rate cards use, and a list that
        reshuffles itself is one nobody can check against the card it came from.
      */
      dividers
      empty={{
        title: 'No items yet',
        description:
          'An item is one priced line: what it is, what it costs, and what that is per. Its name is its scope on a contract.',
      }}
      columns={[
        {
          key: 'id',
          label: 'Id',
          icon: Tag,
          // Cited by a client record and by a quotation line, and never
          // reissued, so it is worth being able to read one off the screen.
          className: 'w-16 text-muted-foreground tabular-nums',
          cell: (item) => item.id,
        },
        {
          key: 'name',
          label: 'Name',
          icon: Type,
          // An item's name **is** its scope on a contract, so it is the one
          // column that must never be cut: a truncated scope is a different
          // scope. Everything else here can be widened when somebody cares.
          fit: true,
          cell: (item) => (
            <span className={item.archived ? 'text-muted-foreground line-through' : undefined}>
              {item.name}
            </span>
          ),
        },
        {
          key: 'group',
          label: 'Group',
          icon: Layers,
          /*
            A label, never a scope. 18 of the 46 rate-card headings span more
            than one service, so nothing may key off this: it groups rows for
            the eye and heads a table on a quotation, and that is all
            (`serviceItem.ts`).

            Tinted by name, from the accent tokens, for the same reason the
            clients table tints an industry: fifty rows under six headings are
            read as bands, and a hue does that faster than a word does. The hue
            means nothing beyond "these are the same", which `lib/accent.ts`
            says outright.
          */
          cell: (item) =>
            item.group ? (
              <span className={accentBadge(accentFor(item.group))}>{item.group}</span>
            ) : (
              NIL
            ),
        },
        {
          key: 'rate',
          label: 'Rate',
          icon: Coins,
          className: 'text-right tabular-nums',
          /*
            Absent is "quoted per engagement", which is a real answer and not a
            missing one, so it says so rather than printing a dash. A band
            prints both ends, because the top of one is a figure somebody
            quoted and hiding it would make the row read as exact.
          */
          cell: (item) => {
            if (item.ratePaise === undefined) {
              return <span className="text-muted-foreground">Quoted</span>;
            }
            return item.rateMaxPaise === undefined
              ? formatINR(item.ratePaise)
              : `${formatINR(item.ratePaise)} to ${formatINR(item.rateMaxPaise)}`;
          },
          // Sorts on the figure, not on the rendered text, or '₹1,00,000' would
          // sort under '₹8,000' because '1' precedes '8'. An unpriced item
          // sorts last rather than as zero: it is not cheap, it is unpriced.
        },
        {
          key: 'unit',
          label: 'Per',
          icon: Ruler,
          className: 'text-muted-foreground',
          // 'a month', 'per page', 'fixed'. Derived rather than stored twice.
          cell: (item) => itemRateUnit(item),
        },
        {
          key: 'sac',
          label: 'SAC',
          icon: Tag,
          className: 'text-muted-foreground tabular-nums',
          // Blank is the ordinary case and means the Service's own code, so an
          // empty cell here is a statement rather than an omission.
          cell: (item) => item.sacCode ?? NIL,
        },
      ]}
      actions={(item) => (
        <button
          type="button"
          aria-label={
            item.archived ? `Restore ${item.name}` : `Archive ${item.name}`
          }
          onClick={() => onArchive(item, !item.archived)}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
        >
          <Archive aria-hidden="true" className="size-3.5" />
        </button>
      )}
    />
  );
}
