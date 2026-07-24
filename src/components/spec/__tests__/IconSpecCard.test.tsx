import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IconSpecCard from '../IconSpecCard';
import { ICON_SPECS } from '@/lib/spec/iconSpecData';
import type { SlotState } from '@/lib/spec/types';

const spec = ICON_SPECS.find((s) => s.id === 'favicon-192')!;
const icoSpec = ICON_SPECS.find((s) => s.id === 'favicon-ico')!;
const emptySlotState: SlotState = { reviewed: false, passed: null, notes: '' };

beforeEach(() => {
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

  it('shows a "Pass" verdict when the slot passed', () => {
    render(<IconSpecCard spec={spec} slotState={{ reviewed: true, passed: true, notes: '' }} onUpdate={() => {}} />);
    expect(screen.getByText('Pass')).toBeInTheDocument();
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

  it('notes textarea calls onUpdate as the user types', async () => {
    const onUpdate = jest.fn();
    const user = userEvent.setup();
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={onUpdate} />);
    await user.type(screen.getByLabelText(/notes/i), 'x');
    expect(onUpdate).toHaveBeenCalled();
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

  it('uploading a .ico (nothing verifiable) marks it reviewed but passed: null, not a false pass', async () => {
    const onUpdate = jest.fn();
    const user = userEvent.setup();
    render(<IconSpecCard spec={icoSpec} slotState={emptySlotState} onUpdate={onUpdate} />);

    const file = new File(['fake-ico-bytes'], 'favicon.ico', { type: 'image/x-icon' });
    await user.upload(screen.getByLabelText(/upload file/i), file);

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith({ reviewed: true, passed: null });
    });
  });
});
