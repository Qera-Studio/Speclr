import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClauseLibrary from '../ClauseLibrary';

const updateClause = jest.fn();
const addClause = jest.fn();
const removeClause = jest.fn();
const destroyClause = jest.fn();
const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: jest.fn() }),
}));
jest.mock('@/server/actions/clauses', () => ({
  updateClause: (...a: unknown[]) => updateClause(...a),
  addClause: (...a: unknown[]) => addClause(...a),
  removeClause: (...a: unknown[]) => removeClause(...a),
  destroyClause: (...a: unknown[]) => destroyClause(...a),
}));

const clauses = [
  { number: 1, heading: 'Definitions', body: ['1.1 In this Agreement…'], archived: false },
  { number: 2, heading: 'Structure', body: ['2.1 This Agreement establishes…'], archived: false },
];

beforeEach(() => {
  jest.clearAllMocks();
  updateClause.mockResolvedValue({ success: true });
  addClause.mockResolvedValue({ success: true });
  removeClause.mockResolvedValue({ success: true });
  destroyClause.mockResolvedValue({ success: true });
});

/**
 * Waits for the debounced autosave to write.
 *
 * The drawer lost its Save button on 17 September 2026 (`useClauseAutosave`),
 * so every test that used to click it waits for the write instead. Real timers
 * throughout, because `userEvent` drives these and advancing fake ones between
 * its awaits is its own source of flakes; `CLAUSE_AUTOSAVE_MS` is 800ms and
 * `waitFor`'s default timeout is comfortably past it.
 */
async function savedOnce(times = 1) {
  await waitFor(() => expect(updateClause).toHaveBeenCalledTimes(times), { timeout: 4000 });
}

/** Opens the drawer on a clause by clicking its row. */
async function openDrawer(u: ReturnType<typeof userEvent.setup>, heading: string) {
  await u.click(screen.getByRole('button', { name: new RegExp(`Open ${heading}`) }));
  return screen.getByRole('dialog');
}

describe('ClauseLibrary', () => {
  it('lists every clause by number and heading', () => {
    render(<ClauseLibrary clauses={clauses} stored />);

    const rows = screen.getAllByRole('row');
    expect(within(rows[1]!).getByText('1')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Definitions')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Structure')).toBeInTheDocument();
  });

  /**
   * Not decoration. The MSA was drafted to be reviewed as one package by a
   * commercial lawyer; text typed here has had no such review, and the person
   * typing it is the person who would be relying on it.
   */
  it('says out loud that edits are unreviewed and reach only the next contract', () => {
    render(<ClauseLibrary clauses={clauses} stored />);

    const warning = screen.getByText(/reviewed by a lawyer/i);
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveTextContent(/open drafts carry\s+their own copy/i);
  });

  /**
   * The row is the way in. Clicking anywhere on it opens the drawer on that
   * clause, which is the whole point of the table: the list is the index and
   * the drawer is the text.
   */
  it('opens the drawer on the clause whose row was clicked', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={clauses} stored />);

    const drawer = await openDrawer(u, 'Structure');

    expect(within(drawer).getByLabelText('Heading')).toHaveValue('Structure');
    /*
      The body is a row per paragraph now, not one textarea holding the
      clause. Each row is named by what it is and by the number it will be
      saved with, and it holds the prose *without* the marker: the marker is
      derived from the row's position, so having it in the field too would be
      the number stored in two places.
    */
    expect(within(drawer).getByLabelText('Numbered point 2.1')).toHaveValue(
      'This Agreement establishes…',
    );
  });

  /**
   * Saved explicitly, unlike every draft editor in the app. A draft belongs to
   * one document; these clauses are the source for every contract from here
   * on, so a keystroke landing in the library on its own is not a behaviour
   * worth having. With one clause open at a time, the save belongs to the
   * drawer: a drawer closed with the work apparently done and nothing written
   * is the shape of lost work.
   */
  it('offers nothing to save until the open clause changes', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={clauses} stored />);

    const drawer = await openDrawer(u, 'Definitions');
    // Nothing is written on arrival, and the status region says nothing rather
    // than claiming a save that never happened.
    expect(updateClause).not.toHaveBeenCalled();
    expect(within(drawer).getByRole('status')).toHaveTextContent('');

    await u.type(within(drawer).getByLabelText('Heading'), '!');
    expect(within(drawer).getByRole('status')).toHaveTextContent('Unsaved changes');
    await savedOnce();
    await waitFor(() =>
      expect(within(drawer).getByRole('status')).toHaveTextContent('Saved'),
    );
  });

  /**
   * And saying nothing takes up no room.
   *
   * The region is always mounted, for the reason `draftStatus.tsx` gives: a live
   * region that mounts carrying its message has nothing to announce. Mounted is
   * not the same as occupying a line, though, and an empty one under the add
   * buttons reads as a stray rule at the foot of the drawer. `empty:hidden` is
   * the house answer, already on `AutosaveStatus`.
   */
  it('takes up no room while it has nothing to say', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={clauses} stored />);

    const drawer = await openDrawer(u, 'Definitions');
    const status = within(drawer).getByRole('status');

    expect(status.className).toContain('empty:hidden');
    // The padding has to go with it, or the row it sits in keeps the height
    // the hidden paragraph gave up.
    expect(status.parentElement?.className).not.toMatch(/\bp[xy]?-\d/);
  });

  /**
   * The drawer is titled by the clause's own heading, not by its number.
   *
   * The number is identity and never changes (`CONTEXT.md` §5c), which is
   * exactly why it makes a poor title: it says nothing about which clause is
   * open, and the field holding the heading was already the answer one line
   * below. The number moved to the pager, where it is doing work.
   */
  it('titles the drawer with the clause heading rather than its number', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={clauses} stored />);

    const drawer = await openDrawer(u, 'Structure');

    expect(within(drawer).getByRole('heading')).toHaveTextContent('Structure');
    // The standing explanation went with it. It said the same thing on every
    // clause, forever, which is the standing-text rule in `docs/design.md`
    // §5e: an explanation addressed to a first-time reader and shown to
    // everybody else on every visit.
    expect(within(drawer).queryByText(/number never changes/)).not.toBeInTheDocument();
  });

  /**
   * Walking the library from inside the drawer.
   *
   * Clause bodies cite each other by number nineteen times, so reading one
   * usually means reading its neighbour. Closing the drawer, finding the row
   * and opening it again is three actions for what is one thought.
   */
  describe('the clause pager', () => {
    it('moves to the next clause without closing the drawer', async () => {
      const u = userEvent.setup();
      render(<ClauseLibrary clauses={clauses} stored />);

      const drawer = await openDrawer(u, 'Definitions');
      await u.click(within(drawer).getByRole('button', { name: 'Next clause' }));

      expect(within(screen.getByRole('dialog')).getByRole('heading')).toHaveTextContent(
        'Structure',
      );
    });

    it('moves back to the previous one', async () => {
      const u = userEvent.setup();
      render(<ClauseLibrary clauses={clauses} stored />);

      const drawer = await openDrawer(u, 'Structure');
      await u.click(within(drawer).getByRole('button', { name: 'Previous clause' }));

      expect(within(screen.getByRole('dialog')).getByRole('heading')).toHaveTextContent(
        'Definitions',
      );
    });

    /**
     * The ends stop rather than wrap. A library walked off the end and back to
     * the beginning is a list that has lost its shape, and these are numbered
     * clauses whose order is the agreement's order.
     */
    it('stops at both ends of the library', async () => {
      const u = userEvent.setup();
      render(<ClauseLibrary clauses={clauses} stored />);

      const drawer = await openDrawer(u, 'Definitions');
      expect(within(drawer).getByRole('button', { name: 'Previous clause' })).toBeDisabled();
      expect(within(drawer).getByRole('button', { name: 'Next clause' })).toBeEnabled();

      await u.click(within(drawer).getByRole('button', { name: 'Next clause' }));
      const last = screen.getByRole('dialog');
      expect(within(last).getByRole('button', { name: 'Next clause' })).toBeDisabled();
    });

    /**
     * Paging keeps the panel the size it was.
     *
     * The bug this pins: `expanded` lived in the drawer, and the drawer is
     * keyed by clause number so that a new clause arrives with its own draft
     * and its own parsed body. Paging therefore remounted it and the panel
     * collapsed to a side drawer under the reader, mid-read. The key is right
     * and stays; the state moved up to the parent, which is where it belonged,
     * because it describes the panel rather than the clause inside it.
     */
    it('stays expanded when it pages to another clause', async () => {
      const u = userEvent.setup();
      render(<ClauseLibrary clauses={clauses} stored />);

      const drawer = await openDrawer(u, 'Definitions');
      await u.click(within(drawer).getByRole('button', { name: 'Expand this clause' }));
      // Expanded, so the control offers the way back rather than the way out.
      expect(
        within(screen.getByRole('dialog')).getByRole('button', {
          name: 'Collapse to the side panel',
        }),
      ).toBeInTheDocument();

      await u.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Next clause' }),
      );

      const next = screen.getByRole('dialog');
      expect(within(next).getByRole('heading')).toHaveTextContent('Structure');
      // Still expanded. Before the fix this was 'Expand this clause' again.
      expect(
        within(next).getByRole('button', { name: 'Collapse to the side panel' }),
      ).toBeInTheDocument();
    });

    /**
     * And closing the drawer does forget it, which is the other half.
     *
     * State lifted to the parent outlives the drawer unless something clears
     * it, and a library reopened days later expanding because of one click in
     * a previous session is the failure mode of moving it up. Opening a clause
     * from the list is a fresh read and starts as a drawer.
     */
    it('opens as a drawer again after it has been closed', async () => {
      const u = userEvent.setup();
      render(<ClauseLibrary clauses={clauses} stored />);

      const drawer = await openDrawer(u, 'Definitions');
      await u.click(within(drawer).getByRole('button', { name: 'Expand this clause' }));
      await u.click(
        within(screen.getByRole('dialog')).getByRole('button', {
          name: 'Back to the clause list',
        }),
      );

      const reopened = await openDrawer(u, 'Structure');
      expect(
        within(reopened).getByRole('button', { name: 'Expand this clause' }),
      ).toBeInTheDocument();
    });

    it('shows which clause is open, by number, between the two arrows', async () => {
      const u = userEvent.setup();
      render(<ClauseLibrary clauses={clauses} stored />);

      const drawer = await openDrawer(u, 'Structure');

      expect(within(drawer).getByTestId('clause-controls')).toHaveTextContent('Clause 2');
    });

    /**
     * Paging away is leaving a clause, so whatever was typed has to be written
     * first. The debounce is 800ms and a page is one click, so without this a
     * fast reader loses the edit they just made: the timer fires against a
     * drawer that has already moved on.
     *
     * This is the same rule archive and delete follow (`runFinal` flushes), and
     * it is the one thing about the pager that could silently lose work.
     */
    it('writes a pending edit before it moves to another clause', async () => {
      const u = userEvent.setup();
      render(<ClauseLibrary clauses={clauses} stored />);

      const drawer = await openDrawer(u, 'Definitions');
      await u.type(within(drawer).getByLabelText('Heading'), '!');
      // Straight to the next clause, inside the debounce window.
      await u.click(within(drawer).getByRole('button', { name: 'Next clause' }));

      await waitFor(() => expect(updateClause).toHaveBeenCalled());
      expect(updateClause).toHaveBeenCalledWith(
        expect.objectContaining({ number: 1, heading: 'Definitions!' }),
      );
    });
  });

  it('writes only the clause the drawer is showing', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={clauses} stored />);

    const drawer = await openDrawer(u, 'Structure');
    await u.type(within(drawer).getByLabelText('Heading'), ' and Precedence');

    await waitFor(() => expect(updateClause).toHaveBeenCalledTimes(1));
    expect(updateClause).toHaveBeenCalledWith(
      expect.objectContaining({ number: 2, heading: 'Structure and Precedence' }),
    );
  });

  /**
   * The number is claimed server-side, so nothing here proposes one — two tabs
   * adding a clause at once must not be able to name the same number.
   */
  it('adds a clause without naming its number', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={clauses} stored />);

    await u.click(screen.getByRole('button', { name: /add clause/i }));

    await waitFor(() => expect(addClause).toHaveBeenCalledTimes(1));
    expect(addClause.mock.calls[0][0]).not.toHaveProperty('number');
    expect(refresh).toHaveBeenCalled();
  });

  it('surfaces a failed save rather than reporting success', async () => {
    updateClause.mockResolvedValue({ success: false, error: 'Failed to save the clause.' });
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={clauses} stored />);

    const drawer = await openDrawer(u, 'Definitions');
    await u.type(within(drawer).getByLabelText('Heading'), '!');

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to save the clause.');
  });
});

/**
 * The two removals. Archiving is on the row, because it is reversible and the
 * row is where you are; deleting is offered only inside the drawer, because it
 * is not, and an irreversible action one click from a hover target is an
 * accident waiting to be made.
 *
 * Both moved into the drawer's control row on 17 September 2026. Delete is an
 * *icon* there, which is easier to hit by accident than the labelled button it
 * replaced, so the confirmation matters more than it did rather than less.
 */
describe('removing a clause', () => {
  it('archives from the row, after asking', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={clauses} stored />);

    await u.click(screen.getByRole('button', { name: 'Archive Structure' }));
    await u.click(await screen.findByRole('button', { name: 'Archive' }));

    await waitFor(() => expect(removeClause).toHaveBeenCalledWith(2));
    expect(destroyClause).not.toHaveBeenCalled();
  });

  it('offers no delete on the row at all', () => {
    render(<ClauseLibrary clauses={clauses} stored />);

    expect(screen.queryByRole('button', { name: /^Delete Structure/ })).not.toBeInTheDocument();
  });

  it('deletes from the drawer, after asking', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={clauses} stored />);

    const drawer = await openDrawer(u, 'Structure');
    await u.click(within(drawer).getByRole('button', { name: 'Delete this clause' }));
    await u.click(await screen.findByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(destroyClause).toHaveBeenCalledWith(2));
  });

  /**
   * The number is what a clause is cited by, and deleting does not hand it
   * back. Saying so where the button is, rather than in a docblock, is the
   * only place it reaches the person about to press it.
   */
  it('says the number stays spent', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={clauses} stored />);

    const drawer = await openDrawer(u, 'Structure');
    await u.click(within(drawer).getByRole('button', { name: 'Delete this clause' }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent(/number 2 is never reused/i);
  });

  /**
   * An archived clause stays listed so it can be brought back: archiving that
   * cannot be undone from the UI is a delete wearing a softer word.
   */
  it('lists an archived clause, marked, and offers to restore it', async () => {
    const u = userEvent.setup();
    render(
      <ClauseLibrary
        clauses={[clauses[0]!, { ...clauses[1]!, archived: true }]}
        stored
      />,
    );

    const row = screen.getByRole('button', { name: /Open Structure/ }).closest('tr')!;
    /*
      Beside the heading, in the same cell, not in a column of its own. A
      Status column would be blank on every live clause, which is a heading
      promising something the column does not say, and it detaches the word
      from the clause it qualifies. It briefly was one; this pins it back.
    */
    const heading = within(row).getByText('Structure').closest('td')!;
    expect(within(heading).getByText('Archived')).toBeInTheDocument();

    await u.click(within(row).getByRole('button', { name: 'Restore Structure' }));
    await waitFor(() =>
      expect(updateClause).toHaveBeenCalledWith(expect.objectContaining({ number: 2, archived: false })),
    );
  });
});

/**
 * Bulk archive and bulk delete, which the library did not have when the table
 * was built: every table carries a checkbox column, so every table has to say
 * what a tick is for.
 *
 * Both are offered here, on instruction, and they are drawn differently on
 * purpose. Archiving is reversible and keeps the number, so it is an ordinary
 * button. Deleting retires a clause number for good, so it keeps the bar's
 * destructive slot and its own confirm.
 */
describe('acting on several clauses at once', () => {
  it('archives the ticked clauses, after confirming', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={clauses} stored />);

    await u.click(screen.getAllByRole('checkbox')[1]!);
    await u.click(screen.getByRole('button', { name: 'Archive' }));
    expect(removeClause).not.toHaveBeenCalled();

    await u.click(await screen.findByRole('button', { name: /^Archive 1 clause$/ }));

    await waitFor(() => expect(removeClause).toHaveBeenCalledWith(1));
    expect(destroyClause).not.toHaveBeenCalled();
  });

  it('deletes the ticked clauses, after confirming', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={clauses} stored />);

    await u.click(screen.getAllByRole('checkbox')[1]!);
    await u.click(screen.getByRole('button', { name: 'Delete' }));
    expect(destroyClause).not.toHaveBeenCalled();

    await u.click(await screen.findByRole('button', { name: /^Delete \d/ }));

    await waitFor(() => expect(destroyClause).toHaveBeenCalledWith(1));
  });

  /** The numbers stay spent, and the bulk dialog has to say so too. */
  it('says the numbers stay spent', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={clauses} stored />);

    await u.click(screen.getAllByRole('checkbox')[1]!);
    await u.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent(/never reused/i);
  });
});

/**
 * The body editor. Its parsing and numbering are unit-tested in
 * `domain/contract/__tests__/clauseBody.test.ts`, including the round trip
 * over all 28 real clauses; what is tested here is that the drawer is wired to
 * it, and above all that what reaches the server is the re-numbered text.
 */
describe('the clause body editor', () => {
  const structured = [
    {
      number: 3,
      heading: 'Mutual Obligations',
      body: ['3.1 Qera shall:', '(a) perform the Services;', '3.2 The Client shall pay.'],
      archived: false,
    },
  ];

  it('gives each paragraph its own field, named by kind and number', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={structured} stored />);

    const drawer = await openDrawer(u, 'Mutual');

    expect(within(drawer).getByLabelText('Numbered point 3.1')).toHaveValue('Qera shall:');
    expect(within(drawer).getByLabelText('Sub-item (a)')).toHaveValue('perform the Services;');
    expect(within(drawer).getByLabelText('Numbered point 3.2')).toHaveValue(
      'The Client shall pay.',
    );
  });

  /**
   * The point of the whole change, and the one thing worth asserting against
   * the server call rather than the DOM: moving a paragraph renumbers what
   * follows, with nobody retyping a number.
   *
   * 3.2 moves above 3.1, so it *becomes* 3.1. Under the old textarea the two
   * paragraphs would have swapped places carrying their old numbers with them,
   * and the clause would have read 3.2, 3.1.
   */
  it('renumbers on the way to the server when a point moves', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={structured} stored />);

    const drawer = await openDrawer(u, 'Mutual');
    // The grip, by keyboard, which is the path that replaced the chevrons.
    // `ClauseBodyEditor.test.tsx` owns the control; this owns the renumbering.
    within(drawer).getByRole('button', { name: 'Reorder Numbered point 3.2' }).focus();
    await u.keyboard('{ArrowUp}');

    await waitFor(() => expect(updateClause).toHaveBeenCalled());
    expect((updateClause.mock.calls[0][0] as { body: string[] }).body).toEqual([
      '3.1 The Client shall pay.',
      '3.2 Qera shall:',
      '(a) perform the Services;',
    ]);
  });

  /**
   * Opening a clause and saving it untouched must write back exactly what was
   * there. This is the drawer-level half of the round-trip test: the domain
   * one proves the functions agree, this one proves nothing in between
   * mangles it.
   */
  it('writes the body back unchanged when only the heading is edited', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={structured} stored />);

    const drawer = await openDrawer(u, 'Mutual');
    await u.type(within(drawer).getByLabelText('Heading'), '!');

    await waitFor(() => expect(updateClause).toHaveBeenCalled());
    expect((updateClause.mock.calls[0][0] as { body: string[] }).body).toEqual(structured[0].body);
  });

  /**
   * Derived numbering cannot fix a citation written into prose, because that
   * would mean editing legal text automatically. Surfacing it is the answer,
   * so the drawer has to actually show it.
   */
  it('shows what the clause refers to, and marks a reference that resolves to nothing', async () => {
    const u = userEvent.setup();
    render(
      <ClauseLibrary
        clauses={[
          {
            number: 1,
            heading: 'Definitions',
            body: ['1.1 As given at clause 2, and at clause 40.'],
            archived: false,
          },
          { number: 2, heading: 'Structure', body: ['2.1 Text.'], archived: false },
        ]}
        stored
      />,
    );

    const drawer = await openDrawer(u, 'Definitions');

    expect(within(drawer).getByText('2')).toBeInTheDocument();
    expect(within(drawer).getByText('40')).toBeInTheDocument();
    expect(within(drawer).getByText(/no such clause/i)).toBeInTheDocument();
  });
});

describe('the clause description', () => {
  const described = [
    {
      number: 1,
      heading: 'Definitions',
      summary: 'Defined terms, and how to read the agreement',
      body: ['1.1 In this Agreement…'],
      archived: false,
    },
  ];

  it('lists the description rather than the first line of the clause', () => {
    render(<ClauseLibrary clauses={described} stored />);

    expect(screen.getByText('Defined terms, and how to read the agreement')).toBeInTheDocument();
    // The body text is what the column used to show, and no longer does.
    expect(screen.queryByText(/In this Agreement/)).not.toBeInTheDocument();
  });

  it('saves a description typed in the drawer', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={described} stored />);

    const drawer = await openDrawer(u, 'Definitions');
    await u.clear(within(drawer).getByLabelText('Description'));
    await u.type(within(drawer).getByLabelText('Description'), 'What the words mean');

    await waitFor(() => expect(updateClause).toHaveBeenCalled());
    expect((updateClause.mock.calls[0][0] as { summary?: string }).summary).toBe(
      'What the words mean',
    );
  });
});

/**
 * Before `scripts/seed-contract.ts` has run, the page shows the code copy. If
 * the first save wrote only the clause that was edited, the table would end up
 * holding one row — and `listClauses()` would then answer "the Master Agreement
 * has one clause", both on this page and on every contract drafted afterwards.
 */
describe('ClauseLibrary against an unseeded table', () => {
  it('writes the whole set on the first save', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={clauses} stored={false} />);

    const drawer = await openDrawer(u, 'Definitions');
    await u.type(within(drawer).getByLabelText('Heading'), '!');

    await waitFor(() => expect(updateClause).toHaveBeenCalledTimes(clauses.length));
    expect(updateClause.mock.calls.map((c) => (c[0] as { number: number }).number)).toEqual([1, 2]);
  });
});
