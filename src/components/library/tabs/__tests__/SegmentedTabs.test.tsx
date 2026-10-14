import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table2 } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import SegmentedTabs from '../SegmentedTabs';

const TABS = [
  { value: 'table', label: 'Table', icon: Table2 },
  { value: 'board', label: 'Board' },
];

describe('SegmentedTabs', () => {
  it('is a named tablist with the first tab chosen', () => {
    render(<SegmentedTabs label="View" tabs={TABS} />);
    expect(screen.getByRole('tablist', { name: 'View' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Table' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Board' })).toHaveAttribute('aria-selected', 'false');
  });

  it('chooses a tab on click and says which', async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();
    render(<SegmentedTabs label="View" tabs={TABS} onValueChange={onValueChange} />);
    await user.click(screen.getByRole('tab', { name: 'Board' }));
    expect(screen.getByRole('tab', { name: 'Board' })).toHaveAttribute('aria-selected', 'true');
    expect(onValueChange).toHaveBeenCalledWith('board');
  });

  it('keeps the overflow menu out of the tablist', async () => {
    const user = userEvent.setup();
    render(
      <SegmentedTabs
        label="View"
        tabs={TABS}
        more={{ label: 'All', items: <DropdownMenuItem>Calendar</DropdownMenuItem> }}
      />,
    );
    // Two tabs, not three: the menu button is not one of them.
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    const all = screen.getByRole('button', { name: 'All' });
    expect(screen.getByRole('tablist')).not.toContainElement(all);
    await user.click(all);
    expect(await screen.findByRole('menuitem', { name: 'Calendar' })).toBeInTheDocument();
  });
});
