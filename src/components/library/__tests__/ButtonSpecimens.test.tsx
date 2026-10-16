import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ButtonSpecimens } from '../ButtonSpecimens';
import { CATALOGUE } from '../catalogue';

const entry = CATALOGUE.find((e) => e.slug === 'button')!;

/**
 * The button specimens.
 *
 * What is worth testing is the same as everywhere else on this page: that the
 * examples are the real components being driven, not pictures of them. The
 * *appearance* of a fill is not here and cannot be, because jsdom resolves no
 * stylesheet.
 *
 * The one structural claim is that the page cannot fall behind the primitive.
 * That is enforced by the typecheck rather than here (a fill added to
 * `button.tsx` and not to `VARIANT_USE` fails to compile), and the test below
 * pins the other half: every fill the page knows about actually reaches the
 * page.
 */
describe('the button specimens', () => {
  it('shows every fill and every height the primitive defines', () => {
    render(<ButtonSpecimens entry={entry} />);

    const fills = screen.getByRole('group', { name: 'The fills' });
    for (const name of ['default', 'raised', 'neutral', 'outline', 'secondary', 'ghost', 'destructive', 'link']) {
      expect(within(fills).getByRole('button', { name })).toBeInTheDocument();
    }

    const heights = screen.getByRole('group', { name: 'The heights' });
    for (const name of ['default', 'lg', 'form']) {
      expect(within(heights).getByRole('button', { name })).toBeInTheDocument();
    }
    // The two icon heights are square, so they are named rather than labelled.
    expect(within(heights).getByRole('button', { name: 'Edit, icon' })).toBeInTheDocument();
    expect(within(heights).getByRole('button', { name: 'Edit, icon-sm' })).toBeInTheDocument();
  });

  /**
   * Disabled is the one of the four states that can be shown rather than
   * pointed at, and it is the one with a behaviour: `pointer-events: none`, so
   * the button cannot be clicked or hovered at all.
   */
  it('renders a disabled button that cannot be activated', async () => {
    const u = userEvent.setup();
    render(<ButtonSpecimens entry={entry} />);

    const states = screen.getByRole('group', { name: 'The four states' });
    const disabled = within(states).getAllByRole('button', { name: 'Button' })[3];

    expect(disabled).toBeDisabled();
    await u.click(disabled);
    // Nothing to assert on the click itself: what is pinned is that clicking a
    // disabled control is a no-op rather than an error.
    expect(disabled).toBeDisabled();
  });

  /**
   * The whole of the async-button rule: the label does not change, a spinner
   * joins it, and the control disables itself so the second click cannot land.
   */
  it('keeps the label and disables itself while working', async () => {
    const u = userEvent.setup();
    render(<ButtonSpecimens entry={entry} />);

    const working = screen.getByRole('group', { name: 'Working' });
    const button = within(working).getAllByRole('button', { name: 'Save settings' })[0];

    expect(button).toBeEnabled();
    await u.click(button);

    // Same label, now busy and disabled.
    expect(within(working).getAllByRole('button', { name: 'Save settings' })[0]).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  /**
   * Every icon-only button on this page names itself. It is the one button
   * rule `design-system.test.ts` enforces by failing the build, so a library
   * page shipping a silent one would be demonstrating the violation.
   */
  it('names every icon-only button', () => {
    render(<ButtonSpecimens entry={entry} />);

    for (const group of ['Icon only', 'In a toolbar', 'Copy']) {
      const specimen = screen.getByRole('group', { name: group });
      for (const button of within(specimen).getAllByRole('button')) {
        expect(button).toHaveAccessibleName();
      }
    }
  });

  /**
   * An irreversible action asks in the app's own dialog, and the dialog names
   * the thing rather than saying "Are you sure?".
   */
  it('asks before a destructive action, in the app’s own dialog', async () => {
    const u = userEvent.setup();
    render(<ButtonSpecimens entry={entry} />);

    const specimen = screen.getByRole('group', { name: 'Confirmed' });
    await u.click(within(specimen).getByRole('button', { name: 'Delete this record' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent(/cannot be undone/i);
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  /** The confirm swap answers with its own label, for an action with no visible result. */
});
