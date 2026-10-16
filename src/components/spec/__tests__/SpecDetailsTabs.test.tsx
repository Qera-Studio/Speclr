import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpecDetailsTabs from '../SpecDetailsTabs';

const tabs = [
  { id: 'used-in', label: 'Used in', content: 'Browser tab and bookmarks' },
  { id: 'why', label: 'Why it matters', content: 'Primary tab icon everywhere' },
  { id: 'standard', label: 'Industry standard', content: 'Square non-transparent PNG' },
];

describe('SpecDetailsTabs', () => {
  it('renders all three tab titles in one row', () => {
    render(<SpecDetailsTabs tabs={tabs} />);
    expect(screen.getByRole('tab', { name: 'Used in' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Why it matters' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Industry standard' })).toBeInTheDocument();
  });

  it('renders only the active tab body', () => {
    render(<SpecDetailsTabs tabs={tabs} />);
    expect(screen.getByText('Browser tab and bookmarks')).toBeInTheDocument();
    expect(screen.queryByText('Square non-transparent PNG')).not.toBeInTheDocument();
  });

  it('marks the first tab active by default and switches on click', async () => {
    const user = userEvent.setup();
    render(<SpecDetailsTabs tabs={tabs} />);
    expect(screen.getByRole('tab', { name: 'Used in' })).toHaveAttribute('data-active');

    await user.click(screen.getByRole('tab', { name: 'Industry standard' }));
    expect(screen.getByRole('tab', { name: 'Industry standard' })).toHaveAttribute('data-active');
    expect(screen.getByRole('tab', { name: 'Used in' })).not.toHaveAttribute('data-active');
  });
});
