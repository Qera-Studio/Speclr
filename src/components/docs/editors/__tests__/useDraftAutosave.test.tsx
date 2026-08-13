import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

jest.mock('@/server/actions/documents', () => ({
  createDraft: jest.fn(),
  updateDraft: jest.fn(),
}));

import { createDraft, updateDraft } from '@/server/actions/documents';
import { AUTOSAVE_MS, useDraftAutosave } from '../useDraftAutosave';

const create = createDraft as jest.MockedFunction<typeof createDraft>;
const update = updateDraft as jest.MockedFunction<typeof updateDraft>;

/**
 * A minimal editor: one field, one recipient picker, and the autosave hook.
 * Exercising the hook through a component rather than `renderHook` keeps the
 * test honest about the thing that actually matters — typing causes writes.
 */
function Harness({
  initialDocId = null,
  initialRecipient = '',
}: {
  initialDocId?: string | null;
  initialRecipient?: string;
}) {
  const [text, setText] = useState('');
  const [recipient, setRecipient] = useState(initialRecipient);
  const autosave = useDraftAutosave({
    typeCode: 'INV',
    initialDocId,
    recipientId: recipient,
    payload: { text },
  });

  return (
    <div>
      <input aria-label="Text" value={text} onChange={(e) => setText(e.target.value)} />
      <button type="button" onClick={() => setRecipient('client-1')}>
        Pick client
      </button>
      <button type="button" onClick={() => autosave.freeze()}>
        Freeze
      </button>
      <button type="button" onClick={() => void autosave.flush()}>
        Flush
      </button>
      <p data-testid="state">{autosave.saveState}</p>
      <p data-testid="dirty">{String(autosave.dirty)}</p>
      <p data-testid="docid">{autosave.docId ?? 'none'}</p>
      <p data-testid="error">{autosave.serverError ?? 'none'}</p>
    </div>
  );
}

/** Advance past the debounce and let the queued write settle. */
async function settle() {
  await act(async () => {
    jest.advanceTimersByTime(AUTOSAVE_MS);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useDraftAutosave', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    create.mockResolvedValue({ success: true, id: 'new-doc' });
    update.mockResolvedValue({ success: true });
  });

  afterEach(() => jest.useRealTimers());

  it('does not write on arrival — opening a document is not editing it', async () => {
    render(<Harness initialDocId="d1" initialRecipient="client-1" />);
    await settle();
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  /**
   * `createDraft` refuses an empty client id, so there is genuinely nothing to
   * save yet. What must not happen is losing the typing that came first.
   */
  it('holds back until a recipient is picked, then saves what was already typed', async () => {
    render(<Harness />);

    await user.type(screen.getByLabelText('Text'), 'hello');
    await settle();
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByTestId('dirty')).toHaveTextContent('true');

    await user.click(screen.getByRole('button', { name: 'Pick client' }));
    await settle();
    expect(create).toHaveBeenCalledWith('INV', 'client-1', { text: 'hello' });
  });

  it('coalesces a burst of typing into one write', async () => {
    render(<Harness initialDocId="d1" initialRecipient="client-1" />);

    await user.type(screen.getByLabelText('Text'), 'abcdef');
    await settle();

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith('d1', 'client-1', { text: 'abcdef' });
  });

  /** The row is created on the first write, and the URL becomes its own. */
  it('creates once, then updates the id it was given', async () => {
    const replaceState = jest.spyOn(window.history, 'replaceState');
    render(<Harness initialRecipient="client-1" />);

    await user.type(screen.getByLabelText('Text'), 'a');
    await settle();
    expect(create).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('docid')).toHaveTextContent('new-doc');
    expect(replaceState).toHaveBeenCalledWith(null, '', '/client/docs/new-doc');

    await user.type(screen.getByLabelText('Text'), 'b');
    await settle();
    expect(create).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith('new-doc', 'client-1', { text: 'ab' });
  });

  /**
   * Two writes landing out of order would persist the older payload over the
   * newer, which is silent data loss. The queue is what stops it.
   */
  it('serialises writes so a slow one cannot overwrite a later one', async () => {
    const order: string[] = [];
    let releaseFirst: (() => void) | undefined;
    update
      .mockImplementationOnce(async (_id, _client, data) => {
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
        order.push((data as { text: string }).text);
        return { success: true };
      })
      .mockImplementation(async (_id, _client, data) => {
        order.push((data as { text: string }).text);
        return { success: true };
      });

    render(<Harness initialDocId="d1" initialRecipient="client-1" />);

    await user.type(screen.getByLabelText('Text'), 'a');
    await settle();
    await user.type(screen.getByLabelText('Text'), 'b');
    await settle();

    // The second write cannot have landed while the first is still in flight.
    expect(order).toEqual([]);
    await act(async () => {
      releaseFirst?.();
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(order).toEqual(['a', 'ab']);
  });

  /**
   * Finalize freezes first. The server refuses a write to a finalized document
   * anyway; what this stops is the editor showing that refusal as an error
   * while it is already navigating away.
   */
  it('writes nothing once frozen', async () => {
    render(<Harness initialDocId="d1" initialRecipient="client-1" />);

    await user.click(screen.getByRole('button', { name: 'Freeze' }));
    await user.type(screen.getByLabelText('Text'), 'a');
    await settle();

    expect(update).not.toHaveBeenCalled();
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });

  it('flush writes immediately, without waiting for the debounce', async () => {
    render(<Harness initialDocId="d1" initialRecipient="client-1" />);

    await user.type(screen.getByLabelText('Text'), 'a');
    await user.click(screen.getByRole('button', { name: 'Flush' }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(update).toHaveBeenCalledWith('d1', 'client-1', { text: 'a' });
  });

  it('surfaces a refusal and stays dirty, so the edit is not silently dropped', async () => {
    update.mockResolvedValue({ success: false, error: 'Document is incomplete.' });
    render(<Harness initialDocId="d1" initialRecipient="client-1" />);

    await user.type(screen.getByLabelText('Text'), 'a');
    await settle();

    expect(screen.getByTestId('error')).toHaveTextContent('Document is incomplete.');
    expect(screen.getByTestId('dirty')).toHaveTextContent('true');
    expect(screen.getByTestId('state')).toHaveTextContent('idle');
  });
});
