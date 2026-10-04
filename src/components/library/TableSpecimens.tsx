'use client';

import type { RecordColumn } from '@/components/admin/RecordTable';
import SortToggle, { useShowSort } from '@/components/admin/SortToggle';
import { Specimen } from './Specimen';
import TemplateTable from './table/TemplateTable';
import { TEMPLATE_COLUMNS } from './table/columns';
import type { TemplateRow } from './table/rows';
import type { LibraryEntry } from './catalogue';

/**
 * The table, in the two shapes worth seeing side by side.
 *
 * **Both are the same component over the same rows**, differing only in the
 * props named on them. That is the point: they are not two designs, they are
 * one component asked two questions, and a reader comparing them is comparing
 * exactly the props between them.
 *
 * **It was five, and three were cut.** The default (five columns, auto layout),
 * the quiet one (sorting and actions off) and the absences one (three rows, each
 * missing something) each demonstrated a real rule, and each did it by being
 * *the wide table minus something*, which is a slower way of reading the wide
 * table. Every rule they carried is still enforced and still written down: the
 * absences are on the wide table already (Ashwell has no amount, owner, team or
 * note), the quiet table's lesson is that `sortable` defaults off in
 * `TemplateTable`, and both are in `docs/design.md` §2.3. Five cards of one
 * table is a page somebody scrolls past.
 *
 * What is left is the one that shows every column kind at once, and the one no
 * amount of props can show: a table with nothing in it.
 *
 * Twelve rows, because `PAGE_SIZE` is ten and a specimen that fits on one page
 * hides the pager. `fill` on both, because a table is not one control pushed
 * right: it takes the whole stage the way it takes the whole page.
 */
export function TableSpecimens({ entry }: { entry: LibraryEntry }) {
  const [wide, empty] = entry.variants;
  /*
    **The eye, and it is the reason this page renders one at all.**

    §2.3's pairing rule: a table may only sort where something on the page can
    turn the controls off, because sorting's arrows appear on a heading under
    the pointer and `SortToggle` is their one discoverable switch. A table that
    sorted by default put arrows on hover wherever its caller had no bar.

    `design-system.test.ts` enforces it per *feature folder*, so a library page
    showing a sorting table has to carry the eye like any other caller. That is
    the rule working: the alternative was a named exemption, which would have
    been this page claiming the pairing does not apply to it while it is the
    page documenting the pairing.

    It is the real component over the real hook, so the preference is the same
    `speclr:show-sort` key every list in the app reads: turn it on here and the
    documents list has it on too. That is the hook's own rule (it is a habit,
    not a fact about one table) and a library that faked it would be teaching
    the opposite of what ships.
  */
  const [showSort, toggleSort] = useShowSort();

  /*
    The five columns a table of this record would really carry, which is the
    §2.3 budget rather than the catalogue. Identity, a state, a figure, a place
    and a date is the shape almost every list in this app has: what it is, where
    it stands, what it is worth, where it is, and when.

    Only the empty specimen uses it now, and that is deliberate rather than
    left over: an empty table should be drawn at the width a real one would be,
    not at the catalogue's eleven columns, or the specimen is measuring a table
    nobody would build. Picked by key rather than re-declared, so the
    definitions have one home and the specimen cannot drift from them.
  */
  const budget: RecordColumn<TemplateRow>[] = TEMPLATE_COLUMNS.filter((column) =>
    ['name', 'status', 'amount', 'location', 'issuedOn'].includes(column.key),
  );

  return (
    <>
      {/*
        The eye sits above every specimen rather than inside one, because it is
        one preference for the whole app rather than a property of a table. In a
        real page it lives in that route's `FilterBar`, beside the search and
        the filters, which is the bar `RecordTable` cannot render into and the
        whole reason sorting is opt-in.
      */}
      <div className="flex items-center justify-end">
        <SortToggle showSort={showSort} onToggle={toggleSort} />
      </div>

      <Specimen name={wide.name} note={wide.note} fill>
        {/*
          The wide package, taken whole: all eleven columns, `resizable`
          (`table-layout: fixed`, sideways scroll, every cell truncating),
          `sticky` on Name and `actionsSticky` on the menu so the row can be
          identified and acted on at any scroll position, and `dividers`,
          which earn their place only here.

          What it gives up is the sticky header, and that is not recoverable:
          the scrolling container is the scrollport for both axes.

          Drag a column edge to resize, or a column *heading* to move it. The
          frozen Name column is pinned and nothing drops before it; the checkbox
          and actions columns bound the range at both ends by not being columns
          at all. Ctrl/alt with an arrow does the same from the keyboard.
        */}
        <TemplateTable resizable dividers actionsSticky reorderable sortable={showSort} />
      </Specimen>

      <Specimen name={empty.name} note={empty.note} fill>
        {/*
          Zero rows. The table renders no header, no footer and no pager at all,
          only the empty state: an icon, what is not here, and what to do about
          it. A table that drew its chrome around nothing would be a list
          claiming to be a list of nothing, which reads as broken (§2.5).
        */}
        <TemplateTable columns={budget} rows={[]} />
      </Specimen>
    </>
  );
}
