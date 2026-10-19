import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmActionButton } from '@/components/patterns/ConfirmAction';

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

  /**
   * An icon-only confirm sitting in a row of tooltipped icons.
   *
   * The clause drawer's control row is five icons, four of which say what they
   * do on hover because they are `IconAction`s. This one did not, so the single
   * irreversible control in the row was the one with nothing to read. The
   * `sr-only` span already named it for assistive tech; `tooltip` is what shows
   * the same words to everybody else.
   *
   * Opt-in rather than automatic: a *labelled* confirm button already says what
   * it does, and a tooltip repeating the label is noise.
   */
  it('shows a tooltip on an icon-only button when asked for one', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmActionButton
        {...props}
        label="Delete this clause"
        tooltip="Delete"
        icon={<span aria-hidden>x</span>}
        onConfirm={jest.fn()}
      />,
    );

    await user.hover(screen.getByRole('button', { name: 'Delete this clause' }));

    // By slot rather than by role: Base UI's tooltip popup carries no
    // `role="tooltip"`, deliberately, because the control it labels already
    // carries its own accessible name and a second announcement of the same
    // words is noise. The tooltip is for the eye.
    expect(await screen.findByText('Delete')).toHaveAttribute(
      'data-slot',
      'tooltip-content',
    );
  });

  it('draws no tooltip when none is asked for', async () => {
    const user = userEvent.setup();
    render(<ConfirmActionButton {...props} onConfirm={jest.fn()} />);

    await user.hover(screen.getByRole('button', { name: props.label }));

    expect(
      document.querySelector('[data-slot="tooltip-content"]'),
    ).not.toBeInTheDocument();
  });

  /**
   * The nesting, which has one wrong order that still renders.
   *
   * The tooltip wraps the dialog's trigger so that one element is both. The
   * other way round gives the dialog a trigger that is the tooltip's wrapper
   * rather than the button, and the confirmation then never opens from the
   * control that was clicked.
   */
  it('still opens its confirmation when it carries a tooltip', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    render(
      <ConfirmActionButton
        {...props}
        tooltip="Finalize"
        icon={<span aria-hidden>f</span>}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: props.label }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Finalize' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
