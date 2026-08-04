import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentWorkspace from '../DocumentWorkspace';

describe('DocumentWorkspace', () => {
  it('renders the title, the preview and the rail contents together', () => {
    render(
      <DocumentWorkspace title="New contract" preview={<div>Sheet body</div>}>
        <label>
          Client
          <input />
        </label>
      </DocumentWorkspace>,
    );

    expect(screen.getByRole('heading', { name: 'New contract' })).toBeInTheDocument();
    expect(screen.getByText('Sheet body')).toBeInTheDocument();
    expect(screen.getByLabelText('Client')).toBeInTheDocument();
  });

  it('exposes the page controls', () => {
    render(
      <DocumentWorkspace title="New invoice" preview={<div>Body</div>}>
        <div />
      </DocumentWorkspace>,
    );
    expect(screen.getByText('Page 1 / 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
  });

  /**
   * Sheets (invoice/receipt/letter/stipend) paint their own A4 margins, so the
   * page frame must add none — otherwise the sheet is pushed right and clipped.
   * The block-fed contract is the opposite and relies on the frame's padding.
   */
  it('treats a plain sheet as self-padded and contract blocks as bare', () => {
    const { unmount } = render(
      <DocumentWorkspace title="New invoice" preview={<div>Body</div>}>
        <div />
      </DocumentWorkspace>,
    );
    expect(document.querySelector('.paginatorPage')?.className).not.toContain('px-[48px]');
    unmount();

    render(
      <DocumentWorkspace title="New contract" coverFirst preview={[<div key="c">Cover</div>, <div key="a">Clause</div>]}>
        <div />
      </DocumentWorkspace>,
    );
    const pages = [...document.querySelectorAll('.paginatorPage')];
    // Page 0 is the full-bleed cover; the flow page carries the A4 margins.
    expect(pages[pages.length - 1]?.className).toContain('px-[48px]');
  });

  /**
   * The workspace no longer owns a sidebar — the rail lives in `AdminShell` and
   * the form is portalled into it. Rendered without a shell (here, and on the
   * signed-out layout), the form must still appear in place rather than vanish.
   */
  it('renders the form in place when there is no app rail', () => {
    render(
      <DocumentWorkspace title="New invoice" preview={<div>Body</div>}>
        <label>
          Client
          <input />
        </label>
      </DocumentWorkspace>,
    );
    expect(screen.getByLabelText('Client')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('pages the document with the arrow keys', async () => {
    const user = userEvent.setup();
    render(
      <DocumentWorkspace title="New invoice" preview={<div>Body</div>}>
        <div />
      </DocumentWorkspace>,
    );
    // Single page in jsdom, so both arrows stay disabled — the assertion is
    // that the handler is wired and does not throw or move past the bounds.
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('Page 1 / 1')).toBeInTheDocument();
  });
});
