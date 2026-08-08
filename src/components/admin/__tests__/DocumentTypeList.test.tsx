import { render, screen } from '@testing-library/react';
import { DOC_TYPES } from '@/lib/domain/registry';
import { SERVICES } from '@/lib/domain/contract/seed/services';

jest.mock('@/server/actions/documents', () => ({
  deleteDraftAction: jest.fn(),
  duplicateDocument: jest.fn(),
  createReceiptForInvoice: jest.fn(),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }));

import DocumentTypeList from '../DocumentTypeList';

const services = SERVICES;

/**
 * Services live as a section of the contract list rather than a Records nav
 * entry: a Service exists to be pulled into a contract as a Part.
 */
describe('DocumentTypeList', () => {
  it('carries the services section on the contract list', () => {
    render(<DocumentTypeList spec={DOC_TYPES.CON} documents={[]} services={services} />);

    expect(screen.getByRole('heading', { name: 'Services' })).toBeInTheDocument();
    // A tab per Schedule, because which Schedule a Service belongs to is what
    // decides how the work is paid for, approved and owned. Setup opens.
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Setup',
      'Build',
      'Retainer',
      'Audit',
    ]);
    expect(screen.getByText('Domain and DNS')).toBeInTheDocument();
  });

  it('shows the services empty state when there are none', () => {
    render(<DocumentTypeList spec={DOC_TYPES.CON} documents={[]} services={[]} />);

    expect(screen.getByText('No services yet')).toBeInTheDocument();
  });

  it('leaves the page heading to the document type, so services is a sub-section', () => {
    render(<DocumentTypeList spec={DOC_TYPES.CON} documents={[]} services={services} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Contracts');
    expect(screen.getByRole('heading', { name: 'Services' }).tagName).toBe('H2');
  });

  it('shows no services section on any other document type', () => {
    render(<DocumentTypeList spec={DOC_TYPES.INV} documents={[]} />);

    expect(screen.queryByRole('heading', { name: 'Services' })).not.toBeInTheDocument();
  });
});
