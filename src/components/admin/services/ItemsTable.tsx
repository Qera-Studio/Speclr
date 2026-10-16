'use client';

import { Coins, Layers, Tag, Type } from 'lucide-react';
import RecordTable from '@/components/patterns/RecordTable';
import { EditButton } from '@/components/patterns/RowActions';
import { AmountCell } from '@/components/patterns/AmountCell';
import { RaisedChip } from '@/components/patterns/LocationCell';
import { NIL } from '@/lib/utils';
import { accentBadge, accentFor } from '@/lib/accent';
import type { ServiceItem } from '@/lib/domain/serviceItem';

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
 * **It is `ClientsTableNext`'s arrangement, copied rather than re-derived**, and
 * that is the point rather than a shortcut. The experimental clients table is
 * where this layout was worked out, so every part of it here is the same part:
 * the frozen first column, the frozen actions, the dividers, the resizing, the
 * `AmountCell` for money and the accent badge for a label. Where the two tables
 * differ, the difference is a fact about an item rather than a second opinion
 * about tables.
 *
 * The three things that carried over least obviously are the ones worth naming,
 * because each is load-bearing rather than decorative:
 *
 * - **A frozen first column and frozen actions**, which is what gives the
 *   checkbox and the actions column a width at all. Under the
 *   `table-layout: fixed` that `resizable` switches on, a column with no stated
 *   width resolves to zero; the frozen branches state both in pixels because a
 *   sticky `left` is a running sum of known widths.
 * - **The id, not the name, is the frozen column.** That is the one deliberate
 *   departure and it is explained where it is set.
 * - **A row is read-only and opens a sheet.** The trade is a click to change a
 *   rate where before there was none; what it buys is being able to see fifty
 *   rates at once, which is what this screen is for.
 */
export default function ItemsTable({
  items,
  onEdit,
  isActive,
}: {
  items: ServiceItem[];
  onEdit: (item: ServiceItem) => void;
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

        This is the one part of `ClientsTableNext` not copied, because that
        table has a `FilterBar` above it and this one does not.
      */
      dividers
      fixed
      actionsSticky
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
          /*
            **The frozen column, where the clients table freezes the name.**

            The reason freezing exists is that a reader scrolled sideways needs
            to know which row they are on, and on a client that is the name
            because nothing shorter identifies them. An item has a better
            answer: the id is what a client record and a quotation line actually
            cite, it is never reissued, and it is four characters rather than
            forty. So the column that says which row you are on is this one, and
            the name gets the width instead.

            100 rather than the clients table's 200 for the same reason: this
            holds 'I52'.

            **Boxed as a chip, because it was being read as a row number.** It
            is not one: an id is issued once and never reissued, so the column
            has gaps (WEB runs to I55 across 52 rows, because I35, I36 and I38
            moved to `ANLY` and their numbers were retired). A bare '54' in the
            first column of a table invites the reader to count, and counting
            gives the wrong answer. The chip is `RaisedChip`, the same box the
            flag and the currency symbol sit in, which says "this is a token"
            rather than "this is a position".

            It carries a `label`, unlike those two: they sit beside the value
            they decorate and this *is* the value, so hiding it would leave the
            column silent to a screen reader.
          */
          sticky: true,
          size: 100,
          cell: (item) => (
            <RaisedChip label={`Item ${item.id}`} className="tabular-nums text-muted-foreground">
              {item.id}
            </RaisedChip>
          ),
        },
        {
          key: 'name',
          label: 'Name',
          icon: Type,
          /*
            `minSize` and `fit`, which is the Location column's pairing copied
            whole, because it is the same rule about the same kind of value.

            An item's name **is** its scope on a contract, so a cut one is a
            different scope, exactly as 'Bridge of Earn, United Kingd' names
            nowhere. `minSize` holds the column at 264 however short the names
            on the page happen to be, and `fit` raises it past that rather than
            ellipsising when one is longer. The floor is whichever is larger.

            The 620 starting width is larger than either, and it is what keeps
            the furniture columns honest: under `table-layout: fixed` a table
            whose columns declare less than its card has the surplus shared out
            across every column, which inflated the 40px checkbox to 76px. The
            declared total has to exceed the card, which is why the clients
            table (twelve columns) never showed this and four columns did.
          */
          size: 620,
          minSize: 264,
          fit: true,
          cell: (item) => (
            <span className={item.archived ? 'text-muted-foreground line-through' : undefined}>
              {item.name}
            </span>
          ),
        },
        {
          key: 'rate',
          label: 'Rate',
          icon: Coins,
          // The Amount column's width and its left alignment, both copied: a
          // money column is right-aligned by house rule (§2.3) and this one is
          // not, on request, the same call already made there.
          size: 300,
          className: 'tabular-nums',
          /*
            `AmountCell`, so a rate here reads exactly as money reads on the
            clients table and prints on an invoice: the symbol in a raised chip,
            `formatINR`'s own digits untouched, Indian lakh grouping. Money
            formatting has one owner and this is not it.

            Absent is "quoted per engagement", a real answer rather than a
            missing one, so it says so in a muted tag rather than printing a
            dash. A band prints both ends, because the top of one is a figure
            somebody quoted and hiding it would make the row read as exact.
          */
          cell: (item) => {
            if (item.ratePaise === undefined) {
              return (
                <span className="rounded-[4px] bg-muted px-1.5 py-0.5 text-meta text-muted-foreground">
                  Quoted
                </span>
              );
            }
            if (item.rateMaxPaise === undefined) {
              return <AmountCell minor={item.ratePaise} currency="INR" />;
            }
            return (
              <span className="inline-flex min-w-0 items-center gap-1">
                <AmountCell minor={item.ratePaise} currency="INR" />
                <span className="shrink-0 text-muted-foreground">to</span>
                <AmountCell minor={item.rateMaxPaise} currency="INR" />
              </span>
            );
          },
        },
        {
          key: 'group',
          label: 'Group',
          icon: Layers,
          /*
            The Industry column, in both its width and its treatment: a label
            tinted from the accent tokens, because rows under a handful of
            headings are read as bands and a hue does that faster than a word.
            The hue means nothing beyond "these are the same", which
            `lib/accent.ts` says outright.

            A label, never a scope. 18 of the 46 rate-card headings span more
            than one service, so nothing may key off this (`serviceItem.ts`).
          */
          size: 300,
          cell: (item) =>
            item.group ? (
              <span className={accentBadge(accentFor(item.group))}>{item.group}</span>
            ) : (
              NIL
            ),
        },
      ]}
      /*
        Edit alone, revealed on hover, which is `RowActions`' own behaviour and
        the arrangement every other table in the app uses.

        **Archive is not here**, on request, and that is a real trade rather
        than a simplification: the only way to retire an item is now the sheet
        the row opens. Worth it because archiving is rare and editing is not, so
        a menu whose common case takes two clicks to reach spends the reader's
        time on the exception. It also removes the accident that put this
        comment here: a menu item a row-width apart from Edit is one mis-click
        from retiring a line somebody was only trying to read.
      */
      actions={(item) => (
        <EditButton label={`Edit ${item.name}`} onClick={() => onEdit(item)} />
      )}
    />
  );
}
