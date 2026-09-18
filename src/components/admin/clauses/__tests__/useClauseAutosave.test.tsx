import { act, renderHook, waitFor } from '@testing-library/react';
import { useClauseAutosave, CLAUSE_AUTOSAVE_MS } from '../useClauseAutosave';

const updateClause = jest.fn();
jest.mock('@/server/actions/clauses', () => ({
  updateClause: (...args: unknown[]) => updateClause(...args),
}));

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const CLAUSE = {
  number: 4,
  heading: 'Scope and Additional Work',
  summary: 'What is in scope',
  body: ['4.1 The Services are those described in the Part.'],
  archived: false,
};

beforeEach(() => {
  jest.useFakeTimers();
  updateClause.mockReset().mockResolvedValue({ success: true });
  refresh.mockReset();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

/**
 * The clause drawer lost its Save button, and these are the rules that replaced
 * it. They are here rather than in the drawer's own file because every one of
 * them is a timing question, and the drawer can only show the result.
 *
 * The risk being managed is stated in `ClauseLibrary`'s docstring and in
 * `CONTEXT.md` §5c: a clause is the source text for every contract drafted
 * after it, so a write that lands mid-word is a half-typed legal sentence in
 * the library. Debouncing is what makes autosave safe here, so the debounce is
 * the thing most worth pinning.
 */
describe('useClauseAutosave', () => {
  it('does not write on arrival, however many times it renders', () => {
    const { rerender } = renderHook(() => useClauseAutosave({ clause: CLAUSE, draft: CLAUSE }));

    rerender();
    act(() => void jest.advanceTimersByTime(CLAUSE_AUTOSAVE_MS * 3));

    // Opening a clause is not an edit to it. A hook that seeded its baseline
    // after the first effect instead of during the first render would write
    // the clause back to itself the moment the drawer opened.
    expect(updateClause).not.toHaveBeenCalled();
  });

  it('writes once after the typing stops, not once per keystroke', async () => {
    const draft = { ...CLAUSE };
    const { rerender } = renderHook(({ d }) => useClauseAutosave({ clause: CLAUSE, draft: d }), {
      initialProps: { d: draft },
    });

    // Four keystrokes inside one debounce window.
    for (const heading of ['S', 'Sc', 'Sco', 'Scop']) {
      rerender({ d: { ...CLAUSE, heading } });
      act(() => void jest.advanceTimersByTime(CLAUSE_AUTOSAVE_MS / 4));
    }
    expect(updateClause).not.toHaveBeenCalled();

    act(() => void jest.advanceTimersByTime(CLAUSE_AUTOSAVE_MS));
    await waitFor(() => expect(updateClause).toHaveBeenCalledTimes(1));
    // And it writes the latest value, not the one that started the window.
    expect(updateClause).toHaveBeenCalledWith(expect.objectContaining({ heading: 'Scop' }));
  });

  it('reports saving then saved, so the status line can replace the button', async () => {
    const { result, rerender } = renderHook(
      ({ d }) => useClauseAutosave({ clause: CLAUSE, draft: d }),
      { initialProps: { d: CLAUSE } },
    );

    expect(result.current.state).toBe('idle');

    rerender({ d: { ...CLAUSE, heading: 'Changed' } });
    expect(result.current.state).toBe('unsaved');

    act(() => void jest.advanceTimersByTime(CLAUSE_AUTOSAVE_MS));
    await waitFor(() => expect(result.current.state).toBe('saved'));
  });

  it('surfaces a refusal rather than silently dropping the edit', async () => {
    updateClause.mockResolvedValue({ success: false, error: 'Clause is archived.' });
    const { result, rerender } = renderHook(
      ({ d }) => useClauseAutosave({ clause: CLAUSE, draft: d }),
      { initialProps: { d: CLAUSE } },
    );

    rerender({ d: { ...CLAUSE, heading: 'Changed' } });
    act(() => void jest.advanceTimersByTime(CLAUSE_AUTOSAVE_MS));

    await waitFor(() => expect(result.current.error).toBe('Clause is archived.'));
    // Still unsaved: a failed write must not read as a saved one.
    expect(result.current.state).toBe('unsaved');
  });

  /**
   * The ordering rule, lifted from `useDraftAutosave`: two writes can be in
   * flight while somebody keeps typing, and two landing out of order persist
   * the older text over the newer. On a clause that means a contract drafted
   * afterwards copies a stale sentence.
   */
  it('serialises writes so a slow one cannot land after a newer one', async () => {
    const order: string[] = [];
    let releaseFirst: (() => void) | undefined;
    updateClause
      .mockImplementationOnce(async (one: { heading: string }) => {
        await new Promise<void>((r) => {
          releaseFirst = r;
        });
        order.push(one.heading);
        return { success: true };
      })
      .mockImplementationOnce(async (one: { heading: string }) => {
        order.push(one.heading);
        return { success: true };
      });

    const { rerender } = renderHook(({ d }) => useClauseAutosave({ clause: CLAUSE, draft: d }), {
      initialProps: { d: CLAUSE },
    });

    rerender({ d: { ...CLAUSE, heading: 'first' } });
    act(() => void jest.advanceTimersByTime(CLAUSE_AUTOSAVE_MS));
    await waitFor(() => expect(updateClause).toHaveBeenCalledTimes(1));

    rerender({ d: { ...CLAUSE, heading: 'second' } });
    act(() => void jest.advanceTimersByTime(CLAUSE_AUTOSAVE_MS));

    // The second write must wait for the first, even though the first is slow.
    act(() => releaseFirst?.());
    await waitFor(() => expect(order).toEqual(['first', 'second']));
  });

  /**
   * `flush` is what the irreversible actions call first. Archiving or deleting
   * with a debounce still pending would otherwise race: the timer fires at a
   * row that is no longer there, and the reader sees a failure they did not
   * cause.
   */
  it('flushes a pending write on demand and stops scheduling after', async () => {
    const { result, rerender } = renderHook(
      ({ d }) => useClauseAutosave({ clause: CLAUSE, draft: d }),
      { initialProps: { d: CLAUSE } },
    );

    rerender({ d: { ...CLAUSE, heading: 'Changed' } });
    await act(async () => {
      await result.current.flush();
    });
    expect(updateClause).toHaveBeenCalledTimes(1);

    // Frozen by the flush: a timer firing afterwards would write to a clause
    // that is being deleted.
    rerender({ d: { ...CLAUSE, heading: 'Later' } });
    act(() => void jest.advanceTimersByTime(CLAUSE_AUTOSAVE_MS * 3));
    expect(updateClause).toHaveBeenCalledTimes(1);
  });
});
