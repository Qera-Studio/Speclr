import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KindChooser from '../KindChooser';

/**
 * The screen before step 1.
 *
 * Two cards and no next button: there are two options and choosing one *is* the
 * decision, so a confirm step would ask the same question twice.
 */
describe('KindChooser', () => {
  it('offers both kinds as real buttons', () => {
    render(<KindChooser onChoose={jest.fn()} />);

    expect(screen.getByRole('button', { name: /an individual/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /a company/i })).toBeInTheDocument();
    // Nothing to press after choosing, and nothing to skip past.
    expect(screen.queryByRole('button', { name: /continue|next/i })).not.toBeInTheDocument();
  });

  it('chooses on the click itself', async () => {
    const user = userEvent.setup();
    const onChoose = jest.fn();
    render(<KindChooser onChoose={onChoose} />);

    await user.click(screen.getByRole('button', { name: /an individual/i }));
    expect(onChoose).toHaveBeenCalledWith('individual');

    await user.click(screen.getByRole('button', { name: /a company/i }));
    expect(onChoose).toHaveBeenLastCalledWith('company');
  });
});
