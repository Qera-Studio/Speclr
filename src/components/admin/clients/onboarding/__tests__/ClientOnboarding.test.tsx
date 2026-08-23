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

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams('step=tax'),
}));
jest.mock('@/server/actions/clients', () => ({
  saveClientSection: (...a: unknown[]) => saveClientSection(...a),
  setClientEntityType: jest.fn(),
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
  saveClientSection.mockResolvedValue({ success: true, id: 'c1' });
});

it('saves the step and goes to the list, rather than to the next step', async () => {
  const user = userEvent.setup();
  render(<ClientOnboarding client={client} services={[]} />);

  await user.click(screen.getByRole('button', { name: /save and close/i }));

  await waitFor(() => expect(saveClientSection).toHaveBeenCalled());
  expect(saveClientSection.mock.calls[0][0]).toBe('c1');
  await waitFor(() => expect(push).toHaveBeenCalledWith('/client/clients'));
});

it('advances as usual when the step is submitted the ordinary way', async () => {
  const user = userEvent.setup();
  render(<ClientOnboarding client={client} services={[]} />);

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
