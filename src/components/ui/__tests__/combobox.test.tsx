import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';

const STATES: ComboboxOption[] = [
  { value: '09', label: '09 — Uttar Pradesh' },
  { value: '27', label: '27 — Maharashtra' },
  { value: '29', label: '29 — Karnataka' },
];

function Harness({ options = STATES }: { options?: ComboboxOption[] }) {
  const [value, setValue] = useState('');
  return (
    <>
      <label htmlFor="state">Place of supply</label>
      <Combobox
        id="state"
        options={options}
        value={value}
        onValueChange={setValue}
        placeholder="Select a state…"
      />
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
});
