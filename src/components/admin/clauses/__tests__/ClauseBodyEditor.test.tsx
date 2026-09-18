import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClauseBodyEditor, { ClauseBodyActions, useClauseBody } from '../ClauseBodyEditor';
import type { ClausePart } from '@/lib/domain/contract/clauseBody';

/**
 * The rows a clause body is edited in.
 *
 * Its own file as of 17 September 2026, when the rows gained a drag handle and
 * lost their fixed height. What was tested through `ClauseLibrary` before is
 * the *result* of a move; what is here is the control that performs it, which
 * is now two interactions rather than one button.
 *
 * jsdom does no layout, so every height question here is about which classes
 * are asked for. That a row actually measures 36px empty and grows with its
 * content is `e2e/clause-library.spec.ts`.
 */
const PARTS: ClausePart[] = [
  { kind: 'point', text: 'Qera shall:' },
  { kind: 'item', text: 'perform the Services;' },
  { kind: 'point', text: 'The Client shall pay.' },
];

function renderEditor(onChange = jest.fn()) {
  render(
    <ClauseBodyEditor
      parts={PARTS}
      clauseNumber={3}
      onChange={onChange}
      onFocusedChange={jest.fn()}
      caret={undefined}
      onCaretPlaced={jest.fn()}
    />,
  );
  return onChange;
}

describe('a clause body row', () => {
  /**
   * The field grows with what is typed and is never resized by hand.
   *
   * `resize-y` put a drag corner in the bottom-right of every row, which is
   * both visual noise at this density and a second answer to how tall a row
   * is: one the content decides and one somebody dragged. `field-sizing-content`
   * on the primitive is the first answer, so the override had to go rather
   * than be joined by a `rows` count.
   */
  it('grows with its content instead of offering a resize corner', () => {
    renderEditor();
    const field = screen.getByLabelText('Numbered point 3.1');

    expect(field.className).not.toContain('resize-y');
    // From the primitive, which is what makes the growth automatic.
    expect(field.className).toContain('field-sizing-content');
  });

  /**
   * An empty row is one line tall, matching every other control in the drawer
   * (§2.1's 36px rung), rather than the two-line box it was.
   *
   * `rows` is the attribute that would fight this: a textarea's `rows` is a
   * *height*, so `rows={2}` floors it at two lines whatever `field-sizing`
   * says, which is how the old row came to be 64px with nothing in it.
   */
  it('starts one line tall, with no rows attribute holding it open', () => {
    renderEditor();
    const field = screen.getByLabelText('Numbered point 3.1');

    expect(field).not.toHaveAttribute('rows');
    expect(field.className).toContain('min-h-9');
    expect(field.className).not.toContain('min-h-16');
  });
});

/**
 * Where an added paragraph lands, which is a question about *focus* and
 * therefore cannot be answered by either component alone: the buttons are a
 * sibling of the rows, so the focused row is state above both.
 *
 * This harness is the pair as the drawer wires them. The placement rules
 * themselves are `insertPart`'s, tested in `domain/contract/__tests__`; what is
 * here is that focusing a field is what tells the buttons where to insert, and
 * that a blur does not throw the answer away.
 */
function Both({ parts: initial = PARTS }: { parts?: ClausePart[] } = {}) {
  const body = useClauseBody(() => initial);

  return (
    <>
      <ClauseBodyEditor clauseNumber={3} {...body.editor} />
      <ClauseBodyActions {...body.actions} />
    </>
  );
}

describe('adding a paragraph from the focused row', () => {
  it('appends when no row has been focused', async () => {
    const u = userEvent.setup();
    render(<Both />);

    await u.click(screen.getByRole('button', { name: 'Point' }));

    // 3.1, 3.2 and the new empty 3.3 at the foot.
    expect(screen.getByLabelText('Numbered point 3.3')).toHaveValue('');
  });

  /**
   * The report: focus 7.1, add a point, get 7.2. Here 3.1 carries a sub-item,
   * so the new point has to clear that too or it would adopt it.
   */
  it('puts a new point below the focused point and its sub-items', async () => {
    const u = userEvent.setup();
    render(<Both />);

    await u.click(screen.getByLabelText('Numbered point 3.1'));
    await u.click(screen.getByRole('button', { name: 'Point' }));

    expect(screen.getByLabelText('Numbered point 3.2')).toHaveValue('');
    // The row that was 3.2 is now 3.3, and the sub-item stayed with 3.1.
    expect(screen.getByLabelText('Numbered point 3.3')).toHaveValue('The Client shall pay.');
    expect(screen.getByLabelText('Sub-item (a)')).toHaveValue('perform the Services;');
  });

  /**
   * Removing the focused row leaves the index naming whatever moved up into
   * its place, which is a row the reader never pointed at. So the row is
   * forgotten and the next paragraph appends, which is the honest answer:
   * nothing is focused.
   */
  it('forgets the row when it is removed', async () => {
    const u = userEvent.setup();
    render(<Both />);

    await u.click(screen.getByLabelText('Numbered point 3.1'));
    await u.click(screen.getByRole('button', { name: 'Remove Numbered point 3.1' }));
    await u.click(screen.getByRole('button', { name: 'Point' }));

    // 'The Client shall pay.' is 3.1 now, and the new point appended below it.
    expect(screen.getByLabelText('Numbered point 3.1')).toHaveValue('The Client shall pay.');
    expect(screen.getByLabelText('Numbered point 3.2')).toHaveValue('');
  });

  /**
   * The same stale index one interaction over. Moving a row changes what every
   * index below it names, so the remembered one is forgotten for the reason a
   * removal forgets it.
   */
  it('forgets the row when the list is reordered', async () => {
    const u = userEvent.setup();
    render(<Both />);

    await u.click(screen.getByLabelText('Numbered point 3.1'));
    screen.getByRole('button', { name: 'Reorder Numbered point 3.2' }).focus();
    await u.keyboard('{ArrowUp}');
    await u.click(screen.getByRole('button', { name: 'Point' }));

    // 'The Client shall pay.' moved to the top, so the appended point is 3.3.
    expect(screen.getByLabelText('Numbered point 3.1')).toHaveValue('The Client shall pay.');
    expect(screen.getByLabelText('Numbered point 3.3')).toHaveValue('');
  });

  /**
   * The caret follows the paragraph that was just added.
   *
   * Without it the reader adds a point from 1.1 of a long clause and sees
   * nothing happen: the row lands correctly and 400px below the fold, with the
   * caret still in the paragraph they were reading. Measured at y=1043 against
   * a list ending at 636. Focusing it also scrolls it into view, which is what
   * makes the placement legible rather than merely right.
   */
  it('puts the caret in the paragraph it just added', async () => {
    const u = userEvent.setup();
    render(<Both />);

    await u.click(screen.getByLabelText('Numbered point 3.1'));
    await u.click(screen.getByRole('button', { name: 'Point' }));

    expect(screen.getByLabelText('Numbered point 3.2')).toHaveFocus();
  });

  /**
   * And the row it focused becomes the row it adds below, so a second click
   * builds downward rather than stacking in reverse under the first.
   */
  it('adds the next paragraph below the one it just added', async () => {
    const u = userEvent.setup();
    render(<Both />);

    await u.click(screen.getByLabelText('Numbered point 3.1'));
    await u.click(screen.getByRole('button', { name: 'Point' }));
    await u.type(screen.getByLabelText('Numbered point 3.2'), 'Second.');
    await u.click(screen.getByRole('button', { name: 'Point' }));

    expect(screen.getByLabelText('Numbered point 3.2')).toHaveValue('Second.');
    expect(screen.getByLabelText('Numbered point 3.3')).toHaveValue('');
  });

  it('adds a sub-item at the next letter of the focused point’s run', async () => {
    const u = userEvent.setup();
    render(<Both />);

    await u.click(screen.getByLabelText('Numbered point 3.1'));
    await u.click(screen.getByRole('button', { name: 'Sub-item' }));

    expect(screen.getByLabelText('Sub-item (b)')).toHaveValue('');
  });

  /**
   * Clicking the button blurs the field, so a handler that cleared the focused
   * row on blur would have forgotten it by the time the click landed. The row
   * is remembered until another one is focused.
   */
  it('remembers the row after the button takes focus away from it', async () => {
    const u = userEvent.setup();
    render(<Both />);

    await u.click(screen.getByLabelText('Numbered point 3.1'));
    await u.click(screen.getByRole('button', { name: 'Point' }));
    await u.click(screen.getByRole('button', { name: 'Point' }));

    // Both new points landed under 3.1, so the original 3.2 is now 3.4.
    expect(screen.getByLabelText('Numbered point 3.4')).toHaveValue('The Client shall pay.');
  });
});

/**
 * Reordering, which is one control now and was two.
 *
 * The grip replaces a pair of chevrons, and the thing worth pinning is that it
 * did not replace the *keyboard path* with them. A drag handle alone is
 * unusable by keyboard and by a screen reader, and this is the form for editing
 * the words of a signed agreement, so the handle is a real button that moves
 * its row on the arrow keys as well as under a pointer.
 */
describe('reordering a clause body row', () => {
  it('offers one grip per row rather than a pair of arrows', () => {
    renderEditor();

    expect(screen.queryByRole('button', { name: /Move .* up$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move .* down$/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Reorder / })).toHaveLength(3);
  });

  /**
   * The keyboard path, which is the reason the handle is a `button` and not a
   * `div` with a drag listener.
   */
  it('moves a row up on the arrow key, carrying nothing else with it', async () => {
    const u = userEvent.setup();
    const onChange = renderEditor();

    screen.getByRole('button', { name: 'Reorder Numbered point 3.2' }).focus();
    await u.keyboard('{ArrowUp}');

    // 3.2 is the third part, and a point carries its sub-items, so moving it
    // above the first point puts it at the head of the list.
    expect(onChange).toHaveBeenCalledWith([PARTS[2], PARTS[0], PARTS[1]]);
  });

  it('moves a row down on the arrow key', async () => {
    const u = userEvent.setup();
    const onChange = renderEditor();

    screen.getByRole('button', { name: 'Reorder Numbered point 3.1' }).focus();
    await u.keyboard('{ArrowDown}');

    expect(onChange).toHaveBeenCalledWith([PARTS[2], PARTS[0], PARTS[1]]);
  });

  /**
   * The ends, which the two disabled chevrons used to state by going grey.
   * One handle cannot go grey in one direction only, so the guard moves into
   * the handler: the first row's ArrowUp does nothing at all rather than
   * calling back with an unchanged list.
   */
  it('does nothing at the ends of the list', async () => {
    const u = userEvent.setup();
    const onChange = renderEditor();

    screen.getByRole('button', { name: 'Reorder Numbered point 3.1' }).focus();
    await u.keyboard('{ArrowUp}');

    expect(onChange).not.toHaveBeenCalled();
  });

  /**
   * The handle says what it is for, and it is the one control in the row whose
   * purpose a glyph alone does not carry: six dots mean "drag me" only to
   * somebody who already knows the convention.
   */
  it('names the handle after the row it moves', () => {
    renderEditor();

    expect(screen.getByRole('button', { name: 'Reorder Sub-item (a)' })).toBeInTheDocument();
  });
});
