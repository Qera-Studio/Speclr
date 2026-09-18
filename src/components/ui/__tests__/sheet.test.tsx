import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import {
  InsetProvider,
  Sheet,
  SheetContent,
  SheetTitle,
} from '../sheet';

/**
 * Where a sheet opens, which is a rule about the shell rather than about any
 * one drawer (`docs/design.md` §2.11).
 *
 * A sheet is `fixed`, so wherever it is rendered it resolves against the
 * viewport and covers the whole window: the nav, the header band and the margin
 * the inset card floats in. `Notifications` was given `container`/`contained`
 * to stop that, and got them as props from `AdminShell`. The clause library's
 * drawer, four levels away from the shell and reached through a page rather
 * than through a prop chain, had no way to be handed them and spilled over the
 * inset.
 *
 * So the answer is a context rather than a prop: the shell publishes its card
 * once, and every sheet under it is contained without being told. A prop chain
 * from the shell down to every page that might open a drawer is the shape this
 * rule exists to stop.
 */
function openSheet() {
  return screen.getByRole('dialog');
}

describe('SheetContent', () => {
  /**
   * The fallback, which is what a component rendered on its own in a test gets,
   * and what `PageHeaderSlot` degrades to for the same reason: every production
   * route renders inside `AdminShell`, but a sheet outside one must still open.
   */
  it('covers the window when there is no inset to open inside', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Loose</SheetTitle>
        </SheetContent>
      </Sheet>,
    );

    expect(openSheet()).toHaveClass('fixed');
    expect(openSheet()).not.toHaveClass('absolute');
  });

  /**
   * The rule. No prop is passed here: the provider is the only difference
   * between this case and the one above.
   */
  it('opens inside the inset card when the shell publishes one', () => {
    function Shell() {
      const inset = useRef<HTMLDivElement>(null);
      return (
        <div ref={inset} data-testid="inset" className="relative">
          <InsetProvider inset={inset}>
            <Sheet open>
              <SheetContent>
                <SheetTitle>Contained</SheetTitle>
              </SheetContent>
            </Sheet>
          </InsetProvider>
        </div>
      );
    }

    render(<Shell />);

    const panel = openSheet();
    expect(panel).toHaveClass('absolute');
    // Positioned against the card, and rendered inside it, or the scrim would
    // darken a different box from the one the panel covers.
    expect(screen.getByTestId('inset')).toContainElement(panel);
  });

  /**
   * The backdrop follows the panel. It is what closes the sheet on an outside
   * click and what keeps the page behind it inert, so a panel contained by the
   * card with a scrim still over the window would dim the nav to report
   * something happening inside the card.
   */
  it('contains the backdrop with it', () => {
    function Shell() {
      const inset = useRef<HTMLDivElement>(null);
      return (
        <div ref={inset} className="relative">
          <InsetProvider inset={inset}>
            <Sheet open>
              <SheetContent>
                <SheetTitle>Contained</SheetTitle>
              </SheetContent>
            </Sheet>
          </InsetProvider>
        </div>
      );
    }

    const { container } = render(<Shell />);

    const backdrop = container.querySelector('[data-slot="sheet-overlay"]')!;
    expect(backdrop).toHaveClass('absolute');
  });
});

/**
 * How wide a drawer is (`docs/design.md` §2.11).
 *
 * There were three drawers and three unrelated answers: the notifications feed
 * took the base `sm:max-w-sm`, the clause drawer overrode it to `sm:max-w-xl`,
 * the mobile nav set a CSS variable. A width was a number typed at a call site
 * rather than a decision about drawers, so `design-system.test.ts` now fails
 * the build for one and these are the three it may take instead.
 *
 * jsdom resolves no stylesheet, so a class name is not a width here. What these
 * pin is which class is asked for; that the class *measures* 60% of the card is
 * `e2e/shell-sheets.spec.ts`, in a browser that can do layout.
 */
describe('a sheet’s width', () => {
  const widthOf = (size?: 'sm' | 'md' | 'lg') => {
    const { unmount } = render(
      <Sheet open>
        <SheetContent {...(size ? { size } : {})}>
          <SheetTitle>Sized</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    const className = screen.getByRole('dialog').className;
    unmount();
    return className;
  };

  it('is the feed’s share of the card by default', () => {
    expect(widthOf()).toContain('w-[30%]');
  });

  it.each([
    ['sm', 'w-[30%]', 'min-w-sm'],
    ['md', 'w-[48%]', 'min-w-md'],
    ['lg', 'w-[90%]', 'min-w-2xl'],
  ] as const)('takes %s from the size, with its floor', (size, width, floor) => {
    const className = widthOf(size);
    expect(className).toContain(width);
    expect(className).toContain(floor);
  });

  /**
   * The old ceiling had to go with the new width, or every size would have
   * resolved to 24rem: a `max-width` beats a `width`, so leaving
   * `sm:max-w-sm` on the base string would have made the whole prop inert
   * while still reading as though it worked.
   */
  it('keeps no ceiling of its own to override the size', () => {
    expect(widthOf('lg')).not.toContain('max-w-sm');
  });

  /**
   * The floors are measured against the real card, not named after their size.
   *
   * `md` was `min-w-2xl` (672px) first, which reads as the obvious pairing and
   * is wrong: the inset card is 1028px at a 1280 viewport, so the share fell
   * under the floor and the floor silently governed the entire laptop range. A
   * floor above the percentage at ordinary widths is not a floor, it is the
   * width.
   *
   * **The same mistake was nearly made again** when `md` came down from 60% to
   * 48% on 17 September 2026: `min-w-lg` (512px) is the obvious pairing one
   * rung down and sits *above* the 493px that 48% yields on that card. This
   * test is what caught it, which is the argument for pinning a floor by
   * measurement rather than by name.
   *
   * Pinned because the failure is invisible: the drawer still opens, still
   * looks deliberate, and is simply not the size the rule says.
   */
  it('keeps the middle floor under what its share yields on a laptop', () => {
    // 48% of the narrowest real card (1028px at a 1280 viewport) is 493px.
    // The floor must sit below that: `md` (448px) does, `lg` (512px) does not.
    expect(widthOf('md')).toContain('min-w-md');
    expect(widthOf('md')).not.toContain('min-w-lg');
  });

  /**
   * A top or bottom sheet spans the card and is sized by its content. Handing
   * it a share of the width would make a panel that is neither full width nor
   * centred.
   */
  it('gives a top sheet no width at all', () => {
    render(
      <Sheet open>
        <SheetContent side="top" size="lg">
          <SheetTitle>Banner</SheetTitle>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.getByRole('dialog').className).not.toContain('w-[90%]');
  });
});

/**
 * A drawer that floats inside the card rather than filling its edge
 * (`docs/design.md` §2.11).
 *
 * The default drawer is flush: full height, hard against the card's right
 * edge, its own corners square where they meet it. `float` insets it on all
 * four sides so it reads as an object resting on the page rather than a
 * region of it, which is what a panel that does not dim the page behind it
 * has to do to have an edge at all.
 *
 * jsdom resolves no stylesheet, so these pin which classes are asked for.
 * Whether the gaps actually measure is `e2e/clause-library.spec.ts`.
 */
describe('a floating sheet', () => {
  const classesOf = (props: Parameters<typeof SheetContent>[0] = {}) => {
    const { unmount } = render(
      <Sheet open>
        <SheetContent {...props}>
          <SheetTitle>Floating</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    const className = screen.getByRole('dialog').className;
    unmount();
    return className;
  };

  /**
   * Flush is still the default, and that is deliberate rather than inertia:
   * the notification feed is chrome over the app and belongs against the edge
   * it drops from. Floating is what a panel takes when it is an object.
   */
  it('stays flush against the card unless asked to float', () => {
    const className = classesOf();
    expect(className).toContain('inset-y-0');
    expect(className).not.toContain('rounded-sm');
  });

  /**
   * The gap, on all four sides, and the corner that goes with it.
   *
   * `rounded-sm` rather than the card's own `rounded-md`: §1.3 says a nested
   * corner is one step smaller than its parent and never equal. Two boxes at
   * one radius read as a single shape.
   */
  it('insets itself from every edge and rounds its corners', () => {
    const className = classesOf({ float: true });
    expect(className).toContain('rounded-sm');
    // Off the top and bottom edges, which is what `inset-y-0` would deny.
    expect(className).not.toContain('inset-y-0');
    expect(className).toContain('top-2');
    expect(className).toContain('bottom-2');
    expect(className).toContain('right-2');
  });

  /**
   * Expanded, it leaves the right edge too and sits centred.
   *
   * This is the difference between "a wider drawer" and the floating panel
   * that was asked for: a drawer that grows leftward is still a drawer, and
   * one that detaches from the edge on both sides is a window.
   */
  it('centres itself when it floats at the large size', () => {
    const className = classesOf({ float: true, size: 'lg' });
    expect(className).toContain('left-1/2');
    expect(className).toContain('-translate-x-1/2');
    expect(className).not.toContain('right-2');
  });

  /**
   * It keeps its height off the card's edges too, which the flush drawer
   * cannot do: `h-full` against `inset-y-0` is the card's whole height.
   */
  it('takes a height short of the card when it floats', () => {
    expect(classesOf({ float: true, size: 'lg' })).toContain('h-[90%]');
    expect(classesOf({ float: true })).not.toContain('h-full');
  });
});
