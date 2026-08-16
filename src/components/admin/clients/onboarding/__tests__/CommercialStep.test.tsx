import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommercialStep from '../CommercialStep';
import type { ClientRecord } from '@/lib/domain/types';

/**
 * The three fields here that store something other than what they show.
 *
 * A billing cycle is stored as a count of months, not as a name plus a count,
 * so "custom" and "quarterly" are the same field. The day of the month is a
 * day, not a date. And a vendor portal is recorded by having an address, so
 * switching it off has to take the address with it or the record keeps a portal
 * nobody uses.
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

beforeEach(() => {
  jest.clearAllMocks();
  saveClientSection.mockResolvedValue({ success: true });
});

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /services/i }));

const payload = () => saveClientSection.mock.calls[0][2];

async function pickRetainer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: /retainer/i }));
}

async function pickCycle(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByLabelText('Billing cycle'));
  await user.click(await screen.findByRole('option', { name }));
}

// A retainer will not save without both, so a test about either still supplies
// the other.
async function pickDay(user: ReturnType<typeof userEvent.setup>, day: string) {
  await user.click(screen.getByLabelText('Billed on day'));
  await user.click(await screen.findByRole('button', { name: day }));
}

describe('CommercialStep', () => {
  it('stores a named cycle as its interval in months', async () => {
    const user = userEvent.setup();
    render(<CommercialStep client={client} onSaved={onSaved} submitLabel="Services" />);

    await pickRetainer(user);
    await pickCycle(user, /quarterly/i);
    await pickDay(user, '1');
    await submit(user);

    expect(payload().billingIntervalMonths).toBe(3);
  });

  it('takes a cycle nobody has a name for', async () => {
    const user = userEvent.setup();
    render(<CommercialStep client={client} onSaved={onSaved} submitLabel="Services" />);

    await pickRetainer(user);
    await pickCycle(user, /custom/i);
    // The same field the presets write, which is the point: there is no second
    // value recording that this one was typed rather than chosen.
    await user.type(screen.getByLabelText('Months between invoices'), '2');
    await pickDay(user, '1');
    await submit(user);

    expect(payload().billingIntervalMonths).toBe(2);
  });

  it('will not save a retainer that says nothing about when it bills', async () => {
    const user = userEvent.setup();
    render(<CommercialStep client={client} onSaved={onSaved} submitLabel="Services" />);

    await pickRetainer(user);
    await submit(user);

    expect(saveClientSection).not.toHaveBeenCalled();
    expect(await screen.findByText(/how often this retainer is billed/i)).toBeInTheDocument();
    expect(screen.getByText(/day of the month it is billed on/i)).toBeInTheDocument();
  });

  it('asks neither of those of a project, which bills against a scope', async () => {
    const user = userEvent.setup();
    render(<CommercialStep client={client} onSaved={onSaved} submitLabel="Services" />);

    await user.click(screen.getByRole('radio', { name: /project/i }));
    await submit(user);

    expect(saveClientSection).toHaveBeenCalled();
  });

  it('takes its own name back when a custom cycle is one of the named ones', async () => {
    const user = userEvent.setup();
    render(<CommercialStep client={client} onSaved={onSaved} submitLabel="Services" />);

    await pickRetainer(user);
    await pickCycle(user, /custom/i);
    // Two keystrokes: the box must survive the first one, or 12 is untypeable.
    await user.type(screen.getByLabelText('Months between invoices'), '12');
    expect(screen.getByLabelText('Months between invoices')).toHaveValue('12');

    await user.tab();
    expect(screen.queryByLabelText('Months between invoices')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Billing cycle')).toHaveValue('Annual');

    await pickDay(user, '1');
    await submit(user);
    expect(payload().billingIntervalMonths).toBe(12);
  });

  it('picks a day of the month, with no month attached to it', async () => {
    const user = userEvent.setup();
    render(<CommercialStep client={client} onSaved={onSaved} submitLabel="Services" />);

    await pickRetainer(user);
    await pickCycle(user, /monthly/i);
    await pickDay(user, '15');
    await submit(user);

    expect(payload().billingDay).toBe(15);
  });

  it('drops the portal address when the portal is switched off', async () => {
    const user = userEvent.setup();
    const withPortal = {
      ...client,
      commercial: { vendorPortalUrl: 'https://clayora.coupahost.com' },
    } as ClientRecord;
    render(<CommercialStep client={withPortal} onSaved={onSaved} submitLabel="Services" />);

    // On, because there is an address: the switch has no column of its own.
    expect(screen.getByLabelText('Vendor portal address')).toHaveValue(
      'https://clayora.coupahost.com',
    );

    await user.click(screen.getByRole('switch', { name: /invoices go through a portal/i }));
    await submit(user);

    expect(payload().vendorPortalUrl).toBeUndefined();
  });
});
