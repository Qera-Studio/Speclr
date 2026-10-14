'use client';

import { Archive, Pencil, Trash2 } from 'lucide-react';
import { RowMenu } from '@/components/admin/RowMenu';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Specimen } from '../Specimen';
import type { LibraryEntry } from '../catalogue';
import RichClientTable from './RichClientTable';
import { RICH_CLIENT_ROWS } from './rows';
import { todayISO } from '@/lib/domain/dates';
import type { DayRates } from '@/lib/domain/currency';

/**
 * Fixed rates, so the international rows show the currency toggle without a
 * network call. The source names itself as a sample in the tooltip: this page
 * must never look like it is quoting a real rate.
 */
const SAMPLE_RATES: DayRates = {
  asOf: todayISO(),
  source: 'a fixed sample, not a live rate',
  rates: { USD: 0.012, GBP: 0.0091, EUR: 0.0108, AUD: 0.018, SGD: 0.0155 },
};

/**
 * The rich client table, over sample rows built to hit every case: an
 * individual, five countries, a legal name longer than its column, and a
 * client with almost nothing filled in. `fill`, because a table takes the whole stage.
 */
export function RichTableSpecimens({ entry }: { entry: LibraryEntry }) {
  const [only] = entry.variants;
  return (
    <Specimen name={only.name} note={only.note} fill>
      {/* The stage lays its child out in a flex row, where a table sizes to its
          content; the percentages need a definite width to divide. */}
      <div className="w-full min-w-0">
        <RichClientTable
          rows={RICH_CLIENT_ROWS}
          rates={SAMPLE_RATES}
          // The real page's menu acts on a client record; these rows are
          // samples, so the menu shows its shape and does nothing.
          actions={(row) => (
            <RowMenu label={`More actions for ${row.name}`}>
              <DropdownMenuItem>
                <Pencil aria-hidden />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive aria-hidden />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Trash2 aria-hidden />
                Delete
              </DropdownMenuItem>
            </RowMenu>
          )}
        />
      </div>
    </Specimen>
  );
}
