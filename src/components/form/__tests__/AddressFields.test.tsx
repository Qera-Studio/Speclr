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

  it('fills city and state from a six-digit Indian pincode', async () => {
    mockLookup({ ok: true, city: 'Ghaziabad', state: 'Uttar Pradesh' });
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/pincode/i), '201017');
    await settleDebounce();

    await waitFor(() => expect(screen.getByLabelText(/^city$/i)).toHaveValue('Ghaziabad'));
    expect(screen.getByLabelText(/^state$/i)).toHaveValue('Uttar Pradesh');
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
