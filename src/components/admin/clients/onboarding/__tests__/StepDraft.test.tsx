import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaxStep from '../TaxStep';
import { draftKey } from '@/lib/draft';
import type { ClientRecord } from '@/lib/domain/types';

/**
 * A refresh must not empty the form.
 *
 * Unmounting and rendering again is what a refresh looks like from the
 * component's side, and it is also what switching to the other profile and
 * coming back looks like. One mechanism covers both, which is why they are
 * tested together.
 */

const saveClientSection = jest.fn();
jest.mock('@/server/actions/clients', () => ({
  saveClientSection: (...a: unknown[]) => saveClientSection(...a),
}));

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
  createdAt: 0,
  updatedAt: 0,
} as ClientRecord;

const step = () => <TaxStep client={client} onSaved={jest.fn()} submitLabel="Contacts" />;

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  saveClientSection.mockResolvedValue({ success: true, id: 'c1' });
});

it('brings back what was typed but not saved', async () => {
  const user = userEvent.setup();
  const first = render(step());
  await user.type(screen.getByLabelText('PAN'), 'AABCQ2864Q');

  // The write is debounced, so give it the moment a real refresh would.
  await new Promise((resolve) => setTimeout(resolve, 400));
  first.unmount();

  render(step());
  expect(await screen.findByDisplayValue('AABCQ2864Q')).toBeInTheDocument();
});

/**
 * The record is the truth once a step saves. A draft that outlived its save
 * would restore itself over the top of the saved values next time the step was
 * opened, which is worse than having no draft at all.
 */
it('forgets the draft once the step saves', async () => {
  const user = userEvent.setup();
  render(step());

  // A GSTIN as well as the PAN, because the step will not save without one
  // while the client is GST registered. Its embedded PAN is the same ten
  // characters, which is the agreement the cross-check is there to enforce.
  await user.type(screen.getByLabelText('GSTIN'), '09AABCQ2864Q1ZQ');
  await user.type(screen.getByLabelText('PAN'), 'AABCQ2864Q');
  await new Promise((resolve) => setTimeout(resolve, 400));
  expect(sessionStorage.getItem(draftKey('c1', 'tax'))).not.toBeNull();

  await user.click(screen.getByRole('button', { name: /contacts/i }));

  expect(saveClientSection).toHaveBeenCalled();
  expect(sessionStorage.getItem(draftKey('c1', 'tax'))).toBeNull();
});

it('leaves the form alone when there is no draft', () => {
  render(step());
  expect(screen.getByLabelText('PAN')).toHaveValue('');
});
