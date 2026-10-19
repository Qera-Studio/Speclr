'use client';

import { notFound } from 'next/navigation';
import RecordTable from '@/components/patterns/RecordTable';
import { EditButton } from '@/components/patterns/RowActions';
import { PageBody, PageHeader } from '@/components/patterns/Page';
import SortToggle, { useShowSort } from '@/components/patterns/SortToggle';

/**
 * The eye for the reorderable fixture.
 *
 * Its own component because `useShowSort` is a hook and this page's default
 * export is an async server-style function that awaits `searchParams`, which
 * cannot hold one.
 *
 * It drives nothing here: `RecordTable` takes `sortable` unconditionally on
 * that fixture, because the reorder tests need the headings to be buttons
 * whatever the stored preference happens to be. What the toggle satisfies is
 * the §2.3 pairing rule, which is about a page offering a way to turn sorting
 * off, and it does that for real.
 */
function ReorderSortToggle() {
  const [showSort, toggle] = useShowSort();
  return <SortToggle showSort={showSort} onToggle={toggle} />;
}

/**
 * `/preview/record-table` — the house table, with no session and no database.
 *
 * `e2e/record-table.spec.ts` measures the row's click target, which is the one
 * thing about this component that only a browser can see and the one thing
 * that has broken twice. It needs **more rows than fit on a page**, because
 * the interesting failure (an overlay that escapes to the card and covers
 * every row) looks correct on row one and wrong on row eight, and it needs a
 * second page to prove the ten-row rule is real rather than incidental.
 *
 * **It does not exist in production**, like its siblings. Nothing here is
 * anybody's data.
 *
 * `'use client'`, and that is a property of `RecordTable` rather than of this
 * page: its props are functions (`id`, `cell`, `open`), and a server component
 * cannot pass a function to a client one. Every real caller is already a
 * client component for its own reasons, so nothing in the app pays for this,
 * but a future server-rendered list would have to become one.
 */
const rowsFor = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    name: `Record ${i + 1}`,
    city: i % 2 ? 'Ghaziabad' : 'Pune',
    // One value far wider than any heading, so the resize floor has something
    // to be measured against that is unmistakably the *content* rather than
    // the column's own name. Row 7 only, because the floor is a max over the
    // column and a test that passes on every row cannot tell a max from a
    // first-row read.
    long: i === 6 ? 'A value considerably longer than this column' : `row ${i + 1}`,
  }));

/**
 * Two lengths, because the pager has two shapes and one fixture can only show
 * one of them.
 *
 * 14 rows is two pages: every page listed, no arrows, no box. `?long=1` gives
 * 230 rows, which is 23 pages — the windowed form, with an anchor at each end
 * and a sliding four in the middle (`docs/design.md` §2.10). The second is not
 * a nicety: the merge at either end and the batch turn are only visible on a
 * list long enough to elide something.
 */
/**
 * The wide variant (`?wide=1`): dividers, frozen columns, resizing, and the
 * actions column frozen against the right edge.
 *
 * Its own fixture rather than a flag on the one above, because every one of
 * those is a *measurement* and jsdom renders every box as zero, so none of them
 * can be checked anywhere but here. What `e2e/record-table.spec.ts` asks of it:
 *
 * - a frozen column stays at the same viewport x after the table scrolls
 *   sideways, which is the whole claim and the one that fails silently if a
 *   `left` is wrong or an ancestor is not the scrollport;
 * - the scrolled columns pass *under* the frozen ones rather than through them,
 *   which is what the `bg-inherit` / `bg-background` pair is for and what a
 *   missing fill turns into unreadable overlapping text;
 * - dragging a handle changes that column's width and nothing else's;
 * - and a drag cannot take a column narrower than its own widest value, which
 *   is why the `long` column carries one row far longer than the rest.
 *
 * Twelve columns of fixed width, so the table is reliably wider than the card at
 * any sensible viewport. The widths are the point, not the content.
 */
const WIDE_COLUMNS = Array.from({ length: 12 }, (_, i) => ({
  key: `c${i}`,
  label: `Column ${i + 1}`,
  size: 160,
  cell: (row: { id: string }) => `r${row.id}c${i + 1}`,
}));

export default async function RecordTablePreview({
  searchParams,
}: {
  searchParams: Promise<{
    long?: string;
    wide?: string;
    plainwide?: string;
    reorder?: string;
  }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { long, wide, plainwide, reorder } = await searchParams;

  /*
    `?reorder=1` — headings can be dragged to change the column order.

    Its own variant rather than a flag on `?wide=1`, because the order is
    **persisted** (keyed on the caption), so a reorder test would leave every
    other test on that fixture reading a column order some earlier test chose.
    A separate caption is a separate storage key, which keeps that blast radius
    to this one fixture.

    Three columns and one frozen, which is the smallest table that can show
    every rule: something to move, somewhere to move it, and a pinned column to
    refuse to move past.
  */
  if (reorder) {
    return (
      <PageBody>
        <PageHeader title="Reorderable records">
          {/*
            A real `SortToggle`, because this fixture turns sorting on and
            §2.3's pairing rule says a table may only sort where something on
            the page can turn the controls off. `design-system.test.ts` enforces
            it per folder and caught this fixture claiming `sortable` with no
            eye anywhere.

            Rendered rather than exempted: the eye is what a real page carries,
            so a fixture without one is a fixture testing a table nobody ships.
            It is also why the headings here show their arrows at all.
          */}
          <ReorderSortToggle />
        </PageHeader>
        <RecordTable
          rows={rowsFor(3)}
          id={(row) => row.id}
          noun="record"
          caption="Preview reorderable records"
          sortable
          reorderable
          columns={[
            { key: 'name', label: 'Name', sticky: true, cell: (row) => row.name },
            { key: 'city', label: 'City', cell: (row) => row.city },
            { key: 'long', label: 'Long', cell: (row) => row.long },
          ]}
        />
      </PageBody>
    );
  }

  /*
    `?plainwide=1` — resizable, and **nothing frozen**. The items table's shape.

    Its own variant because the gap between it and `?wide=1` is precisely where
    a bug shipped. Both furniture columns carried `w-0`, which resolves to zero
    under the `table-layout: fixed` that resizing requires, and the width was
    reaching them only through the frozen branches: the sticky checkbox and
    `actionsSticky` both state it in pixels because a frozen column's `left` is
    a running sum of known widths.

    So `?wide=1` is frozen and looked right, every other fixture is unresizable
    and looked right, and the one combination that collapses the checkbox
    column under the first data cell was the one nothing rendered. jsdom cannot
    see it either, because it measures every box as zero, so 1,593 unit tests
    passed over it.
  */
  if (plainwide) {
    return (
      <PageBody>
        <PageHeader title="Plain wide records" />
        <RecordTable
          rows={rowsFor(14)}
          id={(row) => row.id}
          noun="record"
          caption="Preview plain wide records"
          open={(row) => ({ href: `/preview/record-table?plainwide=1&opened=${row.id}` })}
          dividers
          fixed
          columns={[
            { key: 'name', label: 'Name', size: 180, cell: (row) => row.name },
            { key: 'city', label: 'City', size: 140, cell: (row) => row.city },
            { key: 'long', label: 'Long', size: 120, fit: true, cell: (row) => row.long },
          ]}
          actions={(row) => (
            <EditButton label={`Edit ${row.name}`} onClick={() => undefined} />
          )}
        />
      </PageBody>
    );
  }

  if (wide) {
    return (
      <PageBody>
        <PageHeader title="Wide records" />
        <RecordTable
          rows={rowsFor(14)}
          id={(row) => row.id}
          noun="record"
          caption="Preview wide records"
          open={(row) => ({ href: `/preview/record-table?wide=1&opened=${row.id}` })}
          dividers
          fixed
          actionsSticky
          columns={[
            {
              key: 'name',
              label: 'Name',
              sticky: true,
              size: 180,
              cell: (row) => row.name,
            },
            {
              // Deliberately declared *narrower* than its own widest value, so
              // both halves of `fit` have something to act on: it opens widened
              // past this 120 rather than cut, and a drag then stops at that
              // same width rather than going under it.
              key: 'long',
              label: 'Long',
              size: 120,
              fit: true,
              cell: (row) => row.long,
            },
            ...WIDE_COLUMNS,
          ]}
          actions={(row) => (
            <EditButton label={`Edit ${row.name}`} onClick={() => undefined} />
          )}
        />
      </PageBody>
    );
  }

  return (
    <PageBody>
      <PageHeader title="Records" />
      <RecordTable
        rows={rowsFor(long ? 230 : 14)}
        id={(row) => row.id}
        noun="record"
        caption="Preview records"
        open={(row) => ({ href: `/preview/record-table?opened=${row.id}` })}
        columns={[
          { key: 'name', label: 'Name', cell: (row) => row.name },
          { key: 'city', label: 'City', cell: (row) => row.city },
        ]}
        actions={(row) => (
          <EditButton label={`Edit ${row.name}`} onClick={() => undefined} />
        )}
      />
    </PageBody>
  );
}
