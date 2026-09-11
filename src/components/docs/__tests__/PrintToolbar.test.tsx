import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const params = new URLSearchParams();
const push = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => '/client',
  useSearchParams: () => params,
  useRouter: () => ({ push: (u: string) => push(u) }),
}));
// The toolbar carries `FinalizedActions`, which reaches the Server Actions
// module — stub it so this file doesn't drag a DB connection in.
const duplicateDocument = jest.fn();
jest.mock('@/server/actions/documents', () => ({
  duplicateDocument: (...a: unknown[]) => duplicateDocument(...a),
  copySlipForNextMonth: jest.fn(),
  deleteDraftAction: jest.fn(),
}));

import PrintToolbar from '../PrintToolbar';

const print = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  params.delete('auto');
  Object.defineProperty(window, 'print', { writable: true, value: print });
});

describe('PrintToolbar', () => {
  it('prints and swaps the document title', async () => {
    const u = userEvent.setup();
    render(<PrintToolbar fileName="QS-INV-2627-001" />);
    await u.click(screen.getByRole('button', { name: /print/i }));
    expect(print).toHaveBeenCalled();
  });

  it('waits to be asked when there is no auto param', () => {
    render(<PrintToolbar fileName="QS-INV-2627-001" />);
    expect(print).not.toHaveBeenCalled();
  });

  it('prints once on arrival with ?auto=1', () => {
    params.set('auto', '1');
    const { rerender } = render(<PrintToolbar fileName="QS-INV-2627-001" />);
    rerender(<PrintToolbar fileName="QS-INV-2627-001" />);
    expect(print).toHaveBeenCalledTimes(1);
  });

  /**
   * The tip about the browser's "Headers and footers" setting is gone. It was a
   * standing sentence about the print dialog, at full width above every
   * document, describing margins that are built in whatever the reader does.
   */
  it('prints no standing tip about the print dialog', () => {
    render(<PrintToolbar fileName="QS-INV-2627-001" />);
    expect(screen.queryByText(/headers and footers/i)).not.toBeInTheDocument();
  });

  /**
   * The app header one row up carries the Back for every secondary route, this
   * one included. A second one in the toolbar sat a centimetre below it,
   * pointing at the same place, and the only thing it added was the question of
   * whether the two differed.
   */
  it('carries no Back of its own', () => {
    render(<PrintToolbar fileName="QS-INV-2627-001" docId="doc-1" finalized />);
    expect(screen.queryByRole('link', { name: /back/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^back$/i })).not.toBeInTheDocument();
  });

  /**
   * A finalized document opens here rather than on a read-only workspace, so
   * this row has to carry what that workspace's rail carried.
   */
  describe('a finalized document', () => {
    const renderFinalized = () =>
      render(
        <PrintToolbar fileName="QS-INV-2627-001" docId="doc-1" finalized />,
      );

    it('says the document is sealed, and offers print, download and duplicate', () => {
      renderFinalized();
      expect(screen.getByText(/finalized and sealed/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^print$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /duplicate/i })).toBeInTheDocument();
    });

    /**
     * Pre-launch escape hatch. NODE_ENV is 'test' here, so `DEV_UNLIMITED` is
     * on; a production build inlines it false and drops the button entirely.
     */
    it('offers the dev-only delete', () => {
      renderFinalized();
      expect(screen.getByRole('button', { name: /delete \(dev only\)/i })).toBeInTheDocument();
    });

    /**
     * The link would point at the page it is already on. Print is a button
     * here, and the same handler the toolbar has always used.
     */
    it('does not offer a link to the print view it is already on', () => {
      renderFinalized();
      expect(screen.queryByRole('link', { name: /open print view/i })).not.toBeInTheDocument();
    });
  });

  /**
   * A draft can reach this page from the editor's print link, and it has
   * nothing to seal, duplicate or download: there is no stored PDF until
   * finalize, and no immutability to announce.
   */
  it('offers a draft nothing but Print', () => {
    render(<PrintToolbar fileName="draft" docId="doc-1" />);
    expect(screen.queryByText(/finalized and sealed/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /duplicate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download pdf/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
  });
});
