import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewDocumentProvider, useNewDocument, newDocumentHref } from '../NewDocumentCommand';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

function Opener() {
  const { open } = useNewDocument();
  return (
    <button type="button" onClick={open}>
      Open palette
    </button>
  );
}

function renderPalette() {
  return render(
    <NewDocumentProvider>
      <Opener />
    </NewDocumentProvider>,
  );
}

beforeEach(() => mockPush.mockClear());

describe('newDocumentHref', () => {
  it('turns a document list route into its create route', () => {
    expect(newDocumentHref('/docs/invoice')).toBe('/docs/new/invoice');
    expect(newDocumentHref('/docs/exit-letter')).toBe('/docs/new/exit-letter');
  });
});

describe('NewDocumentCommand', () => {
  it('opens from the context and lists every document type, grouped', async () => {
    const u = userEvent.setup();
    renderPalette();
    await u.click(screen.getByRole('button', { name: 'Open palette' }));

    for (const label of ['Contract', 'Invoice', 'Receipt', 'Offer letter', 'Stipend']) {
      expect(screen.getByRole('option', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
    expect(screen.getByRole('group', { name: 'Client' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Admin' })).toBeInTheDocument();
  });

  it('opens on ⌘D from anywhere', async () => {
    const u = userEvent.setup();
    renderPalette();
    await u.keyboard('{Meta>}d{/Meta}');
    expect(await screen.findByRole('dialog', { name: /new document/i })).toBeInTheDocument();
  });

  it('filters as you type and opens the match on Enter', async () => {
    const u = userEvent.setup();
    renderPalette();
    await u.keyboard('{Meta>}d{/Meta}');

    await u.type(screen.getByRole('textbox', { name: /search document types/i }), 'rec');
    expect(screen.getByRole('option', { name: /receipt/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /invoice/i })).not.toBeInTheDocument();

    await u.keyboard('{Enter}');
    expect(mockPush).toHaveBeenCalledWith('/docs/new/receipt');
  });

  it('walks the list with arrow keys across group boundaries', async () => {
    const u = userEvent.setup();
    renderPalette();
    await u.keyboard('{Meta>}d{/Meta}');
    // Client has three children, so the fourth row is the first Admin one.
    await u.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
    expect(mockPush).toHaveBeenCalledWith('/docs/new/offer-letter');
  });

  it('says so when nothing matches', async () => {
    const u = userEvent.setup();
    renderPalette();
    await u.keyboard('{Meta>}d{/Meta}');
    await u.type(screen.getByRole('textbox', { name: /search document types/i }), 'zzz');
    expect(screen.getByRole('status')).toHaveTextContent(/no document type matches/i);
  });

  it('jumps straight to a new document on ⌥ + its letter, with no palette', async () => {
    const u = userEvent.setup();
    renderPalette();
    await u.keyboard('{Alt>}{i}{/Alt}');
    expect(mockPush).toHaveBeenCalledWith('/docs/new/invoice');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  /**
   * ⌥+letter produces accented characters on macOS, and these documents carry
   * legal wording typed by hand — the shortcut must never eat a keystroke aimed
   * at a field.
   */
  it('leaves ⌥ alone while the user is typing into a field', async () => {
    const u = userEvent.setup();
    render(
      <NewDocumentProvider>
        <input aria-label="Clause" />
      </NewDocumentProvider>,
    );
    await u.click(screen.getByRole('textbox', { name: 'Clause' }));
    await u.keyboard('{Alt>}{i}{/Alt}');
    expect(mockPush).not.toHaveBeenCalled();
  });
});
