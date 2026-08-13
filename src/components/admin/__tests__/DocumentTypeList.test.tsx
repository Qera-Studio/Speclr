import { render, screen } from '@testing-library/react';
import { DOC_TYPES } from '@/lib/domain/registry';

jest.mock('@/server/actions/documents', () => ({
  deleteDraftAction: jest.fn(),
  duplicateDocument: jest.fn(),
  createReceiptForInvoice: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  usePathname: () => '/client', useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }));

import DocumentTypeList from '../DocumentTypeList';

describe('DocumentTypeList', () => {
  it('heads the page with the document type', () => {
    render(<DocumentTypeList spec={DOC_TYPES.CON} documents={[]} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Contracts');
  });

  /**
   * The services library used to hang off the foot of this list, on the
   * argument that a Service exists to be pulled into a contract. It has its own
   * page now: what the studio sells is something you go and read, not a
   * footnote whose position depended on how many contracts existed.
   */
  it('no longer carries the services section', () => {
    render(<DocumentTypeList spec={DOC_TYPES.CON} documents={[]} />);

    expect(screen.queryByRole('heading', { name: 'Services' })).not.toBeInTheDocument();
  });
});
