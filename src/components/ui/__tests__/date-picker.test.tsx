import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePicker } from '@/components/ui/date-picker';

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <span id="issue-label">Issue date</span>
      <DatePicker
        id="issue"
        aria-describedby="issue-label"
        value={value}
        onValueChange={setValue}
      />
      <output data-testid="iso">{value}</output>
    </>
  );
}

describe('DatePicker', () => {
  it('shows the placeholder when no date is set', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /pick a date/i })).toBeInTheDocument();
  });

  it('displays an existing date in the app ordinal-free display format', () => {
    render(<Harness initial="2026-07-21" />);
    expect(screen.getByRole('button', { name: '21 Jul 2026' })).toBeInTheDocument();
  });

  it('emits an ISO string for the day the user clicks', async () => {
    const user = userEvent.setup();
    render(<Harness initial="2026-07-21" />);

    await user.click(screen.getByRole('button', { name: '21 Jul 2026' }));
    await user.click(await screen.findByRole('button', { name: 'Wednesday, July 15th, 2026' }));

    // The exact day chosen must survive as the same calendar date — no UTC
    // conversion shifting it a day. See isoToLocalDate in lib/domain/dates.
    expect(screen.getByTestId('iso')).toHaveTextContent('2026-07-15');
  });

  it('picks the exact day on a financial-year boundary', async () => {
    // 31 Mar and 1 Apr straddle the Indian FY boundary. A one-day drift here
    // would number a document into the wrong financial year, so this is a
    // correctness test, not a cosmetic one.
    const user = userEvent.setup();
    render(<Harness initial="2026-03-15" />);

    await user.click(screen.getByRole('button', { name: '15 Mar 2026' }));
    await user.click(await screen.findByRole('button', { name: 'Tuesday, March 31st, 2026' }));

    expect(screen.getByTestId('iso')).toHaveTextContent('2026-03-31');
  });

  it('opens on the month of the current value, not today', async () => {
    const user = userEvent.setup();
    render(<Harness initial="2026-02-10" />);

    await user.click(screen.getByRole('button', { name: '10 Feb 2026' }));

    expect(await screen.findByText(/February 2026/i)).toBeInTheDocument();
  });
});
