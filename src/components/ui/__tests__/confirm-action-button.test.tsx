import { render, screen, waitFor, within } from '@testing-library/react';
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

  /**
   * Regression: the confirm button was a bare `Button`, so it ran its action and
   * left the dialog standing. Callers that navigate away hid it by unmounting
   * the page; one in a persistent layout (the editor rail's back arrow) left the
   * dialog on screen over the newly loaded route.
   */
  it('dismisses the dialog once confirmed, without the caller closing it', async () => {
    const user = userEvent.setup();
    render(<ConfirmActionButton {...props} onConfirm={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: props.label }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Finalize' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
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
