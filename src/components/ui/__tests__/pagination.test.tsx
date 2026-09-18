import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { PAGE_SIZE, Pagination, usePagedRows } from '@/components/ui/pagination';
import { SIMPLE_MAX } from '@/components/ui/pageGroups';

/** A minimal host so the hook and the control can be exercised together. */
function Paged({ rows }: { rows: string[] }) {
  const { page, pageCount, visible, setPage } = usePagedRows(rows);
  return (
    <div>
      <ul>
        {visible.map((row) => (
          <li key={row}>{row}</li>
        ))}
      </ul>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} label="rows" />
    </div>
  );
}

const rows = (n: number) => Array.from({ length: n }, (_, i) => `Row ${i + 1}`);

/** Rows enough for `n` pages exactly. */
const pages = (n: number) => rows(n * PAGE_SIZE);

/** A page's own button in the tab group. */
const pageButton = (n: number) => screen.getByRole('button', { name: `Page ${n} of rows` });

describe('usePagedRows', () => {
  it(`shows at most ${PAGE_SIZE} rows at a time`, () => {
    render(<Paged rows={rows(24)} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(PAGE_SIZE);
    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.queryByText('Row 11')).not.toBeInTheDocument();
  });

  it('walks forward and back through the pages', async () => {
    const user = userEvent.setup();
    render(<Paged rows={rows(24)} />);

    await user.click(pageButton(2));
    expect(screen.getByText('Row 11')).toBeInTheDocument();
    expect(screen.queryByText('Row 1')).not.toBeInTheDocument();

    // 24 rows over 10 per page leaves a short final page.
    await user.click(pageButton(3));
    expect(screen.getAllByRole('listitem')).toHaveLength(4);

    await user.click(pageButton(2));
    expect(screen.getByText('Row 11')).toBeInTheDocument();
  });

  /**
   * Deleting or filtering can shrink the list under the page being viewed. The
   * page is clamped during render, so that shows the last real page rather than
   * an empty table for a page that no longer exists.
   */
  it('clamps to the last page when the list shrinks beneath it', async () => {
    const user = userEvent.setup();

    function Shrinking() {
      const [all, setAll] = useState(rows(24));
      return (
        <div>
          <button type="button" onClick={() => setAll(rows(3))}>
            Shrink
          </button>
          <Paged rows={all} />
        </div>
      );
    }

    render(<Shrinking />);
    await user.click(pageButton(2));
    await user.click(screen.getByRole('button', { name: 'Shrink' }));

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Row 1')).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  /** A pager whose every control is disabled is noise under a short table. */
  it('renders nothing when everything fits on one page', () => {
    render(<Paged rows={rows(PAGE_SIZE)} />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  /**
   * The numbers are the control, where a "Page 3 / 9" label was a readout: every
   * page but the two either side of you used to take a click each to reach.
   */
  it('offers every page as its own button on a short list', () => {
    render(<Paged rows={pages(4)} />);

    for (const n of [1, 2, 3, 4]) expect(pageButton(n)).toBeInTheDocument();
  });

  it('marks the page being viewed', async () => {
    const user = userEvent.setup();
    render(<Paged rows={pages(4)} />);

    expect(pageButton(1)).toHaveAttribute('aria-current', 'page');

    await user.click(pageButton(3));
    expect(pageButton(3)).toHaveAttribute('aria-current', 'page');
    expect(pageButton(1)).not.toHaveAttribute('aria-current');
  });

  /**
   * Under the threshold every page is one click away, so an arrow would be a
   * control with nothing to do and the box a way to type what is already on
   * screen.
   */
  it('shows no arrows and no box while every page is listed', () => {
    render(<Paged rows={pages(SIMPLE_MAX)} />);

    expect(screen.queryByRole('button', { name: /Previous page/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Next page/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('brings them in as soon as a page is left out', () => {
    render(<Paged rows={pages(SIMPLE_MAX + 1)} />);

    expect(screen.getByRole('button', { name: /Previous page/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next page/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Go to page/ })).toBeInTheDocument();
  });

  it('disables the arrow at each end of the range', async () => {
    const user = userEvent.setup();
    render(<Paged rows={pages(9)} />);

    expect(screen.getByRole('button', { name: 'Previous page of rows' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page of rows' })).toBeEnabled();

    await user.click(pageButton(9));
    expect(screen.getByRole('button', { name: 'Next page of rows' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous page of rows' })).toBeEnabled();
  });

  /**
   * The ends stay one click away however long the list, which is what the two
   * anchor runs are for.
   */
  it('keeps the first and last page reachable from the middle', async () => {
    const user = userEvent.setup();
    render(<Paged rows={pages(23)} />);

    await user.click(screen.getByRole('textbox', { name: /Go to page/ }));
    await user.keyboard('{Control>}a{/Control}12{Enter}');

    expect(pageButton(1)).toBeInTheDocument();
    expect(pageButton(23)).toBeInTheDocument();
  });

  /**
   * The arrow always means "next page". Inside a window it moves the pill;
   * stepping off the last slot starts the next four, so the numbers turn a page
   * at a time rather than crawling one column per click.
   */
  it('turns the window a batch at a time as the arrow crosses its edge', async () => {
    const user = userEvent.setup();
    render(<Paged rows={pages(23)} />);

    const next = screen.getByRole('button', { name: 'Next page of rows' });
    // Pages 1 to 4 are one window.
    for (const n of [2, 3, 4]) {
      await user.click(next);
      expect(pageButton(n)).toHaveAttribute('aria-current', 'page');
      expect(screen.queryByRole('button', { name: 'Page 5 of rows' })).not.toBeInTheDocument();
    }

    // The fifth click steps off the end of it and starts the next four.
    await user.click(next);
    expect(pageButton(5)).toHaveAttribute('aria-current', 'page');
    for (const n of [6, 7, 8]) expect(pageButton(n)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Page 4 of rows' })).not.toBeInTheDocument();
  });

  /**
   * No page is drawn twice when the window reaches an end: the anchor and the
   * window merge into one run rather than printing `1 … 1 2 3 4`.
   */
  it('never lists a page twice at either end', async () => {
    const user = userEvent.setup();
    render(<Paged rows={pages(23)} />);

    for (const n of [1, 23]) {
      expect(screen.getAllByRole('button', { name: `Page ${n} of rows` })).toHaveLength(1);
    }

    await user.click(pageButton(23));
    for (const n of [1, 23]) {
      expect(screen.getAllByRole('button', { name: `Page ${n} of rows` })).toHaveLength(1);
    }
  });
});

/**
 * The go-to box, which every pager in the app carries (`docs/design.md` §2.10).
 * The document preview had one and the tables did not, so the same control
 * answered "take me to page 9" in one place and made you click eight times in
 * the other.
 *
 * Its behaviour is `DocumentPager`'s, which is now this component: the value is
 * local until committed, because typing "1" on the way to "12" must not take
 * the reader to page 1 and then to page 12.
 */
describe('the go-to-page box', () => {
  const box = () => screen.getByRole('textbox', { name: 'Go to page of rows' });

  it('shows the current page', async () => {
    const user = userEvent.setup();
    render(<Paged rows={pages(9)} />);

    expect(box()).toHaveValue('1');
    await user.click(screen.getByRole('button', { name: 'Next page of rows' }));
    expect(box()).toHaveValue('2');
  });

  it('goes to the typed page on Enter, and not before', async () => {
    const user = userEvent.setup();
    render(<Paged rows={pages(9)} />);

    await user.clear(box());
    await user.type(box(), '3');
    expect(screen.getByText('Row 1')).toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(screen.getByText('Row 21')).toBeInTheDocument();
  });

  it('takes digits only', async () => {
    const user = userEvent.setup();
    render(<Paged rows={pages(9)} />);

    await user.clear(box());
    await user.type(box(), '1a2');
    expect(box()).toHaveValue('12');
  });

  /**
   * A page that does not exist is not a page. The box goes back to saying where
   * the reader is rather than moving them somewhere arbitrary, which is also
   * what an emptied box does.
   */
  it('refuses a page past the end and returns to the current one', async () => {
    const user = userEvent.setup();
    render(<Paged rows={pages(9)} />);

    await user.clear(box());
    await user.type(box(), '99{Enter}');

    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(box()).toHaveValue('1');
  });

  it('refuses an empty box', async () => {
    const user = userEvent.setup();
    render(<Paged rows={pages(9)} />);

    await user.click(screen.getByRole('button', { name: 'Next page of rows' }));
    await user.clear(box());
    await user.keyboard('{Enter}');

    expect(screen.getByText('Row 11')).toBeInTheDocument();
    expect(box()).toHaveValue('2');
  });

  /**
   * It is filled one shade off whatever it sits on, rather than transparent
   * until hovered.
   *
   * A field that takes input should say so before it is touched; transparent
   * made the one control here you can *type* into look like the counter printed
   * beside it.
   *
   * **The rule is the step, not the token** (`docs/design.md` §1.1), and the
   * token has now moved twice under that one rule while the step never changed.
   * It sat on the `--sidebar` band and was `--sidebar-field`; it moved inside
   * the pager's filled container and became `--hover`, one step darker than
   * that; and when the container lost its fill (18 September 2026) the box
   * landed on the card, where `--hover` was suddenly a two-step drop and
   * `--sidebar-field` is the one step again.
   */
  it('fills the box one shade off its surroundings', () => {
    render(<Paged rows={pages(9)} />);

    expect(box()).toHaveClass('bg-sidebar-field');
    expect(box()).not.toHaveClass('bg-transparent');
  });
});

/**
 * The chrome: one container, one filled thing inside it.
 *
 * These are classes rather than colours, and that is the honest limit of a
 * jsdom test — it resolves no stylesheet, so `bg-card` here is a string and not
 * a measurement. What these pin is the *arrangement*, which is the part that
 * regresses when somebody adds a border back to make something "clearer": the
 * count of filled surfaces, and which element carries the fill. The colours are
 * measured in `e2e/shell-sheets.spec.ts` and `e2e/component-library.spec.ts`.
 */
describe('the pager as one control', () => {
  const group = () => screen.getByRole('navigation').querySelector('[data-slot="page-runs"]')!;

  /**
   * Everything is in one box: both arrows, both anchors and the window.
   *
   * It was three troughs with the arrows loose outside them, which drew five
   * separate objects to say one thing. One container makes the pager a control
   * rather than a row of controls, and it is the background doing the grouping
   * that the gaps between runs were doing before.
   */
  it('puts the arrows and every number in one container', () => {
    render(<Paged rows={pages(23)} />);

    const container = group();
    for (const name of ['Previous page of rows', 'Next page of rows', 'Page 1 of rows']) {
      expect(container).toContainElement(screen.getByRole('button', { name }));
    }
  });

  /**
   * The box is in the container too, and sits *darker* than it.
   *
   * It was outside on the reasoning that a field you type into is a different
   * kind of thing from a page you can be on. That is true of the control and
   * false of the layout: it is part of the pager, it moves with it, and a box
   * floating beside the container reads as a second widget that happens to be
   * adjacent.
   *
   * Every other filled thing here is *lighter* than the container (the active
   * page, a hovered one), which is what "raised" means under a light source.
   * The box is the one thing you type into rather than press, so it goes the
   * other way: a well rather than a pill. `--hover` is the token for exactly
   * that step and it inverts with the theme on its own (slate-200 in light,
   * slate-950 in dark), which a literal "darker" cannot do near the ramp's
   * floor.
   */
  /**
   * The box sits one step below the page, and that step got shallower.
   *
   * It was `--hover` (slate-200) when it was a well inside a slate-100
   * container, which is one ramp step. With the container unfilled the box
   * lands on the card instead (slate-50), so the same token became a *two*
   * step drop and read as a hard dark chip on a light surface. `--sidebar-field`
   * is slate-100, which restores the one-step well the design asked for
   * (18 September 2026).
   *
   * That token is free precisely because the container stopped using it, so
   * this is a re-point rather than a new role. `--hover` was deliberately not
   * edited: `DocumentsCards` uses it for a hovered card, and moving a shared
   * role to fix one caller is how a token stops meaning anything.
   */
  it('puts the go-to box in the container, one step darker than the page', () => {
    render(<Paged rows={pages(23)} />);

    const box = screen.getByRole('textbox', { name: 'Go to page of rows' });
    expect(group()).toContainElement(box);
    expect(box).toHaveClass('bg-sidebar-field');
    expect(box).not.toHaveClass('bg-hover');
  });

  /**
   * The container is unfilled, and the border is what groups it.
   *
   * It carried `bg-sidebar-field`, which was slate-100 in light and slate-900
   * in dark — and `--background` is *also* slate-900 in dark, so the fill was
   * only ever visible in one theme. One surface that appears in light and
   * vanishes in dark is not a decision the ramp made, it is two different
   * pagers, and the light one was the odd one out (18 September 2026).
   *
   * The stroke already says where the control ends, which is what the
   * one-border rule below is about. Losing the fill costs nothing that the
   * border was not already doing.
   */
  it('draws no fill on the container', () => {
    render(<Paged rows={pages(23)} />);

    expect(group().className).not.toMatch(/(^|\s)bg-/);
    // The stroke stays: it is the only thing left saying where the pager ends.
    expect(group()).toHaveClass('border-border');
  });

  /**
   * One stroke, on the outside.
   *
   * A container with a border around a run with a border around a pill with a
   * border is three rectangles saying the same thing. The outer box is the one
   * that says where the control ends; everything inside it is separated by
   * fill, which is what the ramp is for.
   */
  it('draws no outline on the runs inside it', () => {
    render(<Paged rows={pages(23)} />);

    for (const run of group().querySelectorAll('[data-slot="page-run"]')) {
      expect(run).not.toHaveClass('border-border');
      expect(run.className).not.toMatch(/\bbg-/);
    }
  });

  /**
   * The active page carries its own surface, and it keeps its stroke.
   *
   * It used to be the step *above* the container, which only made sense while
   * the container had a fill to be above. With the container unfilled the pill
   * sits on the card, so light goes the other way: slate-200, a step **down**,
   * which is what a marker on a plain surface has to do to be found
   * (18 September 2026). Dark is untouched and still steps up, because there
   * the pill sits on slate-900 with nothing below it worth using.
   *
   * The token still resolves per theme rather than the component naming two
   * values, which is the rule the test below this one exists to hold.
   */
  it('raises the active page onto the step above the container', () => {
    render(<Paged rows={pages(23)} />);

    const active = screen.getByRole('button', { name: 'Page 1 of rows' });
    expect(active).toHaveClass('bg-page-active', 'border-border');
  });

  /**
   * A hovered page and the current one are never the same fill.
   *
   * The collision is real and was caught by measuring rather than by reading
   * the classes: with the pill at slate-200 it was the *same value* as
   * `--hover`, so hovering any number made it identical to the page you were
   * already on and only the border said otherwise. The fill is the part a
   * reader actually sees.
   *
   * The two are kept apart by the pill taking the **smaller** step, which is
   * this control inverting the usual order: the pill is one rung off the page
   * (slate-100) because it is a resting state carrying a border and a shadow
   * as well, and hover goes past it to slate-200. Hovering is transient and
   * reads as a press; only the pill has a stroke.
   *
   * So the assertion is not "hover is lighter" but "hover is not the pill's
   * own token". That is the invariant, and it survives either of them moving
   * a rung.
   *
   * jsdom resolves no stylesheet, so this pins the *classes*; the colours are
   * measured in `e2e/component-library.spec.ts`.
   */
  it('never hovers a page to the current page’s own fill', () => {
    render(<Paged rows={pages(23)} />);

    const inactive = screen.getByRole('button', { name: 'Page 2 of rows' });

    expect(inactive.className).toContain('hover:bg-hover');
    expect(inactive.className).not.toContain('hover:bg-page-active');
    // One value for the hover, not a per-theme pair: `--hover` inverts on its
    // own (slate-200 light, slate-950 dark), which is the whole point of it.
    expect(inactive.className).not.toMatch(/dark:hover:bg-/);
  });

  /**
   * One token, lighter than the container in **both** themes.
   *
   * It is its own token because no existing role does that on both sides, which
   * is a fact about the ramp rather than an oversight. `--card` is right in
   * light (slate-50, the step above the container) and is the container's *own*
   * value in dark, so the fill separated by 0.000 there and only the border drew
   * the active page. `--raised`, which every other active pill in the app uses,
   * is the mirror problem: it fixes dark and is a step *down* in light, where it
   * is slate-200, making the pill a well.
   *
   * This replaced a `bg-card` plus `dark:bg-raised` pair. Two tokens describing
   * one surface is a surface with no name, and the next reader has to work out
   * which half is the rule.
   *
   * The colours themselves are measured in `e2e/shell-sheets.spec.ts`: jsdom
   * resolves no stylesheet, so a class name here is a string.
   */
  it('names the active page one surface rather than a pair of overrides', () => {
    render(<Paged rows={pages(23)} />);

    const active = screen.getByRole('button', { name: 'Page 1 of rows' });
    expect(active.className).not.toMatch(/dark:bg-/);
  });

  /**
   * Only hover is darker, and only on a page that is not already current.
   *
   * An inactive page is bare until the pointer is over it: a resting fill on
   * every number would be the trough again, one box per page, and there would
   * be nothing left for the active one to be raised *from*.
   */
  it('fills an inactive page only on hover', () => {
    render(<Paged rows={pages(23)} />);

    const inactive = screen.getByRole('button', { name: 'Page 2 of rows' });
    expect(inactive.className).toMatch(/hover:bg-/);
    // Bare at rest: the only `bg-` it names is the hovered one.
    expect(inactive.className).not.toMatch(/(^|\s)bg-/);
  });

  /**
   * The pill's corners sit inside the container's rather than echoing them.
   *
   * Two boxes at the same radius read as one shape with a line through it; a
   * tighter inner corner is what says the pill is *in* the container.
   */
  it('rounds the active page tighter than its container', () => {
    render(<Paged rows={pages(23)} />);

    expect(group()).toHaveClass('rounded-lg');
    expect(screen.getByRole('button', { name: 'Page 1 of rows' })).toHaveClass('rounded-sm');
  });

  /**
   * A hairline stands where numbers are missing.
   *
   * The gap alone used to carry this, and it worked while each run had its own
   * trough: the space between two backgrounds is a boundary. With one container
   * the background groups everything *together*, so 8px between runs became
   * indistinguishable from loose tracking and `‹ 1 9 10 11 12 23 ›` read as one
   * continuous list. That is the exact lie §2.10 exists to prevent, arrived at
   * from the opposite direction.
   *
   * One separator per gap, never a trailing one, because a rule after the last
   * run would claim pages beyond the last page.
   */
  it('marks each elision with a separator', async () => {
    const user = userEvent.setup();
    render(<Paged rows={pages(23)} />);

    // Away from the ends there are three runs, so two gaps and two separators.
    // A list opens on page 1, where the leading anchor is merged into the
    // window, so it has to be walked into the middle first.
    await user.click(screen.getByRole('button', { name: 'Page 4 of rows' }));
    await user.click(screen.getByRole('button', { name: 'Next page of rows' }));

    expect(group().querySelectorAll('[data-slot="page-gap"]')).toHaveLength(2);
  });

  it('draws no separator where the runs are merged', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Paged rows={pages(23)} />);

    // Page 1 merges the leading anchor into the window: two runs, one gap.
    expect(group().querySelectorAll('[data-slot="page-gap"]')).toHaveLength(1);

    // Stepping into the middle of the list separates all three runs again.
    await user.click(screen.getByRole('button', { name: 'Page 4 of rows' }));
    await user.click(screen.getByRole('button', { name: 'Next page of rows' }));
    expect(group().querySelectorAll('[data-slot="page-gap"]')).toHaveLength(2);

    // A short list is one run and elides nothing at all.
    unmount();
    render(<Paged rows={pages(4)} />);
    expect(group().querySelectorAll('[data-slot="page-gap"]')).toHaveLength(0);
  });

  /**
   * The separator is drawn stronger than a container edge, and taller.
   *
   * `--border` is what bounds a box, and in dark it is white at 10%, which is
   * as faint as a line in this app gets. This rule is not bounding anything: it
   * *says something* ("numbers are missing here"), and it is the only thing
   * saying it since the runs lost their troughs. A mark carrying meaning cannot
   * be quieter than the frame around it.
   */
  it('draws the separator stronger than the container edge', () => {
    render(<Paged rows={pages(23)} />);

    const gap = group().querySelector('[data-slot="page-gap"]')!;
    expect(gap).not.toHaveClass('bg-border');
    expect(gap.className).toMatch(/bg-muted-foreground/);
  });

  /**
   * The separator is not announced.
   *
   * It says something about the *numbers*, which a screen reader is already
   * reading one at a time with their own labels. A rule read out between them
   * would be noise, and the live region above already states the page.
   */
  it('hides the separator from assistive tech', () => {
    render(<Paged rows={pages(23)} />);

    for (const gap of group().querySelectorAll('[data-slot="page-gap"]')) {
      expect(gap).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
