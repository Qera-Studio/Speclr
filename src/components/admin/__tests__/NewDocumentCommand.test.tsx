import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Profile } from '@/lib/profile';
import { NewDocumentProvider, useNewDocument, newDocumentHref } from '../NewDocumentCommand';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => '/client', useRouter: () => ({ push: mockPush }) }));

function Opener() {
  const { open } = useNewDocument();
  return (
    <button type="button" onClick={open}>
      Open palette
    </button>
  );
}

function renderPalette(profile: Profile = 'client') {
  return render(
    <NewDocumentProvider profile={profile}>
      <Opener />
    </NewDocumentProvider>,
  );
}

beforeEach(() => mockPush.mockClear());

describe('newDocumentHref', () => {
  it('turns a document list route into its create route, keeping the profile', () => {
    expect(newDocumentHref('/client/docs/invoice')).toBe('/client/docs/new/invoice');
    expect(newDocumentHref('/admin/docs/exit-letter')).toBe('/admin/docs/new/exit-letter');
  });
});

describe('NewDocumentCommand', () => {
  it('lists the current profile’s document types', async () => {
    const u = userEvent.setup();
    renderPalette('client');
    await u.click(screen.getByRole('button', { name: 'Open palette' }));

    // Anchored: a card's name is now its label *and* its description, and the
    // receipt's description mentions an invoice.
    for (const label of ['Contract', 'Invoice', 'Receipt']) {
      expect(screen.getByRole('option', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  /**
   * The two halves of the app are sealed from each other. A palette that
   * offered all eight types would be the one place a stipend slip turned up
   * while you were invoicing.
   */
  it('offers nothing from the other profile', async () => {
    const u = userEvent.setup();
    renderPalette('client');
    await u.click(screen.getByRole('button', { name: 'Open palette' }));
    for (const label of ['Offer letter', 'Stipend', 'Pay slip']) {
      expect(screen.queryByRole('option', { name: new RegExp(label, 'i') })).not.toBeInTheDocument();
    }
  });

  it('lists the five HR types in the admin profile', async () => {
    const u = userEvent.setup();
    renderPalette('admin');
    await u.click(screen.getByRole('button', { name: 'Open palette' }));
    expect(screen.getAllByRole('option')).toHaveLength(5);
    expect(screen.getByRole('option', { name: /pay slip/i })).toBeInTheDocument();
  });

  it('opens on ⌘D from anywhere', async () => {
    const u = userEvent.setup();
    renderPalette();
    await u.keyboard('{Meta>}d{/Meta}');
    expect(await screen.findByRole('dialog', { name: /new document/i })).toBeInTheDocument();
  });

  /** Three types a side, all on screen: a filter would filter nothing. */
  it('offers no search field', async () => {
    const u = userEvent.setup();
    renderPalette('client');
    await u.keyboard('{Meta>}d{/Meta}');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('walks the grid sideways and opens on Enter', async () => {
    const u = userEvent.setup();
    renderPalette('client');
    await u.keyboard('{Meta>}d{/Meta}');
    await u.keyboard('{ArrowRight}{ArrowRight}{Enter}');
    expect(mockPush).toHaveBeenCalledWith('/client/docs/new/receipt');
  });

  /** Down is a row, which is three cards — not the next one along. */
  it('walks a whole row on ArrowDown, and clamps at the end', async () => {
    const u = userEvent.setup();
    renderPalette('admin');
    await u.keyboard('{Meta>}d{/Meta}');
    await u.keyboard('{ArrowDown}{Enter}');
    expect(mockPush).toHaveBeenCalledWith('/admin/docs/new/experience-letter');

    mockPush.mockClear();
    await u.keyboard('{Meta>}d{/Meta}');
    await u.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
    expect(mockPush).toHaveBeenCalledWith('/admin/docs/new/exit-letter');
  });

  /** Each card says what it is, not only what it is called. */
  it('describes each type in a line under its name', async () => {
    const u = userEvent.setup();
    renderPalette('client');
    await u.keyboard('{Meta>}d{/Meta}');
    expect(
      screen.getByRole('option', { name: /^Invoice/ }),
    ).toHaveTextContent(/numbered for the financial year/i);
  });

  it('jumps straight to a new document on ⌥ + its letter, with no palette', async () => {
    const u = userEvent.setup();
    renderPalette('client');
    await u.keyboard('{Alt>}{i}{/Alt}');
    expect(mockPush).toHaveBeenCalledWith('/client/docs/new/invoice');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  /**
   * ⌥ is a global keydown, so without this the client profile would jump to a
   * new pay slip — across the seam, from a shortcut that isn't listed anywhere
   * on the side you're looking at.
   */
  it('ignores the other profile’s ⌥ letters', async () => {
    const u = userEvent.setup();
    renderPalette('client');
    await u.keyboard('{Alt>}{p}{/Alt}');
    expect(mockPush).not.toHaveBeenCalled();
  });

  /**
   * ⌥+letter produces accented characters on macOS, and these documents carry
   * legal wording typed by hand — the shortcut must never eat a keystroke aimed
   * at a field.
   */
  it('leaves ⌥ alone while the user is typing into a field', async () => {
    const u = userEvent.setup();
    render(
      <NewDocumentProvider profile="client">
        <input aria-label="Clause" />
      </NewDocumentProvider>,
    );
    await u.click(screen.getByRole('textbox', { name: 'Clause' }));
    await u.keyboard('{Alt>}{i}{/Alt}');
    expect(mockPush).not.toHaveBeenCalled();
  });
});
