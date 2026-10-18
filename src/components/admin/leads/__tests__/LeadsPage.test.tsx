import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeadsPage from '../LeadsPage';
import LeadEditor from '../LeadEditor';
import type { Lead } from '@/lib/domain/lead';
import { deleteLead, saveLead } from '@/server/actions/leads';

jest.mock('@/server/actions/leads', () => ({
  saveLead: jest.fn(async () => ({ success: true })),
  deleteLead: jest.fn(async () => ({ success: true })),
}));
const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: jest.fn() }) }));

const SERVICES = [
  { code: 'WEB', name: 'Custom Website' },
  { code: 'SEO', name: 'SEO' },
];
const base = { company: '', email: '', phone: '', source: '' as const, serviceCodes: [], notes: '' };
const LEADS: Lead[] = [
  { ...base, id: '6f1c2a1e-6c3b-4a7e-9d6a-1b2c3d4e5f60', name: 'Asha Rao', company: 'Clayora', stage: 'new', createdAt: '2026-10-16' },
  { ...base, id: '7f1c2a1e-6c3b-4a7e-9d6a-1b2c3d4e5f61', name: 'Dev Mehta', stage: 'contract_sent', createdAt: '2026-10-10' },
];

beforeEach(() => jest.clearAllMocks());

describe('LeadsPage', () => {
  it('groups leads under their stage, in pipeline order, hiding empty stages', () => {
    render(<LeadsPage leads={LEADS} services={SERVICES} />);
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['New', 'Contract sent']);
  });

  it('says so when there are no leads yet, and links to adding the first', () => {
    render(<LeadsPage leads={[]} services={SERVICES} />);
    expect(screen.getByRole('link', { name: 'Add your first lead' })).toHaveAttribute('href', '/client/leads/new');
  });

  /** Adding and editing are pages, not a side panel (17 October 2026). */
  it('links each lead to its own page, and adding to a new one', () => {
    render(<LeadsPage leads={LEADS} services={SERVICES} />);
    expect(screen.getByRole('link', { name: 'Asha Rao' })).toHaveAttribute('href', `/client/leads/${LEADS[0].id}`);
    expect(screen.getByRole('link', { name: 'Add lead' })).toHaveAttribute('href', '/client/leads/new');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('searches by name and company', async () => {
    const user = userEvent.setup();
    render(<LeadsPage leads={LEADS} services={SERVICES} />);
    await user.type(screen.getByRole('searchbox', { name: 'Search leads' }), 'clay');
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.queryByText('Dev Mehta')).not.toBeInTheDocument();
  });

});

describe('LeadEditor', () => {
  it('adds a lead with the services they asked about, then returns to the list', async () => {
    const user = userEvent.setup();
    render(<LeadEditor services={SERVICES} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Add lead' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Name'), 'Nina Shah');
    await user.click(screen.getByRole('button', { name: 'Custom Website' }));
    expect(screen.getByRole('button', { name: 'Custom Website' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Add lead' }));

    expect(saveLead).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Nina Shah', stage: 'new', serviceCodes: ['WEB'] }),
    );
    expect(saveLead).toHaveBeenCalledWith(expect.not.objectContaining({ id: expect.anything() }));
    expect(push).toHaveBeenCalledWith('/client/leads');
  });

  it('edits a lead by its id', async () => {
    const user = userEvent.setup();
    render(<LeadEditor lead={LEADS[0]} services={SERVICES} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Asha Rao' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save lead' }));
    expect(saveLead).toHaveBeenCalledWith(expect.objectContaining({ id: LEADS[0].id, name: 'Asha Rao' }));
  });

  /** A delete is real erasure, so it asks first. */
  it('deletes a lead only after asking', async () => {
    const user = userEvent.setup();
    render(<LeadEditor lead={LEADS[0]} services={SERVICES} />);
    await user.click(screen.getByRole('button', { name: 'Delete lead' }));
    expect(deleteLead).not.toHaveBeenCalled();

    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Delete lead' }));
    expect(deleteLead).toHaveBeenCalledWith(LEADS[0].id);
    expect(push).toHaveBeenCalledWith('/client/leads');
  });
});
