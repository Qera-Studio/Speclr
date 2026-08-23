import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AutosaveStatus, SaveError } from '../draftStatus';
import type { DraftAutosave } from '../useDraftAutosave';

function autosaveStub(overrides: Partial<DraftAutosave> = {}): DraftAutosave {
  return {
    docId: 'doc-1',
    saveState: 'saved',
    savedAt: null,
    serverError: null,
    setServerError: jest.fn(),
    dirty: false,
    flush: jest.fn().mockResolvedValue(true),
    freeze: jest.fn(),
    thaw: jest.fn(),
    ...overrides,
  };
}

describe('AutosaveStatus', () => {
  it('says when the last write landed, not just that one did', () => {
    // 14:32 local, whatever the runner's zone is.
    const at = new Date(2026, 7, 21, 14, 32).getTime();
    render(<AutosaveStatus autosave={autosaveStub({ savedAt: at })} />);

    expect(screen.getByRole('status')).toHaveTextContent('Saved 14:32');
  });

  it('shows no time while a write is still in flight', () => {
    render(<AutosaveStatus autosave={autosaveStub({ saveState: 'saving' })} />);
    expect(screen.getByRole('status')).toHaveTextContent('Saving…');
  });

  it('asks for a recipient rather than pretending to save without one', () => {
    render(
      <AutosaveStatus
        autosave={autosaveStub({ docId: null, dirty: true })}
        recipient="employee"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Pick a employee to start saving.');
  });
});

describe('SaveError', () => {
  it('renders nothing when the last write was accepted', () => {
    const { container } = render(<SaveError autosave={autosaveStub()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps the server’s own reason rather than a generic line', () => {
    render(
      <SaveError autosave={autosaveStub({ serverError: 'Place of supply is required.' })} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Place of supply is required.');
  });

  it('writes again on retry, so recovering does not need another keystroke', async () => {
    const user = userEvent.setup();
    const flush = jest.fn().mockResolvedValue(true);
    const setServerError = jest.fn();
    render(
      <SaveError autosave={autosaveStub({ serverError: 'Network error.', flush, setServerError })} />,
    );

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    // Cleared first: the old refusal must not sit under a write in progress.
    expect(setServerError).toHaveBeenCalledWith(null);
    expect(flush).toHaveBeenCalled();
  });

  it('cannot be retried on top of a write already in flight', () => {
    render(
      <SaveError autosave={autosaveStub({ serverError: 'Network error.', saveState: 'saving' })} />,
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled();
  });
});
