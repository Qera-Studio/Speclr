import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignPage from '../DesignPage';
import { CATALOGUE } from '../catalogue';

/**
 * The library page: a rail of components on the left, one component's variants
 * on the right.
 *
 * What is worth testing here is the part that is not a screenshot. That the
 * rail says which component is showing, that the URL carries it so a variant
 * can be linked to, and above all **that the specimens are live** — a gallery
 * of dead renders cannot be used to finalise a control's behaviour, which is
 * the whole reason this page exists rather than a folder of PNGs.
 *
 * The geometry (the trough's colour, the 8px gap, the pill's lightness against
 * its background) is not here and cannot be: jsdom resolves no stylesheet.
 * That is measured in `e2e/component-library.spec.ts`.
 */

const replace = jest.fn();
let search = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
  usePathname: () => '/design',
  useSearchParams: () => search,
}));

beforeEach(() => {
  replace.mockClear();
  search = new URLSearchParams();
});

/** The rail's own link for a component, scoped so the heading cannot match. */
const railLink = (name: string) =>
  within(screen.getByRole('navigation', { name: 'Design system' })).getByRole('button', {
    name,
  });

describe('the rail', () => {
  it('lists every component in the catalogue', () => {
    render(<DesignPage />);

    for (const entry of CATALOGUE) {
      expect(railLink(entry.name)).toBeInTheDocument();
    }
  });

  it('opens on the overview when the URL names nothing', () => {
    render(<DesignPage />);

    expect(railLink('How this is built')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('heading', { name: 'How this is built', level: 1 })).toBeInTheDocument();
  });

  it('opens on the component the URL names', () => {
    search = new URLSearchParams('section=atoms&item=pagination');
    render(<DesignPage />);

    expect(railLink('Pagination')).toHaveAttribute('aria-current', 'true');
  });

  /**
   * A slug naming nothing is a stale bookmark, not a reason to show an empty
   * pane. It reads as "nothing chosen".
   */
  it('falls back to the section for an unknown item, and to the overview for an unknown section', () => {
    search = new URLSearchParams('section=atoms&item=nonesuch');
    render(<DesignPage />);
    expect(screen.getByRole('heading', { name: 'Button', level: 1 })).toBeInTheDocument();
  });

  it('writes the component to the URL so a link can name one', async () => {
    const user = userEvent.setup();
    render(<DesignPage />);

    await user.click(railLink('Pagination'));

    expect(replace).toHaveBeenCalledWith('/design?section=atoms&item=pagination', {
      scroll: false,
    });
  });
});

describe('the component being shown', () => {
  beforeEach(() => {
    search = new URLSearchParams('section=atoms&item=pagination');
  });

  it('says where the component lives and which rule governs it', () => {
    render(<DesignPage />);

    expect(screen.getByText('src/components/ui/pagination.tsx')).toBeInTheDocument();
    expect(screen.getByText(/§2\.10/)).toBeInTheDocument();
  });

  /**
   * Every variant in the catalogue reaches the page, named.
   *
   * The `note` is deliberately not asserted, because it is deliberately not
   * rendered: the card is a heading over the component itself, and the
   * reasoning lives in `catalogue.ts` for a reader of the source. What still
   * matters here is that no variant goes missing from the page.
   */
  it('shows every variant, each named', () => {
    render(<DesignPage />);

    for (const variant of CATALOGUE.find((e) => e.slug === 'pagination')!.variants) {
      expect(screen.getByRole('heading', { name: variant.name })).toBeInTheDocument();
    }
  });
});

/**
 * The specimens are the real control, wired to real state.
 *
 * This is the difference between a library and a screenshot, and it is the
 * reason the page can be used to finalise behaviour: the thing on the screen
 * is what ships, driven the way a caller drives it.
 */
describe('the pagination specimens', () => {
  beforeEach(() => {
    search = new URLSearchParams('section=atoms&item=pagination');
  });

  it('pages when a number in a specimen is clicked', async () => {
    const user = userEvent.setup();
    render(<DesignPage />);

    const specimen = screen.getByRole('group', { name: 'Windowed' });
    const pager = within(specimen).getByRole('navigation');

    // 11 is in the window this specimen opens on; 1 is its leading anchor.
    await user.click(within(pager).getByRole('button', { name: /^Page 11\b/ }));
    expect(within(pager).getByRole('button', { name: /^Page 11\b/ })).toHaveAttribute(
      'aria-current',
      'page',
    );

    // The anchor is one click from anywhere, which is what it is there for.
    await user.click(within(pager).getByRole('button', { name: /^Page 1\b/ }));
    expect(within(pager).getByRole('button', { name: /^Page 1\b/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  /**
   * The batch turn is the behaviour that cannot be seen in a static render, and
   * it is exactly what this page is for: stepping off the last slot of a window
   * starts the next four rather than sliding one along.
   */
  it('turns the window a batch at a time from the arrow', async () => {
    const user = userEvent.setup();
    render(<DesignPage />);

    const specimen = screen.getByRole('group', { name: 'Windowed' });
    const pager = within(specimen).getByRole('navigation');

    // The windowed specimen opens on a page mid-list, so both anchors show.
    expect(within(pager).getByRole('button', { name: /^Page 9\b/ })).toBeInTheDocument();
    expect(within(pager).getByRole('button', { name: /^Page 12\b/ })).toBeInTheDocument();

    // Page 12 is the last slot of its batch: stepping past it starts 13-16.
    await user.click(within(pager).getByRole('button', { name: /^Page 12\b/ }));
    await user.click(within(pager).getByRole('button', { name: /^Next page/ }));

    expect(within(pager).getByRole('button', { name: /^Page 13\b/ })).toBeInTheDocument();
    expect(within(pager).queryByRole('button', { name: /^Page 9\b/ })).not.toBeInTheDocument();
  });

  it('renders nothing for a single page, which is the variant', () => {
    render(<DesignPage />);

    const specimen = screen.getByRole('group', { name: 'Single page' });
    expect(within(specimen).queryByRole('navigation')).not.toBeInTheDocument();
  });

  /**
   * An absence gets no stage at all.
   *
   * A pager at one page renders nothing, and that is the rule being shown
   * rather than a failure. An empty inset among full ones reads as a component
   * that broke, so the specimen drops the stage and lets its caption say it.
   * Pinned because "the box is gone" is invisible to a passing review and the
   * obvious edit is to give every specimen the same frame back.
   */
  it('gives the empty variant no stage to look broken in', () => {
    render(<DesignPage />);

    const specimen = screen.getByRole('group', { name: 'Single page' });
    // The caption is all there is: the heading, the note, and nothing under it.
    expect(within(specimen).getByRole('heading', { name: 'Single page' })).toBeInTheDocument();
    expect(specimen.querySelector('.bg-background')).toBeNull();
  });

  /**
   * The merged variant has two halves and the trailing one is the half that is
   * never seen by accident: every long list opens on page 1, so `[1 2 3 4] [23]`
   * is the ordinary sight, while `[1] [20 21 22 23]` only happens at the end.
   * A specimen that opened on page 1 would be demonstrating the shape the
   * reader already knows.
   */
  it('shows the trailing merge, which is the half nobody reaches by accident', () => {
    render(<DesignPage />);

    const specimen = screen.getByRole('group', { name: 'Merged at the ends' });
    const pager = within(specimen).getByRole('navigation');

    // The last four in one run, and the leading anchor alone.
    for (const n of [20, 21, 22, 23]) {
      expect(within(pager).getByRole('button', { name: `Page ${n} of specimen` })).toBeInTheDocument();
    }
    expect(within(pager).getByRole('button', { name: 'Page 1 of specimen' })).toBeInTheDocument();
    expect(within(pager).queryByRole('button', { name: 'Page 2 of specimen' })).not.toBeInTheDocument();
  });

  /** Up to six pages the arrows and the box are absent, not disabled. */
  it('gives a short list no arrows and no box', () => {
    render(<DesignPage />);

    const specimen = screen.getByRole('group', { name: 'Short list' });
    const pager = within(specimen).getByRole('navigation');

    expect(within(pager).queryByRole('button', { name: /Next page/ })).not.toBeInTheDocument();
    expect(within(pager).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(pager).getByRole('button', { name: /^Page 6\b/ })).toBeInTheDocument();
  });
});

/**
 * The drawer specimen: one frame, live.
 *
 * There is one drawer in this app, so there is one specimen, and what is
 * tested is that it is the real thing being driven rather than a picture of
 * one. The toolbar pages without closing, the expand resizes the panel, and
 * the footer changes shape with the switch above it.
 */
describe('the drawer specimen', () => {
  beforeEach(() => {
    search = new URLSearchParams('section=patterns&item=drawer');
  });


  const openDrawer = async (u: ReturnType<typeof userEvent.setup>) => {
    await u.click(screen.getByRole('button', { name: 'Open the drawer' }));
    return screen.findByRole('dialog');
  };

  it('opens the real drawer, with the whole toolbar on it', async () => {
    const u = userEvent.setup();
    render(<DesignPage />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const drawer = await openDrawer(u);

    // Leaving, the panel, which record, and the record's own actions.
    expect(within(drawer).getByRole('button', { name: /Back/ })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: /Expand/ })).toBeInTheDocument();
    expect(within(drawer).getByText('3 of 5')).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: /Download/ })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: /Archive/ })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: /Delete/ })).toBeInTheDocument();
  });

  /**
   * The pager walks the list without closing the panel, which is the behaviour
   * it exists for and the one a screenshot cannot show.
   */
  it('pages through records with the drawer still open', async () => {
    const u = userEvent.setup();
    render(<DesignPage />);
    const drawer = await openDrawer(u);

    await u.click(within(drawer).getByRole('button', { name: 'Next' }));

    expect(within(drawer).getByText('4 of 5')).toBeInTheDocument();
    // The title follows the record, and the panel is still open.
    expect(within(drawer).getByLabelText('Title')).toHaveValue('Scope and Additional Work');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  /** One control, not two: whichever icon is not the state is the action. */
  it('expands and collapses on the one control', async () => {
    const u = userEvent.setup();
    render(<DesignPage />);
    const drawer = await openDrawer(u);

    await u.click(within(drawer).getByRole('button', { name: /Expand/ }));
    expect(
      within(drawer).getByRole('button', { name: 'Collapse to the side panel' }),
    ).toBeInTheDocument();
  });

  /**
   * A toolbar carries its own back control, so the sheet's X is off. Two
   * controls doing one job in one corner is what the row exists to end.
   */
  it('drops the sheet’s own close button, because the toolbar has one', async () => {
    const u = userEvent.setup();
    render(<DesignPage />);
    const drawer = await openDrawer(u);

    expect(within(drawer).queryByRole('button', { name: /^close$/i })).not.toBeInTheDocument();
  });

  it('enables Save only once something has changed', async () => {
    const u = userEvent.setup();
    render(<DesignPage />);
    const drawer = await openDrawer(u);

    expect(within(drawer).getByRole('button', { name: 'Save' })).toBeDisabled();
    await u.type(within(drawer).getByLabelText('Title'), '!');
    expect(within(drawer).getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  /**
   * The same frame, the other footer. A row of controls takes an edge and its
   * own padding; a status line takes neither, so it gives back its height when
   * it has nothing to say.
   */
  it('swaps the footer on the same frame rather than opening a second drawer', async () => {
    const u = userEvent.setup();
    render(<DesignPage />);

    await u.click(screen.getByLabelText('Saved as you type'));
    const drawer = await openDrawer(u);

    expect(within(drawer).queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    await u.type(within(drawer).getByLabelText('Title'), '!');
    expect(within(drawer).getByRole('status')).toHaveTextContent('Unsaved changes');
  });
});
