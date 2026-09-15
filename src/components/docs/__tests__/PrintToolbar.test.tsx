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

    /**
     * The sealed band stays below the collapsed nav's flyout.
     *
     * A class assertion, the same shape and for the same reason as
     * `AdminShell`'s overscroll test: the failure is a paint order between two
     * boxes in different components, and reproducing it needs the nav peeked
     * open in a real browser, which jsdom cannot do at all.
     *
     * The number is a ceiling rather than a preference. This band only has to
     * cover the document pages sliding under it, and those are unlayered, so
     * `z-10` does the whole job. At `z-20` it *tied* with the peek
     * (`ui/sidebar.tsx`), both being in the root stacking context, and a tie
     * goes to document order, which this band wins, so it painted over a
     * flyout whose entire purpose is to cover content. Anything at or above 20
     * here is that bug again.
     */
    it('keeps the sealed band under the nav flyout', () => {
      const { container } = renderFinalized();
      const band = container.querySelector('[data-slot="doc-locked-band"]')!;
      expect(band).toHaveClass('z-10');
      // The nav's peek is z-20; a tie or a win is the bug.
      expect(band.className).not.toMatch(/\bz-(2[0-9]|[3-9][0-9])\b/);
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
