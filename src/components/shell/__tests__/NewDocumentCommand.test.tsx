import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Profile } from '@/lib/profile';
import { DOC_SAMPLES } from '@/components/docs/samples';
import { NewDocumentProvider, useNewDocument, newDocumentHref } from '@/components/shell/NewDocumentCommand';
import { NAV_BY_PROFILE } from '@/components/shell/nav';

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
    for (const label of ['Contract', 'Invoice', 'Receipt', 'Service Quotation', 'Credit note']) {
      expect(screen.getByRole('option', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('option')).toHaveLength(5);
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

  /**
   * The cards share one highlight, exactly as a menu's rows do. Two things
   * follow, and both are asserted here:
   *
   * `data-highlighted` is what the hook watches, so the selected card has to
   * carry it, and only the selected card, or the fill has two places to be.
   */
  it('marks exactly one card for the travelling highlight', async () => {
    const u = userEvent.setup();
    renderPalette('client');
    await u.keyboard('{Meta>}d{/Meta}');

    const marked = () =>
      screen.getAllByRole('option').filter((card) => card.hasAttribute('data-highlighted'));
    expect(marked()).toHaveLength(1);
    expect(marked()[0]).toHaveAccessibleName(/^Contract/);

    await u.keyboard('{ArrowRight}');
    expect(marked()).toHaveLength(1);
    expect(marked()[0]).toHaveAccessibleName(/^Invoice/);
  });

  /**
   * And the pointer moves that one mark rather than painting a second fill of
   * its own. The keyboard cursor and the pointer are one highlight here, unlike
   * the nav rail where hover and active are deliberately two: a rail's active
   * fill says which page you are on and must not travel, while this one is only
   * a cursor. So pointing at a card selects it, and Enter opens what the fill
   * is sitting on.
   */
  it('moves that mark to the card under the pointer, and opens it on Enter', async () => {
    const u = userEvent.setup();
    renderPalette('client');
    await u.keyboard('{Meta>}d{/Meta}');

    await u.hover(screen.getByRole('option', { name: /^Receipt/ }));
    const marked = screen
      .getAllByRole('option')
      .filter((card) => card.hasAttribute('data-highlighted'));
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveAccessibleName(/^Receipt/);

    await u.keyboard('{Enter}');
    expect(mockPush).toHaveBeenCalledWith('/client/docs/new/receipt');
  });

  /**
   * A card selected by the pointer must not draw the focus ring, and this is a
   * bug the magic move introduced rather than a rule that predates it.
   *
   * Selection moves focus, which is what makes Enter open the card the fill is
   * sitting on. But `.focus()` called from code inherits the dialog's
   * keyboard-entry modality, so the browser reports `:focus-visible` and paints
   * the 2px ring even though a mouse caused the move. Measured in Chromium, on
   * both themes: the ring chased the pointer across the grid, which is a
   * keyboard affordance shown to a mouse user and a second thing saying what
   * the travelling fill already says.
   *
   * So the card records what moved the selection, and the ring is drawn only
   * for the keyboard. jsdom cannot resolve `:focus-visible` against a real
   * modality, so what is pinned here is the mark the styling hangs off.
   */
  it('draws the focus ring for the keyboard and not for the pointer', async () => {
    const u = userEvent.setup();
    renderPalette('client');
    await u.keyboard('{Meta>}d{/Meta}');

    const selected = () =>
      screen.getAllByRole('option').find((card) => card.hasAttribute('data-highlighted'))!;
    expect(selected()).toHaveAttribute('data-moved-by', 'keyboard');

    await u.hover(screen.getByRole('option', { name: /^Receipt/ }));
    expect(selected()).toHaveAttribute('data-moved-by', 'pointer');

    // And back again: an arrow key after a hover is the keyboard asking for its
    // ring back, not a pointer move that happens to have moved the selection.
    await u.keyboard('{ArrowLeft}');
    expect(selected()).toHaveAttribute('data-moved-by', 'keyboard');
  });

  /**
   * The Service Quotation shipped with no sample, so its card fell back to the
   * bare icon while every other card showed the page it would make — a hole
   * nothing could see, because `DOC_SAMPLES` is keyed by slug and a missing key
   * is a valid lookup. This joins the two lists so the *next* document type
   * cannot arrive the same way.
   */
  it('shows a preview of every type it offers, on both sides', () => {
    for (const profile of ['client', 'admin'] as const) {
      for (const link of NAV_BY_PROFILE[profile].documents) {
        const slug = link.href.slice(link.href.lastIndexOf('/') + 1);
        expect(DOC_SAMPLES[slug]?.doc.type).toBeDefined();
      }
    }
  });
});
