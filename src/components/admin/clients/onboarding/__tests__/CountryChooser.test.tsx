import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CountryChooser from '../CountryChooser';
import { COUNTRY_SEED } from '@/lib/domain/countries';

/**
 * The screen between the kind and step 1.
 *
 * The opposite call from `KindChooser`: 243 targets a click apart is a page
 * where the wrong one gets hit, so choosing and moving on are separate.
 */
describe('CountryChooser', () => {
  it('lists every country under its continent', () => {
    render(<CountryChooser onContinue={jest.fn()} onBack={jest.fn()} />);

    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(COUNTRY_SEED.length);
    expect(screen.getByRole('heading', { name: 'Asia' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'South America' })).toBeInTheDocument();
  });

  it('does not move on when a country is clicked', async () => {
    const user = userEvent.setup();
    const onContinue = jest.fn();
    render(<CountryChooser onContinue={onContinue} onBack={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /Germany/ }));

    expect(onContinue).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Germany/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('answers on Continue, and not before there is an answer', async () => {
    const user = userEvent.setup();
    const onContinue = jest.fn();
    render(<CountryChooser onContinue={onContinue} onBack={jest.fn()} />);

    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Norway/ }));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(onContinue).toHaveBeenCalledWith('NO');
  });

  it('replaces the selection rather than adding to it', async () => {
    const user = userEvent.setup();
    const onContinue = jest.fn();
    render(<CountryChooser onContinue={onContinue} onBack={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /Kenya/ }));
    await user.click(screen.getByRole('button', { name: /Japan/ }));

    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(onContinue).toHaveBeenCalledWith('JP');
  });

  it('filters as it is typed, and hides a continent nothing matched', async () => {
    const user = userEvent.setup();
    render(<CountryChooser onContinue={jest.fn()} onBack={jest.fn()} />);

    await user.type(screen.getByLabelText(/search countries/i), 'brazil');

    expect(screen.getByRole('button', { name: /Brazil/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Germany/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Europe' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 countries match.');
  });

  /**
   * Somebody who knows a client is 'AE' should not have to remember whether
   * this list files them under "United Arab Emirates" or "UAE".
   */
  it('finds a country by its code', async () => {
    const user = userEvent.setup();
    render(<CountryChooser onContinue={jest.fn()} onBack={jest.fn()} />);

    await user.type(screen.getByLabelText(/search countries/i), 'ae');

    expect(screen.getByRole('button', { name: /United Arab Emirates/ })).toBeInTheDocument();
  });

  it('says so when nothing matches', async () => {
    const user = userEvent.setup();
    render(<CountryChooser onContinue={jest.fn()} onBack={jest.fn()} />);

    await user.type(screen.getByLabelText(/search countries/i), 'atlantis');

    expect(screen.getByText(/no country matches/i)).toBeInTheDocument();
  });

  /**
   * A selection made before typing survives the filter hiding it, or narrowing
   * the list would silently take back an answer already given.
   */
  it('keeps a choice that the filter scrolls past', async () => {
    const user = userEvent.setup();
    const onContinue = jest.fn();
    render(<CountryChooser onContinue={onContinue} onBack={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /Iceland/ }));
    await user.type(screen.getByLabelText(/search countries/i), 'peru');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(onContinue).toHaveBeenCalledWith('IS');
  });
});
