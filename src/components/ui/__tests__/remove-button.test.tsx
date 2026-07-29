import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RemoveButton } from '@/components/ui/remove-button';

describe('RemoveButton', () => {
  it('exposes its label as the accessible name', () => {
    render(<RemoveButton label="Remove line item 1" onConfirm={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Remove line item 1' })).toBeInTheDocument();
  });

  it('asks for confirmation before removing anything', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    render(<RemoveButton label="Remove schedule A" onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Remove schedule A' }));

    // The click opens a dialog; nothing is destroyed yet.
    expect(onConfirm).not.toHaveBeenCalled();
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  });

  it('removes once the user confirms', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    render(<RemoveButton label="Remove paragraph 2" onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Remove paragraph 2' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^remove$/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('leaves the row alone when the user cancels', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    render(<RemoveButton label="Remove exclusion 1" onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Remove exclusion 1' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cannot be triggered when disabled', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    render(<RemoveButton label="Remove line item 1" onConfirm={onConfirm} disabled />);

    await user.click(screen.getByRole('button', { name: 'Remove line item 1' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
