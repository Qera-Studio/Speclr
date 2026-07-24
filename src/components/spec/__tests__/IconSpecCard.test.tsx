import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IconSpecCard from '../IconSpecCard';
import { ICON_SPECS } from '@/lib/spec/iconSpecData';
import type { SlotState } from '@/lib/spec/types';

const spec = ICON_SPECS.find((s) => s.id === 'favicon-192')!;
const icoSpec = ICON_SPECS.find((s) => s.id === 'favicon-ico')!;
const emptySlotState: SlotState = { reviewed: false, passed: null, notes: '' };

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:mock') });
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: jest.fn() });
});

describe('IconSpecCard', () => {
  it('renders the spec name as a heading', () => {
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={() => {}} />);
    expect(screen.getByRole('heading', { name: spec.name })).toBeInTheDocument();
  });

  it('shows no verdict pill before the slot is reviewed', () => {
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={() => {}} />);
    expect(screen.queryByText(/^(Pass|Fail|Review manually)$/)).not.toBeInTheDocument();
  });

  it('shows a blue "Passed" tick (replacing the badge + priority text) when the slot passed', () => {
    render(<IconSpecCard spec={spec} slotState={{ reviewed: true, passed: true, notes: '' }} onUpdate={() => {}} />);
    expect(screen.getByRole('img', { name: /passed/i })).toBeInTheDocument();
    // The "Required" priority text is replaced by the tick in this state.
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
  });

  it('shows a "Fail" verdict when the slot failed', () => {
    render(<IconSpecCard spec={spec} slotState={{ reviewed: true, passed: false, notes: '' }} onUpdate={() => {}} />);
    expect(screen.getByText('Fail')).toBeInTheDocument();
  });

  it('shows "Review manually" when reviewed but nothing could be verified', () => {
    render(<IconSpecCard spec={spec} slotState={{ reviewed: true, passed: null, notes: '' }} onUpdate={() => {}} />);
    expect(screen.getByText('Review manually')).toBeInTheDocument();
  });

  it('renders the filename and a priority badge', () => {
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={() => {}} />);
    expect(screen.getByText(spec.filename)).toBeInTheDocument();
    expect(screen.getByText(spec.priority === 'required' ? 'Required' : 'Nice to have')).toBeInTheDocument();
  });

  it('upload control is reachable by keyboard', () => {
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={() => {}} />);
    expect(screen.getByLabelText(/upload file/i)).not.toHaveAttribute('tabindex', '-1');
  });

  it('"mark reviewed" checkbox calls onUpdate when toggled', async () => {
    const onUpdate = jest.fn();
    const user = userEvent.setup();
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={onUpdate} />);
    await user.click(screen.getByRole('checkbox', { name: /mark reviewed/i }));
    expect(onUpdate).toHaveBeenCalledWith({ reviewed: true });
  });

  it('the whole "mark reviewed" panel is clickable, not just the checkbox', async () => {
    const onUpdate = jest.fn();
    const user = userEvent.setup();
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={onUpdate} />);
    // Click the label text region of the panel — the large hit target — and it
    // still toggles the reviewed state.
    await user.click(screen.getByText(/mark reviewed/i));
    expect(onUpdate).toHaveBeenCalledWith({ reviewed: true });
  });

  it('hides the notes textarea behind an "add note" control when the slot has no note', () => {
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={() => {}} />);
    expect(screen.queryByLabelText(/notes/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument();
  });

  it('reveals the notes textarea when "add note" is clicked, and records typing', async () => {
    const onUpdate = jest.fn();
    const user = userEvent.setup();
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={onUpdate} />);
    await user.click(screen.getByRole('button', { name: /add note/i }));
    const textarea = screen.getByLabelText(/notes/i);
    await user.type(textarea, 'x');
    expect(onUpdate).toHaveBeenCalled();
  });

  it('starts expanded when the slot already has a note', () => {
    render(<IconSpecCard spec={spec} slotState={{ reviewed: true, passed: true, notes: 'existing note' }} onUpdate={() => {}} />);
    expect(screen.getByLabelText(/notes/i)).toHaveValue('existing note');
    expect(screen.queryByRole('button', { name: /add note/i })).not.toBeInTheDocument();
  });

  it('deletes a note: clears the text and collapses back to "add note"', async () => {
    const onUpdate = jest.fn();
    const user = userEvent.setup();
    render(<IconSpecCard spec={spec} slotState={{ reviewed: false, passed: null, notes: 'to remove' }} onUpdate={onUpdate} />);

    await user.click(screen.getByRole('button', { name: /delete note/i }));
    expect(onUpdate).toHaveBeenCalledWith({ notes: '' });
    // Collapses back to the add-note affordance.
    expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/notes/i)).not.toBeInTheDocument();
  });

  it('revokes the previous object URL when a new file replaces it (no blob leak)', async () => {
    let counter = 0;
    (URL.createObjectURL as jest.Mock).mockImplementation(() => `blob:mock-${++counter}`);
    const revoke = URL.revokeObjectURL as jest.Mock;
    const user = userEvent.setup();
    render(<IconSpecCard spec={icoSpec} slotState={emptySlotState} onUpdate={() => {}} />);

    const input = screen.getByLabelText(/upload file/i);
    await user.upload(input, new File(['a'], 'a.ico', { type: 'image/x-icon' }));
    const firstUrl = (URL.createObjectURL as jest.Mock).mock.results[0].value;

    await user.upload(input, new File(['b'], 'b.ico', { type: 'image/x-icon' }));

    await waitFor(() => {
      expect(revoke).toHaveBeenCalledWith(firstUrl);
    });
  });

  it('uploading a .ico records passed: null (not a false pass) without auto-marking reviewed', async () => {
    const onUpdate = jest.fn();
    const user = userEvent.setup();
    render(<IconSpecCard spec={icoSpec} slotState={emptySlotState} onUpdate={onUpdate} />);

    const file = new File(['fake-ico-bytes'], 'favicon.ico', { type: 'image/x-icon' });
    await user.upload(screen.getByLabelText(/upload file/i), file);

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith({ passed: null });
    });
    // A neutral/unverifiable result (.ico) must NOT auto-mark reviewed — only a
    // fully-verified pass does; here the user still signs off manually.
    expect(onUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ reviewed: true }));
  });
});
