import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CountryChooser from '../CountryChooser';
import { COUNTRY_SEED } from '@/lib/domain/countries';

/**
 * The screen before step 1, which asks both the type and the country.
 *
 * They were two pages and are now one, on request. Choosing does not advance
 * for either: 243 targets a click apart is a page where the wrong one gets hit,
 * and now that the type shares the page, advancing on its click would take the
 * page away before the country below it had been answered.
 *
 * `pick` answers the type, because every test below needs one before Continue
 * does anything.
 */
const pick = async (user: ReturnType<typeof userEvent.setup>, kind = /a company/i) =>
  user.click(screen.getByRole('button', { name: kind }));
describe('CountryChooser', () => {
  it('lists every country under its continent', () => {
    render(<CountryChooser onContinue={jest.fn()} onBack={jest.fn()} />);

    // The two type cards are pressable too, so they are counted out.
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(
      COUNTRY_SEED.length + 2,
    );
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

    // Looked up once: every role query names ~245 buttons, and five of them
    // were enough to cross Jest's timeout when the full suite loads the CPU.
    const next = screen.getByRole('button', { name: /continue/i });
    expect(next).toBeDisabled();

    // A country alone is not enough, which is the half that the merge added.
    await user.click(screen.getByRole('button', { name: /Norway/ }));
    expect(next).toBeDisabled();

    await pick(user);
    await user.click(next);

    expect(onContinue).toHaveBeenCalledWith('company', 'NO');
  });

  it('replaces the selection rather than adding to it', async () => {
    const user = userEvent.setup();
    const onContinue = jest.fn();
    render(<CountryChooser onContinue={onContinue} onBack={jest.fn()} />);

    await pick(user);
    await user.click(screen.getByRole('button', { name: /Kenya/ }));
    await user.click(screen.getByRole('button', { name: /Japan/ }));

    // One country and one type, never two of either.
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(onContinue).toHaveBeenCalledWith('company', 'JP');
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

    await pick(user);
    await user.click(screen.getByRole('button', { name: /Iceland/ }));
    await user.type(screen.getByLabelText(/search countries/i), 'peru');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(onContinue).toHaveBeenCalledWith('company', 'IS');
  });

  /*
    The type half, inherited from the `KindChooser` tests when that page was
    folded into this one. The behaviour it guards changed with the merge, which
    is why those tests could not simply move: choosing a type used to *be* the
    answer, and now it is half of one.
  */
  it('offers both types, and neither advances on its own', async () => {
    const user = userEvent.setup();
    const onContinue = jest.fn();
    render(<CountryChooser onContinue={onContinue} onBack={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /an individual/i }));

    expect(onContinue).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /an individual/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // And a type alone leaves Continue dead, the mirror of the country case.
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('replaces the type rather than adding to it', async () => {
    const user = userEvent.setup();
    const onContinue = jest.fn();
    render(<CountryChooser onContinue={onContinue} onBack={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /an individual/i }));
    await user.click(screen.getByRole('button', { name: /a company/i }));
    await user.click(screen.getByRole('button', { name: /Japan/ }));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(onContinue).toHaveBeenCalledWith('company', 'JP');
  });
});
