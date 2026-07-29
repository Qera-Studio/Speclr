import { useForm } from 'react-hook-form';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneField from '../PhoneField';

interface Values {
  phone: string;
}

function Harness({ initial = '' }: { initial?: string }) {
  const { control, watch } = useForm<Values>({ defaultValues: { phone: initial } });
  return (
    <>
      <PhoneField control={control} name="phone" id="phone" />
      <output data-testid="stored">{watch('phone')}</output>
    </>
  );
}

describe('PhoneField', () => {
  it('defaults to India', () => {
    render(<Harness />);
    expect(screen.getByLabelText(/phone country/i)).toHaveValue('🇮🇳 India +91');
  });

  it('stores a typed number in international form', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/^phone$/i), '9876543210');

    expect(screen.getByTestId('stored')).toHaveTextContent('+919876543210');
  });

  it('splits a stored number back into country and digits for editing', () => {
    render(<Harness initial="+12015550123" />);

    expect(screen.getByLabelText(/phone country/i)).toHaveValue('🇺🇸 United States +1');
    expect(screen.getByLabelText(/^phone$/i)).toHaveValue('2015550123');
  });

  it('keeps a legacy value editable instead of discarding it', () => {
    // Records predate this field's structure — fixtures hold values as bare as
    // '9'. It must load into the input so it can be corrected in place.
    render(<Harness initial="9" />);
    expect(screen.getByLabelText(/^phone$/i)).toHaveValue('9');
  });

  it('ignores punctuation the user types', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/^phone$/i), '98765-43210');

    expect(screen.getByLabelText(/^phone$/i)).toHaveValue('9876543210');
    expect(screen.getByTestId('stored')).toHaveTextContent('+919876543210');
  });

  it('re-composes the number when the country changes', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/^phone$/i), '2015550123');
    await user.click(screen.getByLabelText(/phone country/i));
    await user.click(await screen.findByRole('option', { name: /United States/ }));

    expect(screen.getByTestId('stored')).toHaveTextContent('+12015550123');
  });
});
