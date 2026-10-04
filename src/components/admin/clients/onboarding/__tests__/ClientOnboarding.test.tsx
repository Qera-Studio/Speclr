import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ClientRecord } from '@/lib/domain/types';

/**
 * The wizard shell, and the one thing it does that no step can do for itself:
 * save the step in front of you and leave.
 *
 * The flow has always saved a section at a time. Nothing said so, so the only
 * visible way out was the browser's back button, which looks like abandoning
 * the form.
 */

const push = jest.fn();
const replace = jest.fn();
const saveClientSection = jest.fn();
const setClientCountry = jest.fn();
// Settable per test, because the create path and a saved record read
// different things from the URL. Prefixed `mock` so the hoisted factory below
// may reach it.
let mockParams = 'step=tax';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(mockParams),
}));
jest.mock('@/server/actions/clients', () => ({
  saveClientSection: (...a: unknown[]) => saveClientSection(...a),
  setClientCountry: (...a: unknown[]) => setClientCountry(...a),
  setClientEntityType: jest.fn(),
  createClient: jest.fn(),
  updateClient: jest.fn(),
}));
// Reached through the attachments step, which this test never opens; the real
// module pulls in `next/cache` and cannot load under jsdom.
jest.mock('@/server/actions/attachments', () => ({
  uploadClientAttachment: jest.fn(),
  removeClientAttachment: jest.fn(),
}));

import ClientOnboarding from '../ClientOnboarding';

const client = {
  id: 'c1',
  name: 'Clayora',
  companyName: 'Clayora Private Limited',
  address: 'C-204, Ghaziabad',
  addressParts: {
    line1: 'C-204',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    pincode: '201017',
    country: 'IN',
  },
  email: 'a@clayora.test',
  phone: '+919876543210',
  entityType: 'pvt_ltd',
  // Not registered, so the tax step this test stands on has nothing to refuse.
  // What is under test is where a successful save goes, not what makes one.
  tax: { gstRegistered: false },
  createdAt: 0,
  updatedAt: 0,
} as ClientRecord;

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  mockParams = 'step=tax';
  saveClientSection.mockResolvedValue({ success: true, id: 'c1' });
  setClientCountry.mockResolvedValue({ success: true, id: 'c1' });
  // The identity step's pincode lookup, reached on the create path below.
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false }) });
});

it('saves the step and goes to the list, rather than to the next step', async () => {
  const user = userEvent.setup();
  render(<ClientOnboarding client={client} services={[]} people={[]} />);

  await user.click(screen.getByRole('button', { name: /save and close/i }));

  await waitFor(() => expect(saveClientSection).toHaveBeenCalled());
  expect(saveClientSection.mock.calls[0][0]).toBe('c1');
  await waitFor(() => expect(push).toHaveBeenCalledWith('/client/clients'));
});

it('advances as usual when the step is submitted the ordinary way', async () => {
  const user = userEvent.setup();
  render(<ClientOnboarding client={client} services={[]} people={[]} />);

  // The step's own submit, which the shell portals into the same footer. Named
  // for where it goes, which is also what the step row calls that step, so it
  // is picked out by being the submit.
  const submit = screen
    .getAllByRole('button', { name: /^contacts$/i })
    .find((b) => (b as HTMLButtonElement).type === 'submit');
  await user.click(submit!);

  await waitFor(() => expect(saveClientSection).toHaveBeenCalled());
  expect(push).not.toHaveBeenCalled();
  await waitFor(() => expect(replace).toHaveBeenCalled());
});

/**
 * The row above the step tracker: the kind and the country, kept in view and
 * editable on every step. The row itself stores nothing (`ClientAxes.test`);
 * these cases are about where the shell sends a change.
 */
describe('the kind and country above the steps', () => {
  it('reads both from the record once there is one', () => {
    render(<ClientOnboarding client={client} services={[]} people={[]} />);
    expect(screen.getByRole('button', { name: /type:.*company/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /country:.*india/i })).toBeInTheDocument();
  });

  it('saves a new country onto the record and shows it at once', async () => {
    const user = userEvent.setup();
    render(<ClientOnboarding client={client} services={[]} people={[]} />);

    await user.click(screen.getByRole('button', { name: /country:/i }));
    await user.type(await screen.findByRole('searchbox', { name: /search countries/i }), 'arab');
    await user.click(screen.getByRole('button', { name: /united arab emirates/i }));

    await waitFor(() => expect(setClientCountry).toHaveBeenCalledWith('c1', 'AE'));
    expect(
      await screen.findByRole('button', { name: /country:.*united arab emirates/i }),
    ).toBeInTheDocument();
    // A save, not a navigation: the operator stays on the step they were on.
    expect(replace).not.toHaveBeenCalled();
  });

  it('takes a kind change to the identity step as a pending intent', async () => {
    const user = userEvent.setup();
    render(<ClientOnboarding client={client} services={[]} people={[]} />);

    await user.click(screen.getByRole('button', { name: /type:/i }));
    await user.click(await screen.findByRole('menuitemradio', { name: /an individual/i }));

    expect(replace).toHaveBeenCalledWith('/client/clients/c1?step=identity&kind=individual', {
      scroll: false,
    });
    expect(setClientCountry).not.toHaveBeenCalled();
  });

  it('rewrites the URL before the first save, as the chooser does', async () => {
    const user = userEvent.setup();
    mockParams = 'step=identity&kind=company&country=IN';
    render(<ClientOnboarding services={[]} people={[]} />);

    expect(screen.getByRole('button', { name: /type:.*company/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /country:/i }));
    await user.type(await screen.findByRole('searchbox', { name: /search countries/i }), 'arab');
    await user.click(screen.getByRole('button', { name: /united arab emirates/i }));
    expect(replace).toHaveBeenCalledWith(
      '/client/clients/new?step=identity&kind=company&country=AE',
      { scroll: false },
    );

    await user.click(screen.getByRole('button', { name: /type:/i }));
    await user.click(await screen.findByRole('menuitemradio', { name: /an individual/i }));
    expect(replace).toHaveBeenCalledWith(
      '/client/clients/new?step=identity&kind=individual&country=IN',
      { scroll: false },
    );
    expect(setClientCountry).not.toHaveBeenCalled();
  });
});
