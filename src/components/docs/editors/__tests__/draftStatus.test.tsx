import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AutosaveStatus, SaveError, UnsavedChangesDialog } from '../draftStatus';
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

/**
 * The dialog raised when a click would leave unsaved work behind.
 *
 * What is pinned here is which button carries which weight, because that was
 * wrong: Discard took the footer's default primary and "Save and leave" was an
 * outline, so the blue sat on the one action that throws work away. A dialog
 * raised *because* there is unsaved work should recommend keeping it.
 */
describe('UnsavedChangesDialog', () => {
  /** The guard fires on an in-app anchor click while the draft is dirty. */
  const openIt = async (user: ReturnType<typeof userEvent.setup>, autosave: DraftAutosave) => {
    render(
      <>
        <a href="/client/docs">Documents</a>
        <UnsavedChangesDialog autosave={autosave} label="contract" />
      </>,
    );
    await user.click(screen.getByRole('link', { name: 'Documents' }));
    return screen.getByRole('alertdialog');
  };

  it('recommends keeping the work, not discarding it', async () => {
    const user = userEvent.setup();
    const dialog = await openIt(user, autosaveStub({ dirty: true }));

    const save = screen.getByRole('button', { name: 'Save and leave' });
    const discard = screen.getByRole('button', { name: 'Discard' });

    // jsdom computes no colours, so the signal is the variant's own classes,
    // and specifically the *fill*: every button carries
    // `aria-invalid:border-destructive` in its base, so matching /destructive/
    // alone says nothing about which one is red.
    expect(save.className).toMatch(/bg-primary/);
    expect(save.className).not.toMatch(/bg-destructive/);
    expect(discard.className).toMatch(/bg-destructive/);
    expect(discard.className).not.toMatch(/bg-primary/);
    expect(dialog).toBeInTheDocument();
  });

  it('saves before leaving when asked to', async () => {
    const user = userEvent.setup();
    const flush = jest.fn().mockResolvedValue(true);
    await openIt(user, autosaveStub({ dirty: true, flush }));

    await user.click(screen.getByRole('button', { name: 'Save and leave' }));

    expect(flush).toHaveBeenCalled();
  });

  /** A failed write must not let go of the work it failed to save. */
  it('stays put when the save fails', async () => {
    const user = userEvent.setup();
    const flush = jest.fn().mockResolvedValue(false);
    await openIt(user, autosaveStub({ dirty: true, flush }));

    await user.click(screen.getByRole('button', { name: 'Save and leave' }));

    expect(flush).toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
