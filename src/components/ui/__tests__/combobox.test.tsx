import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';

const STATES: ComboboxOption[] = [
  { value: '09', label: '09 — Uttar Pradesh' },
  { value: '27', label: '27 — Maharashtra' },
  { value: '29', label: '29 — Karnataka' },
];

function Harness({
  options = STATES,
  freeText,
  initial = '',
}: {
  options?: ComboboxOption[];
  freeText?: boolean;
  initial?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="state">Place of supply</label>
      <Combobox
        id="state"
        options={options}
        value={value}
        onValueChange={setValue}
        placeholder="Select a state…"
        freeText={freeText}
      />
      {/* Something to move focus to, so the blur reset has somewhere to go. */}
      <button type="button">elsewhere</button>
      <output data-testid="selected">{value}</output>
    </>
  );
}

describe('Combobox', () => {
  it('is reachable by its label', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Place of supply')).toBeInTheDocument();
  });

  it('reports the chosen option by value, not label', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText('Place of supply'));
    await user.click(await screen.findByRole('option', { name: '27 — Maharashtra' }));

    expect(screen.getByTestId('selected')).toHaveTextContent('27');
  });

  it('filters the list as the user types', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText('Place of supply'));
    await user.type(screen.getByLabelText('Place of supply'), 'Karn');

    expect(await screen.findByRole('option', { name: '29 — Karnataka' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '27 — Maharashtra' })).not.toBeInTheDocument();
  });

  it('tells the user when nothing matches', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText('Place of supply'));
    await user.type(screen.getByLabelText('Place of supply'), 'zzzz');

    expect(await screen.findByText('No matches.')).toBeInTheDocument();
  });

  it('renders an empty option list without crashing', () => {
    render(<Harness options={[]} />);
    expect(screen.getByLabelText('Place of supply')).toBeInTheDocument();
  });

  /**
   * `freeText`, the opt-in mode where the options are suggestions rather than
   * the permitted set. A Service item's group is the caller it was added for.
   */
  describe('with freeText', () => {
    it('keeps a value that is not on the list', async () => {
      const user = userEvent.setup();
      render(<Harness freeText />);

      await user.type(screen.getByLabelText('Place of supply'), 'Somewhere new');

      expect(screen.getByTestId('selected')).toHaveTextContent('Somewhere new');
    });

    /**
     * The regression this mode actually shipped with, found in a browser and
     * invisible to a test that never blurs.
     *
     * Leaving the field with text matching no row makes Base UI reset the input
     * to the selected item's label, which for a new value is nothing, so the
     * field emptied itself on the way out. That arrives as an `input-clear`
     * and is the one reason `freeText` ignores.
     */
    it('survives losing focus', async () => {
      const user = userEvent.setup();
      render(<Harness freeText />);

      await user.type(screen.getByLabelText('Place of supply'), 'Somewhere new');
      // Typing opens the popup, which makes the rest of the page inert, so the
      // list is dismissed before focus can land anywhere else. Escape is what a
      // reader does too; the point under test is what survives leaving.
      await user.keyboard('{Escape}');
      await user.click(screen.getByRole('button', { name: 'elsewhere' }));

      expect(screen.getByTestId('selected')).toHaveTextContent('Somewhere new');
    });

    /** Clearing by hand must still empty it: the field is optional. */
    it('can still be cleared', async () => {
      const user = userEvent.setup();
      render(<Harness freeText initial="Somewhere new" />);

      await user.clear(screen.getByLabelText('Place of supply'));
      await user.keyboard('{Escape}');
      await user.click(screen.getByRole('button', { name: 'elsewhere' }));

      expect(screen.getByTestId('selected')).toHaveTextContent('');
    });

    /** An empty list means "this one is new" here, not "nothing to pick". */
    it('does not claim there are no matches', async () => {
      const user = userEvent.setup();
      render(<Harness freeText />);

      await user.click(screen.getByLabelText('Place of supply'));
      await user.type(screen.getByLabelText('Place of supply'), 'zzzz');

      expect(screen.queryByText('No matches.')).not.toBeInTheDocument();
    });
  });
});
