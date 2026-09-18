'use client';

import { notFound } from 'next/navigation';
import RecordTable from '@/components/admin/RecordTable';
import { EditButton } from '@/components/admin/RowActions';
import { PageBody, PageHeader } from '@/components/admin/Page';

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
export default async function RecordTablePreview({
  searchParams,
}: {
  searchParams: Promise<{ long?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { long } = await searchParams;

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
