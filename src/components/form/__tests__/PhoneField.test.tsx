import { useForm } from 'react-hook-form';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneField from '../PhoneField';

interface Values {
  phone: string;
}

function Harness({
  initial = '',
  defaultCountry,
}: {
  initial?: string;
  defaultCountry?: string;
}) {
  const { control, watch } = useForm<Values>({ defaultValues: { phone: initial } });
  return (
    <>
      <PhoneField
        control={control}
        name="phone"
        id="phone"
        defaultCountry={defaultCountry}
      />
      <output data-testid="stored">{watch('phone')}</output>
    </>
  );
}

describe('PhoneField', () => {
  it('defaults to India, showing the flag only', () => {
    // The dial code lives in front of the digits it belongs to, not here as
    // well — showing it in both places printed '+91' twice, side by side.
    render(<Harness />);
    expect(screen.getByLabelText(/phone country/i)).toHaveValue('🇮🇳');
  });

  /**
   * The country is still searchable by name even though the field stops
   * showing it — the name is how you find a country, the code is all you need
   * once you have.
   */
  it('finds a country by name in the list', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.clear(screen.getByLabelText(/phone country/i));
    await user.type(screen.getByLabelText(/phone country/i), 'United Arab');
    expect(await screen.findByRole('option', { name: /United Arab Emirates/ })).toBeVisible();
  });

  it('stores a typed number in international form', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/^phone$/i), '9876543210');

    expect(screen.getByTestId('stored')).toHaveTextContent('+919876543210');
  });

  it('splits a stored number back into country and digits for editing', () => {
    render(<Harness initial="+12015550123" />);

    expect(screen.getByLabelText(/phone country/i)).toHaveValue('🇺🇸');
    expect(screen.getByLabelText(/^phone$/i)).toHaveValue('201 555 0123');
  });

  /**
   * Grouped the way each country writes its own numbers. Display only — the
   * stored value is untouched E.164.
   */
  it('groups the digits as they are typed', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByLabelText(/^phone$/i);
    await user.type(input, '98765');
    expect(input).toHaveValue('98765');
    await user.type(input, '43210');
    expect(input).toHaveValue('98765 43210');
    expect(screen.getByTestId('stored')).toHaveTextContent('+919876543210');
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

    expect(screen.getByLabelText(/^phone$/i)).toHaveValue('98765 43210');
    expect(screen.getByTestId('stored')).toHaveTextContent('+919876543210');
  });

  /**
   * The regression that sent you back to India.
   *
   * A half-typed number has no E.164 form, so the field stores bare digits —
   * and re-parsing bare digits falls back to India by design. The re-seed
   * effect could not tell that write from an outside one, so choosing any
   * other country survived exactly until the first keystroke.
   */
  it('keeps the chosen country once you start typing', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText(/phone country/i));
    await user.click(await screen.findByRole('option', { name: /United Arab Emirates/ }));
    await user.type(screen.getByLabelText(/^phone$/i), '56');

    expect(screen.getByLabelText(/phone country/i)).toHaveValue('🇦🇪');

    await user.type(screen.getByLabelText(/^phone$/i), '1235678');
    expect(screen.getByLabelText(/^phone$/i)).toHaveValue('56 123 5678');
    expect(screen.getByTestId('stored')).toHaveTextContent('+971561235678');
  });

  it('re-composes the number when the country changes', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/^phone$/i), '2015550123');
    await user.click(screen.getByLabelText(/phone country/i));
    // Anchored on the flag: the list also holds "United States Virgin Islands",
    // and a loose match would find two options rather than fail loudly.
    await user.click(await screen.findByRole('option', { name: /🇺🇸 United States/ }));

    expect(screen.getByTestId('stored')).toHaveTextContent('+12015550123');
  });

  /**
   * An 11th digit on an Indian number is not a number being typed, it is a
   * mistake. Reporting it only on submit lets someone tab away from a field
   * that already looks filled in — which is how an eleven-digit phone number
   * got as far as a saved record.
   */
  describe('the live length cap', () => {
    it('refuses a digit past the country maximum', async () => {
      const user = userEvent.setup();
      render(<Harness />);

      await user.type(screen.getByLabelText(/^phone$/i), '98765432100');

      expect(screen.getByLabelText(/^phone$/i)).toHaveValue('98765 43210');
      expect(screen.getByTestId('stored')).toHaveTextContent('+919876543210');
    });

    /**
     * The cap is now the country's own maximum rather than E.164's flat
     * ceiling, so a US number stops at 10 where it used to accept 14.
     */
    it('stops at the length that country actually uses', async () => {
      const user = userEvent.setup();
      render(<Harness initial="+12015550123" />);

      await user.type(screen.getByLabelText(/^phone$/i), '9999');
      expect(screen.getByLabelText(/^phone$/i)).toHaveValue('201 555 0123');
    });

    /** The cap is per country, so it has to move when the country does. */
    it('trims what is already typed when a shorter country is chosen', async () => {
      const user = userEvent.setup();
      // A real German mobile: 11 national digits, one more than India allows.
      render(<Harness initial="+4915123456789" />);
      expect(screen.getByLabelText(/^phone$/i)).toHaveValue('1512 3456789');

      await user.click(screen.getByLabelText(/phone country/i));
      await user.click(await screen.findByRole('option', { name: '🇮🇳 India +91' }));

      // Ten digits left, regrouped as India writes them.
      expect(screen.getByLabelText(/^phone$/i)).toHaveValue('151 234 5678');
    });
  });
});


/**
 * The client's country is where their phone almost always is, so an empty field
 * starts there instead of on India. A **default**, never a lock: the picker is
 * fully usable for the client abroad whose contact is not.
 */
describe('defaultCountry', () => {
  it('starts an empty field on the record’s country', () => {
    render(<Harness defaultCountry="GB" />);
    expect(screen.getByLabelText(/phone country/i)).toHaveValue('🇬🇧');
  });

  it('never overrules a stored number, which carries its own country', () => {
    // Editing a record must not rewrite the dial code of a number somebody has
    // already checked against a business card.
    render(<Harness initial="+919876543210" defaultCountry="US" />);
    expect(screen.getByLabelText(/phone country/i)).toHaveValue('🇮🇳');
  });

  it('ignores a country it does not carry, rather than blanking the picker', () => {
    render(<Harness defaultCountry="ZZ" />);
    expect(screen.getByLabelText(/phone country/i)).toHaveValue('🇮🇳');
  });

  it('lets the operator choose a different one', async () => {
    const user = userEvent.setup();
    render(<Harness defaultCountry="GB" />);

    await user.click(screen.getByLabelText(/phone country/i));
    await user.click(await screen.findByRole('option', { name: /Singapore/ }));

    expect(screen.getByLabelText(/phone country/i)).toHaveValue('🇸🇬');
  });
});
