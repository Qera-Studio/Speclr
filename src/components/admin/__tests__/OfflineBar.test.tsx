import { act, render, screen } from '@testing-library/react';
import { OfflineBar } from '../OfflineBar';

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
  act(() => {
    window.dispatchEvent(new Event(value ? 'online' : 'offline'));
  });
}

describe('OfflineBar', () => {
  afterEach(() => setOnline(true));

  it('says nothing while the browser has a connection', () => {
    render(<OfflineBar />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('warns that changes are not being saved once the connection drops', () => {
    render(<OfflineBar />);
    setOnline(false);
    expect(screen.getByRole('status')).toHaveTextContent('Changes are not being saved');
  });

  it('takes itself away again when the connection returns', () => {
    render(<OfflineBar />);
    setOnline(false);
    setOnline(true);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('reads the current state on mount, not only on the next event', () => {
    // A tab that was already offline when the page loaded must show the bar.
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(<OfflineBar />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
