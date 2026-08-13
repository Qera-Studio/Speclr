import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClauseLibrary from '../ClauseLibrary';

const updateClause = jest.fn();
const addClause = jest.fn();
const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: jest.fn() }),
}));
jest.mock('@/server/actions/clauses', () => ({
  updateClause: (...a: unknown[]) => updateClause(...a),
  addClause: (...a: unknown[]) => addClause(...a),
  removeClause: jest.fn(),
}));

const clauses = [
  { number: 1, heading: 'Definitions', body: ['1.1 In this Agreement…'] },
  { number: 2, heading: 'Structure', body: ['2.1 This Agreement establishes…'] },
];

beforeEach(() => {
  jest.clearAllMocks();
  updateClause.mockResolvedValue({ success: true });
  addClause.mockResolvedValue({ success: true });
});

describe('ClauseLibrary', () => {
  it('lists every clause by number and heading', () => {
    render(<ClauseLibrary clauses={clauses} stored />);

    expect(screen.getByRole('button', { name: /1\. Definitions/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2\. Structure/ })).toBeInTheDocument();
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
   * Saved explicitly, unlike every draft editor in the app. A draft belongs to
   * one document; these clauses are the source for every contract from here on,
   * so a keystroke landing in the library on its own is not a behaviour worth
   * having.
   */
  it('offers nothing to save until something changes', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={clauses} stored />);

    const save = screen.getByRole('button', { name: 'Saved' });
    expect(save).toBeDisabled();

    await u.click(screen.getByRole('button', { name: /1\. Definitions/ }));
    await u.type(screen.getByLabelText('Heading'), '!');

    expect(screen.getByRole('button', { name: 'Save 1 change' })).toBeEnabled();
  });

  it('writes only the clauses that changed', async () => {
    const u = userEvent.setup();
    render(<ClauseLibrary clauses={clauses} stored />);

    await u.click(screen.getByRole('button', { name: /2\. Structure/ }));
    await u.type(screen.getByLabelText('Heading'), ' and Precedence');
    await u.click(screen.getByRole('button', { name: /^Save 1 change$/ }));

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

    await u.click(screen.getByRole('button', { name: /1\. Definitions/ }));
    await u.type(screen.getByLabelText('Heading'), '!');
    await u.click(screen.getByRole('button', { name: /^Save 1 change$/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to save the clause.');
    expect(screen.queryByText('Saved.')).not.toBeInTheDocument();
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

    await u.click(screen.getByRole('button', { name: /1\. Definitions/ }));
    await u.type(screen.getByLabelText('Heading'), '!');
    await u.click(screen.getByRole('button', { name: /^Save 2 changes$/ }));

    await waitFor(() => expect(updateClause).toHaveBeenCalledTimes(clauses.length));
    expect(updateClause.mock.calls.map((c) => (c[0] as { number: number }).number)).toEqual([1, 2]);
  });

  it('still offers nothing to save until something changes', () => {
    render(<ClauseLibrary clauses={clauses} stored={false} />);

    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled();
  });
});
