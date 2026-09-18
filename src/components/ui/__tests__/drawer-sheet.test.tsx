import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrawerSheet } from '../drawer-sheet';
import { DrawerToolbar } from '../drawer-toolbar';

/**
 * The frame, tested for the things that had drifted between the three
 * hand-rolled copies rather than for "it renders". Each case below is one of
 * those disagreements, which is why the component exists.
 */
describe('DrawerSheet', () => {
  const open = (ui: React.ReactNode) => render(<>{ui}</>);

  it('lays out the header, the scrolling body and the footer', () => {
    open(
      <DrawerSheet open onOpenChange={() => {}} title="Clause 3" footer={<button>Save</button>}>
        <p>Body text</p>
      </DrawerSheet>,
    );

    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByText('Clause 3')).toBeInTheDocument();
    expect(within(drawer).getByText('Body text')).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  /**
   * The body is the only part that scrolls. Without `min-h-0` a flex item is
   * floored at its content height and a long drawer pushes the footer off the
   * bottom instead — a bug fixed twice in this codebase before this component
   * existed, which is exactly why it is asserted here once.
   */
  it('scrolls the body and nothing else', () => {
    open(
      <DrawerSheet open onOpenChange={() => {}} title="T" footer={<button>Save</button>}>
        <p>Body</p>
      </DrawerSheet>,
    );

    const body = screen.getByText('Body').parentElement;
    expect(body).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
  });

  /**
   * `pr-14` clears the close button the sheet floats at `top-4 right-4`. Two
   * of the three old copies remembered it and one did not, so the title ran
   * under the X. It is *conditional*, because applied with no close button it
   * leaves a 56px hole at the end of the row.
   */
  it('clears the close button only when one is drawn', () => {
    const { rerender } = render(
      <DrawerSheet open onOpenChange={() => {}} title="Titled">
        <p>Body</p>
      </DrawerSheet>,
    );
    expect(screen.getByText('Titled').parentElement).toHaveClass('pr-14');

    rerender(
      <DrawerSheet
        open
        onOpenChange={() => {}}
        title="Titled"
        toolbar={<DrawerToolbar onBack={() => {}} />}
      >
        <p>Body</p>
      </DrawerSheet>,
    );
    expect(screen.getByText('Titled').parentElement).not.toHaveClass('pr-14');
  });

  /**
   * A toolbar carries its own back control, so the sheet's X is turned off:
   * two controls doing one job in one corner is what the row exists to end,
   * and left on it overlapped the last action.
   */
  it('drops its own close button when a toolbar supplies one', async () => {
    const onOpenChange = jest.fn();
    const u = userEvent.setup();
    open(
      <DrawerSheet
        open
        onOpenChange={onOpenChange}
        title="T"
        toolbar={<DrawerToolbar onBack={() => onOpenChange(false)} />}
      >
        <p>Body</p>
      </DrawerSheet>,
    );

    const drawer = screen.getByRole('dialog');
    expect(within(drawer).queryByRole('button', { name: /^close$/i })).not.toBeInTheDocument();

    await u.click(within(drawer).getByRole('button', { name: /Back/ }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * The header rule was the clearest drift: `Notifications` drew one and the
   * two editing drawers did not, with a real reason on each side. It is off by
   * default, because a header naming the field directly below it should not be
   * fenced off from it.
   */
  it('draws a rule under the header only when asked', () => {
    const { rerender } = render(
      <DrawerSheet open onOpenChange={() => {}} title="Titled">
        <p>Body</p>
      </DrawerSheet>,
    );
    expect(screen.getByText('Titled').parentElement).not.toHaveClass('border-b');

    rerender(
      <DrawerSheet open onOpenChange={() => {}} title="Titled" headerBorder>
        <p>Body</p>
      </DrawerSheet>,
    );
    expect(screen.getByText('Titled').parentElement).toHaveClass('border-b');
  });

  /**
   * A quiet footer reserves no space of its own. The padding belongs to the
   * caller's `empty:hidden` paragraph, so a padded row would keep the height
   * that paragraph gives up and read as a stray rule at the foot of the panel.
   */
  it('gives a quiet footer no rule and no padding', () => {
    open(
      <DrawerSheet
        open
        onOpenChange={() => {}}
        title="T"
        quietFooter
        footer={<p className="px-4 py-2 empty:hidden">Saved</p>}
      >
        <p>Body</p>
      </DrawerSheet>,
    );

    const row = screen.getByText('Saved').parentElement;
    expect(row).not.toHaveClass('border-t');
    expect(row?.className).not.toMatch(/\bp[xy]?-\d/);
  });
});

describe('DrawerToolbar', () => {
  /**
   * Paging is by position, never by arithmetic on an identifier: numbers are
   * never reissued, so a deleted record leaves a gap and `id + 1` pages into
   * nothing. The toolbar therefore takes *whether* the neighbours exist and
   * reports a direction, rather than computing anything itself.
   */
  it('pages by direction and stops at the ends', async () => {
    const onPage = jest.fn();
    const u = userEvent.setup();

    render(
      <DrawerToolbar
        paging={{
          onPage,
          hasPrevious: false,
          hasNext: true,
          position: 'Clause 1',
        }}
      />,
    );

    expect(screen.getByText('Clause 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await u.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPage).toHaveBeenCalledWith(1);
  });

  /** One control, not two: whichever icon is not the state is the action. */
  it('offers expand and collapse as one control', async () => {
    const onExpandedChange = jest.fn();
    const u = userEvent.setup();

    const { rerender } = render(
      <DrawerToolbar expanded={false} onExpandedChange={onExpandedChange} expandLabel="this clause" />,
    );
    await u.click(screen.getByRole('button', { name: 'Expand this clause' }));
    expect(onExpandedChange).toHaveBeenCalledWith(true);

    rerender(<DrawerToolbar expanded onExpandedChange={onExpandedChange} expandLabel="this clause" />);
    expect(screen.getByRole('button', { name: 'Collapse to the side panel' })).toBeInTheDocument();
  });

  /** Every part is optional: a drawer wanting only a back arrow gets one. */
  it('draws nothing it was not given', () => {
    render(<DrawerToolbar onBack={() => {}} />);

    expect(screen.getByRole('button', { name: /Back/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Expand/ })).not.toBeInTheDocument();
  });
});
