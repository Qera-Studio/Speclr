import { render, screen } from '@testing-library/react';
import { DOC_TYPES } from '@/lib/domain/registry';
import type { ServiceTemplate } from '@/lib/domain/serviceTemplate';

jest.mock('@/server/actions/documents', () => ({
  deleteDraftAction: jest.fn(),
  duplicateDocument: jest.fn(),
  createReceiptForInvoice: jest.fn(),
}));
jest.mock('@/server/actions/services', () => ({
  createService: jest.fn(),
  updateService: jest.fn(),
  deleteServiceAction: jest.fn(),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }));

import DocumentTypeList from '../DocumentTypeList';

const services = [
  { id: 's1', name: 'Brand identity', overview: 'Logo, palette, type.' },
] as unknown as ServiceTemplate[];

/**
 * Services live as a section of the contract list rather than a Records nav
 * entry: a service template exists to be pulled into a contract.
 */
describe('DocumentTypeList', () => {
  it('carries the services section on the contract list', () => {
    render(<DocumentTypeList spec={DOC_TYPES.CON} documents={[]} services={services} />);

    expect(screen.getByRole('heading', { name: 'Services' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add service/i })).toBeInTheDocument();
    expect(screen.getByText('Brand identity')).toBeInTheDocument();
  });

  it('shows the services empty state when there are none', () => {
    render(<DocumentTypeList spec={DOC_TYPES.CON} documents={[]} services={[]} />);

    expect(screen.getByText('No services yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add service/i })).toBeInTheDocument();
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
