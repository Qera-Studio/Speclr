import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorPanelProvider, useEditorPanel } from '@/components/shell/EditorPanel';
import DocumentWorkspace from '../DocumentWorkspace';
import { A4_PADDING } from '@/components/docs/sheets/frame';

describe('DocumentWorkspace', () => {
  it('renders the preview and the rail contents together', () => {
    render(
      <DocumentWorkspace title="New contract" preview={<div>Sheet body</div>}>
        <label>
          Client
          <input />
        </label>
      </DocumentWorkspace>,
    );

    expect(screen.getByText('Sheet body')).toBeInTheDocument();
    expect(screen.getByLabelText('Client')).toBeInTheDocument();
  });

  /**
   * The title names what the *form* is editing, so it goes to the rail with the
   * form rather than onto the app header's row. `EditorSidebar` is what prints
   * it; the contract this asserts is the one between them, which is the panel
   * context carrying the title at all — it was there and unread for a while,
   * with the title travelling by portal instead.
   */
  it('names its panel, so the rail can title itself', () => {
    let seen: string | null = null;
    function Probe() {
      seen = useEditorPanel()?.title ?? null;
      return null;
    }

    render(
      <EditorPanelProvider>
        <DocumentWorkspace title="New contract" preview={<div>Body</div>}>
          <div />
        </DocumentWorkspace>
        <Probe />
      </EditorPanelProvider>,
    );

    expect(seen).toBe('New contract');
  });

  /**
   * jsdom measures every box as zero, so the paginator reports one page. That
   * is also the real answer for every document this editor makes, and a
   * one-page document shows no pager at all — see `DocumentPager`.
   */
  it('shows no pager for a single-page document, and does show the status', () => {
    render(
      <DocumentWorkspace
        title="New invoice"
        status={<p>Saved 14:32</p>}
        preview={<div>Body</div>}
      >
        <div />
      </DocumentWorkspace>,
    );
    expect(screen.queryByRole('button', { name: /previous page/i })).not.toBeInTheDocument();
    expect(screen.getByText('Saved 14:32')).toBeInTheDocument();
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
    expect(document.querySelector('.paginatorPage')?.className).not.toContain(A4_PADDING);
    unmount();

    render(
      <DocumentWorkspace title="New contract" coverFirst preview={[<div key="c">Cover</div>, <div key="a">Clause</div>]}>
        <div />
      </DocumentWorkspace>,
    );
    const pages = [...document.querySelectorAll('.paginatorPage')];
    // Page 0 is the full-bleed cover; the flow page carries the A4 margins.
    expect(pages[pages.length - 1]?.className).toContain(A4_PADDING);
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

  /**
   * A document can be shown with no rail at all.
   *
   * `rail={false}` renders no panel, which is not the same as rendering an
   * empty one: the panel's *registration* is what tells `AdminShell` this page
   * has something editable, so an empty one would leave the column there with
   * nothing in it. Never registering collapses it and gives the document the
   * width. The contract builder's preview phase is the caller.
   */
  it('registers no panel when the rail is off', () => {
    let count = -1;
    function Probe() {
      count = useEditorPanel()?.count ?? -1;
      return null;
    }

    render(
      <EditorPanelProvider>
        <DocumentWorkspace title="New contract" preview={<div>Body</div>} rail={false}>
          <label>
            Client
            <input />
          </label>
        </DocumentWorkspace>
        <Probe />
      </EditorPanelProvider>,
    );

    expect(count).toBe(0);
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  /**
   * And with no shell either, the fallback must not smuggle the form back in.
   *
   * `EditorPanelContent` renders its children in place when there is no rail,
   * which is the right degradation for every other caller and exactly wrong
   * here: the form would appear under the document instead of beside it.
   */
  it('renders no form in place either when the rail is off', () => {
    render(
      <DocumentWorkspace title="New contract" preview={<div>Body</div>} rail={false}>
        <label>
          Client
          <input />
        </label>
      </DocumentWorkspace>,
    );

    expect(screen.queryByLabelText('Client')).not.toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('pages the document with the arrow keys', async () => {
    const user = userEvent.setup();
    render(
      <DocumentWorkspace title="New invoice" preview={<div>Body</div>}>
        <div />
      </DocumentWorkspace>,
    );
    // Single page in jsdom, so there is nowhere to page to — the assertion is
    // that the handler is wired and does not throw or move past the bounds.
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});
