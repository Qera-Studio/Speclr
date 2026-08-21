import { useForm } from 'react-hook-form';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddressFields, { COUNTRY_GROUPS } from '../AddressFields';
import { COUNTRY_SEED } from '@/lib/domain/countries';
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
    expect(screen.getByRole('status')).toHaveTextContent(/filled from this postcode/i);
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
   * The same failure one character at a time, which is how it actually
   * happened: a Paisley postcode edited into a Perth one kept saying Paisley,
   * because between the two there is a moment with no answer at all, and the
   * old one was left standing through it.
   */
  it('drops the old answer the moment the pincode changes', async () => {
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

    // One character back: the code is incomplete, so nothing is known, and
    // saying 'Chennai' beside it would be saying something false.
    await user.type(pincode, '{backspace}');
    expect(screen.getByLabelText(/^city$/i)).toHaveValue('');
    expect(screen.getByLabelText(/^state$/i)).toHaveValue('');

    await user.type(pincode, '7');
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

  /**
   * The field used to strip everything but digits, whatever the country, so a
   * Scottish client could not type their own postcode: 'EH1 1YZ' became '11'.
   * The letters and the space have to survive, and the country has to reach the
   * server, which is what decides the upstream.
   */
  it('keeps the letters in a postcode outside India, and looks it up', async () => {
    mockLookup({ ok: true, city: 'Edinburgh', state: 'Scotland' });
    const user = userEvent.setup();
    render(<Harness initial={{ country: 'GB' }} />);

    await user.type(screen.getByLabelText(/postcode/i), 'EH1 1YZ');
    await settleDebounce();

    expect(screen.getByLabelText(/postcode/i)).toHaveValue('EH1 1YZ');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/pincode/EH1%201YZ?country=GB',
      expect.anything(),
    );
    // And the two words below it are the country's own: a UK address has a post
    // town and a region, not a city and a state.
    expect(screen.getByLabelText(/town/i)).toHaveValue('Edinburgh');
    expect(screen.getByLabelText(/region/i)).toHaveValue('Scotland');
    expect(screen.queryByLabelText(/^state$/i)).not.toBeInTheDocument();
  });

  it('puts the space into a UK postcode typed without one', async () => {
    mockLookup({ ok: false });
    const user = userEvent.setup();
    render(<Harness initial={{ country: 'GB' }} />);

    // Left alone until the code is finished: 'PH28A' could still become
    // 'PH2 8AL', and splitting three from the end would print 'PH 28A' under
    // the cursor.
    await user.type(screen.getByLabelText(/postcode/i), 'PH28A');
    expect(screen.getByLabelText(/postcode/i)).toHaveValue('PH28A');

    await user.type(screen.getByLabelText(/postcode/i), 'L');
    expect(screen.getByLabelText(/postcode/i)).toHaveValue('PH2 8AL');
  });

  it('still refuses a half-typed Indian pincode', async () => {
    mockLookup({ ok: true, city: 'Nope', state: 'Nope' });
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/pincode/i), '2010');
    await settleDebounce();

    expect(global.fetch).not.toHaveBeenCalled();
  });
});

/**
 * A postcode that covers several localities has no town to fill in, and an
 * empty box cannot say whether that is the postcode's doing or the app's. AU
 * 2155 is four suburbs; the region is known and filled, the four are offered.
 */
describe('AddressFields, a postcode with no single town', () => {
  const many = {
    ok: true,
    city: '',
    state: 'New South Wales',
    options: ['Rouse Hill', 'Beaumont Hills', 'Kellyville', 'Kellyville Ridge'],
  };

  // The town is filled with the first locality rather than left blank: a
  // required part of a printed address should not be empty when the code names
  // four candidates and any of them completes it. The count says it is a
  // default and not the only answer.
  it('fills the first locality and says how many the code covers', async () => {
    mockLookup(many);
    const user = userEvent.setup();
    render(<Harness initial={{ country: 'AU' }} />);

    await user.type(screen.getByLabelText(/postcode/i), '2155');
    await settleDebounce();

    expect(screen.getByLabelText(/town/i)).toHaveValue('Rouse Hill');
    // Twice over: the visible line under the field, and the live region, since
    // a field quietly changing shape is not read out.
    expect(screen.getAllByText(/covers 4 localities/i)).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent(/covers 4 localities/i);
    expect(screen.getByLabelText(/region/i)).toHaveValue('New South Wales');
  });

  it('offers the rest in the field itself', async () => {
    mockLookup(many);
    const user = userEvent.setup();
    render(<Harness initial={{ country: 'AU' }} />);

    await user.type(screen.getByLabelText(/postcode/i), '2155');
    await settleDebounce();

    await user.click(screen.getByLabelText(/town/i));
    await user.click(screen.getByRole('option', { name: 'Kellyville' }));

    expect(screen.getByLabelText(/town/i)).toHaveValue('Kellyville');
    // Still a picker, because the postcode still covers four: the default was
    // disagreed with, not resolved.
    expect(screen.getAllByText(/covers 4 localities/i)).toHaveLength(2);
  });

  it('takes the offer back when the postcode changes', async () => {
    mockLookup(many);
    const user = userEvent.setup();
    render(<Harness initial={{ country: 'AU' }} />);

    await user.type(screen.getByLabelText(/postcode/i), '2155');
    await settleDebounce();

    mockLookup({ ok: true, city: 'Sydney', state: 'New South Wales' });
    await user.clear(screen.getByLabelText(/postcode/i));
    await user.type(screen.getByLabelText(/postcode/i), '2000');
    await settleDebounce();

    expect(screen.queryByRole('button', { name: 'Rouse Hill' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/town/i)).toHaveValue('Sydney');
  });

  it('does not offer a list against a town already typed', async () => {
    mockLookup(many);
    const user = userEvent.setup();
    render(<Harness initial={{ country: 'AU' }} />);

    await user.type(screen.getByLabelText(/town/i), 'Kellyville');
    await user.type(screen.getByLabelText(/postcode/i), '2155');
    await settleDebounce();

    expect(screen.queryByText(/no single town/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/town/i)).toHaveValue('Kellyville');
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

/**
 * Two hundred and forty-three rows is far past the point where a flat list is
 * scanned rather than read, and a continent is how somebody holds the world in
 * their head. Search still runs across the whole list, so grouping never makes
 * finding one slower.
 */
describe('the country list', () => {
  it('files each country under its continent', () => {
    for (const { iso2, continent } of COUNTRY_SEED) {
      const group = COUNTRY_GROUPS.find((g) => g.label === continent);
      expect(group?.items.map((i) => i.value)).toContain(iso2);
    }
  });

  it('renders no empty heading, and loses no country', () => {
    for (const group of COUNTRY_GROUPS) expect(group.items.length).toBeGreaterThan(0);
    expect(COUNTRY_GROUPS.flatMap((g) => g.items)).toHaveLength(COUNTRY_SEED.length);
  });

  // Ordered by how often Qera bills them, not alphabetically. India is in the
  // first group and it is the first row of it.
  it('puts India first', () => {
    expect(COUNTRY_GROUPS[0].items[0].value).toBe('IN');
  });
});
