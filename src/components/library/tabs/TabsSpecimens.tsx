'use client';

import { ChartColumn, KanbanSquare, LayoutList, Table2 } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Specimen } from '../Specimen';
import type { LibraryEntry } from '../catalogue';
import SegmentedTabs from './SegmentedTabs';

/**
 * The three strips from the reference: two choices, icons with an overflow
 * menu, and plain words. Each holds its own selection, so they can be clicked
 * and dragged here; nothing outside this page reads them.
 */
export function TabsSpecimens({ entry }: { entry: LibraryEntry }) {
  const [pair, icons, words] = entry.variants;
  return (
    <>
      <Specimen name={pair.name} note={pair.note} fill>
        <SegmentedTabs
          label="Clock format"
          tabs={[
            { value: '12', label: '12-hour' },
            { value: '24', label: '24-hour' },
          ]}
        />
      </Specimen>
      <Specimen name={icons.name} note={icons.note} fill>
        <SegmentedTabs
          label="View"
          tabs={[
            { value: 'table', label: 'Table', icon: Table2 },
            { value: 'board', label: 'Board', icon: KanbanSquare },
            { value: 'chart', label: 'Chart', icon: ChartColumn },
            { value: 'list', label: 'List', icon: LayoutList },
          ]}
          more={{
            label: 'All',
            items: (
              <>
                <DropdownMenuItem>Calendar</DropdownMenuItem>
                <DropdownMenuItem>Timeline</DropdownMenuItem>
                <DropdownMenuItem>Gallery</DropdownMenuItem>
              </>
            ),
          }}
        />
      </Specimen>
      <Specimen name={words.name} note={words.note} fill>
        <SegmentedTabs
          label="Settings"
          tabs={[
            { value: 'share', label: 'Share' },
            { value: 'privacy', label: 'Privacy' },
            { value: 'publishing', label: 'Publishing' },
            { value: 'domain', label: 'Domain' },
          ]}
        />
      </Specimen>
    </>
  );
}
