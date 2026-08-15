import { useForm } from 'react-hook-form';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddressFields from '../AddressFields';
import { emptyAddressParts, type AddressParts } from '@/lib/domain/address';

interface Values {
  addressParts: AddressParts;
}

function Harness({ initial }: { initial?: Partial<AddressParts> }) {
  const { control } = useForm<Values>({
    defaultValues: { addressParts: { ...emptyAddressParts, ...initial } },
  });
  return <AddressFields control={control} name="addressParts" idPrefix="t" />;
}

const originalFetch = global.fetch;

function mockLookup(body: unknown, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({ ok, json: async () => body });
}

/**
 * Waits past the lookup debounce and lets any resulting state settle. Wrapped
 * in act() so React owns the update — the debounce fires on a real timer, so
 * without this the "not wrapped in act" warning is unavoidable.
 */
async function settleDebounce() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 600));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('AddressFields', () => {
  it('renders every part of the address', () => {
    mockLookup({ ok: false });
    render(<Harness />);

    for (const label of [/building \/ flat/i, /street \/ area/i, /pincode/i, /^city$/i, /^state$/i, /country/i]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('locks the fields it filled, and unlocks them when the pincode changes', async () => {
    mockLookup({ ok: true, city: 'Ghaziabad', state: 'Uttar Pradesh' });
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/pincode/i), '201017');
    await settleDebounce();

    expect(screen.getByLabelText(/^city$/i)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(/^state$/i)).toHaveAttribute('readonly');

    // Correcting the pincode hands control back — an autofill is never a trap.
    await user.type(screen.getByLabelText(/pincode/i), '1');

    expect(screen.getByLabelText(/^city$/i)).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText(/^state$/i)).not.toHaveAttribute('readonly');
  });

  /**
   * The explanation used to be a standing line of text under the pincode. It
   * is now behind an icon — but it must still be a real, focusable control
   * (not hover-only) and the sentence must still reach a screen reader the
   * moment the lock happens, without anyone going to look for it.
   */
  it('explains the lock through a focusable icon and a live region', async () => {
    mockLookup({ ok: true, city: 'Ghaziabad', state: 'Uttar Pradesh' });
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.queryByRole('button', { name: /why are city and state locked/i })).toBeNull();

    await user.type(screen.getByLabelText(/pincode/i), '201017');
    await settleDebounce();

    expect(
      screen.getByRole('button', { name: /why are city and state locked/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/filled from this pincode/i);
  });

  it('leaves a hand-typed city editable', async () => {
    mockLookup({ ok: true, city: 'Ghaziabad', state: 'Uttar Pradesh' });
    const user = userEvent.setup();
    render(<Harness initial={{ city: 'Noida' }} />);

    await user.type(screen.getByLabelText(/pincode/i), '201017');
    await settleDebounce();

    expect(screen.getByLabelText(/^city$/i)).toHaveValue('Noida');
    expect(screen.getByLabelText(/^city$/i)).not.toHaveAttribute('readonly');
  });

  it('fills city and state from a six-digit Indian pincode', async () => {
    mockLookup({ ok: true, city: 'Ghaziabad', state: 'Uttar Pradesh' });
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/pincode/i), '201017');
    await settleDebounce();

    await waitFor(() => expect(screen.getByLabelText(/^city$/i)).toHaveValue('Ghaziabad'));
    expect(screen.getByLabelText(/^state$/i)).toHaveValue('Uttar Pradesh');
  });

  /**
   * The regression this file exists for.
   *
   * "Only fill what is empty" was correct for the first lookup and wrong for
   * every one after it: city and state are no longer empty, so a *corrected*
   * pincode unlocked the fields and then declined to update them — leaving a
   * Chennai pincode sitting beside Ghaziabad. Two places saying where a client
   * is, disagreeing, which is the whole failure the client record exists to
   * prevent.
   */
  it('refills city and state when the pincode is corrected', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, city: 'Chennai', state: 'Tamil Nadu' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, city: 'Ghaziabad', state: 'Uttar Pradesh' }) });
    const user = userEvent.setup();
    render(<Harness />);

    const pincode = screen.getByLabelText(/pincode/i);
    await user.type(pincode, '600042');
    await settleDebounce();
    await waitFor(() => expect(screen.getByLabelText(/^city$/i)).toHaveValue('Chennai'));

    await user.clear(pincode);
    await user.type(pincode, '201017');
    await settleDebounce();

    await waitFor(() => expect(screen.getByLabelText(/^city$/i)).toHaveValue('Ghaziabad'));
    expect(screen.getByLabelText(/^state$/i)).toHaveValue('Uttar Pradesh');
  });

  /**
   * The other half of the same rule: replacing our own answer is fair game,
   * replacing someone's correction is not. Editing an autofilled city makes it
   * theirs, and the next lookup must leave it alone.
   */
  it('stops refilling a city once it has been corrected by hand', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true, city: 'Chennai', state: 'Tamil Nadu' }) });
    const user = userEvent.setup();
    render(<Harness />);

    const pincode = screen.getByLabelText(/pincode/i);
    await user.type(pincode, '600042');
    await settleDebounce();
    await waitFor(() => expect(screen.getByLabelText(/^city$/i)).toHaveValue('Chennai'));

    // Editing the pincode unlocks the fields; the city is then corrected.
    await user.clear(pincode);
    await user.clear(screen.getByLabelText(/^city$/i));
    await user.type(screen.getByLabelText(/^city$/i), 'Tambaram');
    await user.type(pincode, '600045');
    await settleDebounce();

    expect(screen.getByLabelText(/^city$/i)).toHaveValue('Tambaram');
  });

  it('waits for a complete pincode before looking anything up', async () => {
    mockLookup({ ok: true, city: 'Ghaziabad', state: 'Uttar Pradesh' });
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/pincode/i), '2010');

    // Nothing to look up yet — a partial code would just waste a request.
    await settleDebounce();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('never overwrites a city the user already typed', async () => {
    mockLookup({ ok: true, city: 'Ghaziabad', state: 'Uttar Pradesh' });
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/^city$/i), 'My Town');
    await user.type(screen.getByLabelText(/pincode/i), '201017');
    await settleDebounce();

    // The postal database does not get to overrule a deliberate entry.
    await waitFor(() => expect(screen.getByLabelText(/^state$/i)).toHaveValue('Uttar Pradesh'));
    expect(screen.getByLabelText(/^city$/i)).toHaveValue('My Town');
  });

  it('stays silent and editable when the lookup fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/pincode/i), '201017');
    await settleDebounce();

    // No thrown error, no alert, and the fields remain the user's to fill.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/^city$/i), 'Typed By Hand');
    expect(screen.getByLabelText(/^city$/i)).toHaveValue('Typed By Hand');
  });

  it('does not look up pincodes outside India', async () => {
    mockLookup({ ok: true, city: 'Nope', state: 'Nope' });
    const user = userEvent.setup();
    render(<Harness initial={{ country: 'US' }} />);

    await user.type(screen.getByLabelText(/pincode/i), '201017');
    await settleDebounce();

    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('AddressFields lookup feedback', () => {
  /**
   * The lookup used to be announced only through a live region: sighted users
   * saw the city and state fill themselves in with no visible cause.
   */
  it('shows a spinner while the pincode is being looked up', async () => {
    mockLookup({ ok: true, city: 'Ghaziabad', state: 'Uttar Pradesh' });
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/pincode/i), '201017');

    // Decorative — the live region already announces it, so it must not be
    // reachable by name. Its presence is what is asserted.
    await waitFor(() =>
      expect(document.querySelector('.animate-spin')).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/pincode/i)).toHaveAttribute('aria-describedby');
  });

  it('clears the spinner once the lookup has settled', async () => {
    mockLookup({ ok: true, city: 'Ghaziabad', state: 'Uttar Pradesh' });
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/pincode/i), '201017');
    await settleDebounce();
    await settleDebounce();

    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
  });
});
