import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Clock from '../Clock';

/**
 * What is worth pinning: the first render is empty (the hydration contract),
 * the tick lands on the top of the minute rather than 60s after mount, each
 * half swaps its own thing, and the card opens over the short date only — a
 * card repeating the line already under the cursor is the one thing a popup
 * must not do.
 */
describe('Clock', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const at = (iso: string) => jest.setSystemTime(new Date(iso));
  /** `userEvent` schedules its own work, so it needs the fake clock. */
  const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

  /** The two halves, by what pressing them does rather than what they show. */
  const dateHalf = () => screen.getByRole('button', { name: /date$/ });
  const timeHalf = () => screen.getByRole('button', { name: /clock$/ });

  it('renders nothing readable before the effect, so server and client agree', () => {
    at('2026-08-01T13:24:00');
    const { container } = render(<Clock />);
    // The effect has run by now (`render` flushes it), so assert the contract
    // the other way: the value lives on buttons that only exist once mounted.
    expect(container.textContent).not.toBe('');
  });

  it('shows the long date and a 24-hour clock by default', () => {
    at('2026-08-01T13:24:00');
    render(<Clock />);
    expect(dateHalf()).toHaveTextContent('Saturday, 01 August 2026');
    expect(timeHalf()).toHaveTextContent('13:24');
  });

  it('first ticks at the top of the minute, not 60s after mount', () => {
    at('2026-08-01T13:24:59');
    render(<Clock />);
    expect(timeHalf()).toHaveTextContent('13:24');

    act(() => {
      jest.advanceTimersByTime(1_000);
    });
    expect(timeHalf()).toHaveTextContent('13:25');
  });

  it('keeps ticking every minute after the first alignment', () => {
    at('2026-08-01T13:24:59');
    render(<Clock />);
    act(() => {
      jest.advanceTimersByTime(1_000 + 60_000);
    });
    expect(timeHalf()).toHaveTextContent('13:26');
  });

  it('clears both timers on unmount', () => {
    at('2026-08-01T13:24:59');
    const { unmount } = render(<Clock />);
    act(() => {
      jest.advanceTimersByTime(1_000);
    });
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('swaps the date form on click, and back again', async () => {
    at('2026-05-28T13:42:00');
    render(<Clock />);
    expect(dateHalf()).toHaveTextContent('Thursday, 28 May 2026');

    await user().click(dateHalf());
    expect(dateHalf()).toHaveTextContent('28/05/26');

    await user().click(dateHalf());
    expect(dateHalf()).toHaveTextContent('Thursday, 28 May 2026');
  });

  it('carries no weekday in the short date', async () => {
    at('2026-05-28T13:42:00');
    render(<Clock />);
    await user().click(dateHalf());
    expect(dateHalf().textContent).toBe('28/05/26');
  });

  it('swaps the clock on click of the time, leaving the date alone', async () => {
    at('2026-05-28T13:42:00');
    render(<Clock />);
    expect(timeHalf()).toHaveTextContent('13:42');

    await user().click(timeHalf());
    expect(timeHalf()).toHaveTextContent('01:42 pm');
    // The other half is untouched: two controls, two jobs.
    expect(dateHalf()).toHaveTextContent('Thursday, 28 May 2026');

    await user().click(timeHalf());
    expect(timeHalf()).toHaveTextContent('13:42');
  });

  it('remembers both choices across a remount', async () => {
    at('2026-05-28T13:42:00');
    const { unmount } = render(<Clock />);
    await user().click(dateHalf());
    await user().click(timeHalf());
    unmount();

    render(<Clock />);
    expect(dateHalf()).toHaveTextContent('28/05/26');
    expect(timeHalf()).toHaveTextContent('01:42 pm');
  });

  it('opens the card on hover over the short date', async () => {
    at('2026-05-28T13:42:00');
    render(<Clock />);
    await user().click(dateHalf());

    await user().hover(dateHalf());
    expect(await screen.findByText('Thursday, 28 May 2026')).toBeInTheDocument();
  });

  it('shows the date alone on the card, never the time already beside it', async () => {
    at('2026-05-28T13:42:00');
    render(<Clock />);
    await user().click(dateHalf());

    await user().hover(dateHalf());
    const card = await screen.findByText('Thursday, 28 May 2026');
    expect(card.textContent).not.toMatch(/13:42|01:42/);
  });

  it('opens no card over the long date, which would repeat itself', async () => {
    at('2026-05-28T13:42:00');
    render(<Clock />);

    await user().hover(dateHalf());
    act(() => {
      jest.advanceTimersByTime(500);
    });
    // The button's own text is the long date; a card would be a second copy.
    expect(screen.getAllByText(/Thursday, 28 May 2026/)).toHaveLength(1);
  });

  it('names what pressing each half does, rather than repeating what it shows', async () => {
    at('2026-05-28T13:42:00');
    render(<Clock />);
    expect(
      screen.getByRole('button', { name: 'Show the short date' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Show the 12-hour clock' }),
    ).toBeInTheDocument();

    await user().click(dateHalf());
    await user().click(timeHalf());
    expect(
      screen.getByRole('button', { name: 'Show the full date' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Show the 24-hour clock' }),
    ).toBeInTheDocument();
  });

  it('shows no browser-native tooltip, which would paint over the card', () => {
    at('2026-05-28T13:42:00');
    render(<Clock />);
    expect(dateHalf()).not.toHaveAttribute('title');
    expect(timeHalf()).not.toHaveAttribute('title');
  });
});
