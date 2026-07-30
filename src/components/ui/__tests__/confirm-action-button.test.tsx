import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';

const props = {
  label: 'Finalize & assign number',
  title: 'Finalize this document?',
  description: 'A number will be assigned and the document becomes immutable.',
  confirmLabel: 'Finalize',
};

describe('ConfirmActionButton', () => {
  it('does nothing until the action is confirmed', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    render(<ConfirmActionButton {...props} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: props.label }));

    // Finalizing claims a permanent number and makes the document immutable —
    // one stray click must never be enough.
    expect(onConfirm).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(props.title)).toBeInTheDocument();
    expect(within(dialog).getByText(props.description)).toBeInTheDocument();
  });

  it('runs the action once confirmed', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    render(<ConfirmActionButton {...props} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: props.label }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Finalize' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('abandons the action on cancel', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    render(<ConfirmActionButton {...props} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: props.label }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cannot be opened while disabled', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    render(<ConfirmActionButton {...props} onConfirm={onConfirm} disabled />);

    await user.click(screen.getByRole('button', { name: props.label }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
