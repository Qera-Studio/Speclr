import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServiceCards from '../ServiceCards';
import { SERVICES } from '@/lib/domain/contract/seed/services';
import { SCHEDULES } from '@/lib/domain/contract/schedules';

/**
 * The tabs and the scroll-spy write the same state, and clicking a tab starts a
 * scroll the spy then reports on. Before the guard, clicking Audit from Setup
 * slid the pill to Audit and the arriving scroll dragged it back through Build
 * and Retainer on the way.
 *
 * jsdom has no layout, so every group's `offsetLeft` is 0 and the spy resolves
 * any scroll to the *last* schedule. That is enough to prove the guard: a
 * scroll during the settle window must change nothing, and the same scroll
 * after it must be obeyed.
 */

const scrollRow = () => {
  // The row is the sections' shared parent — it has no role of its own, and a
  // test id here would only name a div the component already reaches by ref.
  const row = screen.getByRole('region', { name: 'Setup' }).parentElement!;
  fireEvent.scroll(row);
};

const selected = () =>
  screen.getAllByRole('tab').find((tab) => tab.getAttribute('aria-selected') === 'true')
    ?.textContent;

const lastSchedule = SCHEDULES[SCHEDULES.length - 1].name;

describe('ServiceCards', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('holds the clicked tab while its own scroll is still running', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<ServiceCards services={SERVICES} />);

    await user.click(screen.getByRole('tab', { name: 'Build' }));
    expect(selected()).toBe('Build');

    scrollRow();
    expect(selected()).toBe('Build');
  });

  it('follows the row again once the scroll has settled', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<ServiceCards services={SERVICES} />);

    await user.click(screen.getByRole('tab', { name: 'Build' }));
    jest.advanceTimersByTime(700);

    scrollRow();
    expect(selected()).toBe(lastSchedule);
  });

  it('says so when the library is empty', () => {
    render(<ServiceCards services={[]} />);
    expect(screen.getByText('No services yet')).toBeInTheDocument();
  });
});
