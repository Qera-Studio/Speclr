import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServicesStep from '../ServicesStep';
import type { ClientRecord } from '@/lib/domain/types';
import type { ContractService } from '@/lib/domain/service';

/**
 * One Schedule is on screen at a time, so the two things worth pinning are
 * that the tabs really do hide the rest, and that what is added under a hidden
 * one survives anyway — both in the list below the cards and in the payload.
 *
 * The third is that typing a rate adds the service. Nobody prices something
 * they have not engaged, and making them press the button afterwards is how
 * the number they just typed gets lost.
 */

const saveClientSection = jest.fn();
jest.mock('@/server/actions/clients', () => ({
  saveClientSection: (...args: unknown[]) => saveClientSection(...args),
}));

const onSaved = jest.fn();

const client = {
  id: 'c1',
  name: 'Clayora',
  address: 'C-204, Ghaziabad',
  email: 'a@clayora.test',
  phone: '+919876543210',
  createdAt: 0,
  updatedAt: 0,
} as ClientRecord;

const service = (code: string, name: string, scheduleKey: string) =>
  ({ code, name, scheduleKey, sortOrder: 0, archived: false }) as ContractService;

// Setup is the first tab, so 01 is on screen and 05 is behind Build.
const services = [
  service('01', 'Domain and email setup', 'setup'),
  service('05', 'Shopify build', 'build'),
];

beforeEach(() => {
  jest.clearAllMocks();
  saveClientSection.mockResolvedValue({ success: true });
});

const show = () =>
  render(
    <ServicesStep client={client} onSaved={onSaved} submitLabel="Attachments" services={services} />,
  );

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /attachments/i }));

const openTab = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(screen.getByRole('tab', { name }));

const payload = () => saveClientSection.mock.calls[0][2];

describe('ServicesStep', () => {
  it('shows one Schedule at a time', async () => {
    const user = userEvent.setup();
    show();

    expect(screen.getByText('Domain and email setup')).toBeInTheDocument();
    expect(screen.queryByText('Shopify build')).not.toBeInTheDocument();

    await openTab(user, 'Build');
    expect(screen.getByText('Shopify build')).toBeInTheDocument();
    expect(screen.queryByText('Domain and email setup')).not.toBeInTheDocument();
  });

  it('adds a service with the card button, at the catalogue rate', async () => {
    const user = userEvent.setup();
    show();

    await user.click(screen.getByRole('button', { name: 'Add Domain and email setup' }));
    await submit(user);

    expect(payload().services).toEqual([{ code: '01' }]);
  });

  it('adds a service by pricing it, and keeps the rate in paise', async () => {
    const user = userEvent.setup();
    show();

    await user.type(screen.getByLabelText('Agreed rate for Domain and email setup'), '2500');
    await submit(user);

    expect(payload().services).toEqual([{ code: '01', ratePaise: 250000 }]);
  });

  it('keeps what was added under a Schedule that is no longer on screen', async () => {
    const user = userEvent.setup();
    show();

    await user.click(screen.getByRole('button', { name: 'Add Domain and email setup' }));
    await openTab(user, 'Build');
    await user.click(screen.getByRole('button', { name: 'Add Shopify build' }));

    // The card is gone with its tab; the list below carries both.
    expect(
      screen.queryByRole('button', { name: 'Add Domain and email setup' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Domain and email setup' })).toBeInTheDocument();

    await submit(user);
    expect(payload().services).toEqual([{ code: '01' }, { code: '05' }]);
  });

  it('does not advance when Enter is pressed in a field', async () => {
    const user = userEvent.setup();
    show();

    await user.type(screen.getByLabelText('Agreed rate for Domain and email setup'), '2500{Enter}');

    expect(saveClientSection).not.toHaveBeenCalled();
  });

  it('removes a service from the list, and its rate with it', async () => {
    const user = userEvent.setup();
    show();

    await user.type(screen.getByLabelText('Agreed rate for Domain and email setup'), '2500');
    await user.click(screen.getByRole('button', { name: 'Remove Domain and email setup' }));
    await submit(user);

    expect(payload().services).toEqual([]);
  });
});
