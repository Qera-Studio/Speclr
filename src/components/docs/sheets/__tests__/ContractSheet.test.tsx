import { render, screen } from '@testing-library/react';
import ContractSheet from '../ContractSheet';
import type { ContractDocument, ClientSnapshot } from '@/lib/domain/types';

const clientSnapshot: ClientSnapshot = {
  name: 'Aarav Mehta',
  address: 'Sector 62, Noida',
  email: 'aarav@example.com',
  phone: '9876500000',
};

const contractDoc = {
  type: 'CON',
  status: 'finalized',
  issueDate: '2026-06-10',
  clientId: 'client-1',
  clientSnapshot,
  lineItems: [],
  gstRatePercent: 0,
  schedules: [
    {
      title: 'Website Design & Development',
      overview: 'A full-scope website build.',
      scopeItems: ['Homepage design', 'Contact page'],
      exclusionItems: ['Copywriting'],
      priceNote: '₹50,000 - 50% advance, 50% on delivery',
      milestones: [{ label: 'Design', scope: 'Approved mockups' }],
      revisionsNote: 'Two rounds of revisions included.',
      disclaimerNote: '',
      supportNote: '',
    },
  ],
} as unknown as ContractDocument;

describe('ContractSheet', () => {
  it('renders the cover with the contract title and client name', () => {
    render(<ContractSheet doc={contractDoc} />);
    expect(screen.getByText('Contract Agreement')).toBeInTheDocument();
    expect(screen.getAllByText('Aarav Mehta').length).toBeGreaterThan(0);
  });

  it('renders an MSA clause heading', () => {
    render(<ContractSheet doc={contractDoc} />);
    expect(screen.getByText(/DEFINITIONS/)).toBeInTheDocument();
  });

  it('renders the schedule title', () => {
    render(<ContractSheet doc={contractDoc} />);
    expect(screen.getByText('Website Design & Development')).toBeInTheDocument();
  });
});
