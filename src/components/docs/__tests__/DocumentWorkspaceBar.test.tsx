import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentWorkspaceBar from '../DocumentWorkspaceBar';

function setup(overrides: Partial<React.ComponentProps<typeof DocumentWorkspaceBar>> = {}) {
  const props = {
    title: 'New invoice',
    zoom: 'fit' as const,
    onZoomChange: jest.fn(),
    currentPage: 0,
    pageCount: 5,
    onPrev: jest.fn(),
    onNext: jest.fn(),
    ...overrides,
  };
  render(<DocumentWorkspaceBar {...props} />);
  return props;
}

describe('DocumentWorkspaceBar', () => {
  it('shows the document title and the page counter', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'New invoice' })).toBeInTheDocument();
    expect(screen.getByText('Page 1 / 5')).toBeInTheDocument();
  });

  it('marks the active zoom mode as pressed', async () => {
    const user = userEvent.setup();
    const { onZoomChange } = setup();
    expect(screen.getByRole('button', { name: /^fit$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /100%/ })).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByRole('button', { name: /100%/ }));
    expect(onZoomChange).toHaveBeenCalledWith('full');
  });

  it('disables previous on the first page', () => {
    setup({ currentPage: 0 });
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next page/i })).toBeEnabled();
  });

  it('disables next on the last page', () => {
    setup({ currentPage: 4, pageCount: 5 });
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /previous page/i })).toBeEnabled();
  });

  it('disables both arrows for a single-page document', () => {
    setup({ currentPage: 0, pageCount: 1 });
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
    expect(screen.getByText('Page 1 / 1')).toBeInTheDocument();
  });

  it('navigates with the arrows', async () => {
    const user = userEvent.setup();
    const { onNext, onPrev } = setup({ currentPage: 2 });
    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(onNext).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /previous page/i }));
    expect(onPrev).toHaveBeenCalled();
  });

  it('announces page changes politely', () => {
    setup({ currentPage: 2 });
    expect(screen.getByText('Page 3 / 5')).toHaveAttribute('aria-live', 'polite');
  });
});
