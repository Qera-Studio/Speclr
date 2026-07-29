import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IconSpecCard from '../IconSpecCard';
import { ICON_SPECS } from '@/lib/spec/iconSpecData';
import type { SlotState } from '@/lib/spec/types';

const spec = ICON_SPECS.find((s) => s.id === 'favicon-192')!;
const icoSpec = ICON_SPECS.find((s) => s.id === 'favicon-ico')!;
const emptySlotState: SlotState = { reviewed: false, passed: null, notes: '' };

/** A .ico File whose bytes are readable via arrayBuffer() (jsdom's File lacks it). */
function icoFileWithBytes(name: string): File {
  const buffer = new Uint8Array([1, 2, 3, 4]).buffer;
  const file = new File([buffer], name, { type: 'image/x-icon' });
  Object.defineProperty(file, 'arrayBuffer', { value: () => Promise.resolve(buffer) });
  return file;
}

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

  it('offers no manual review control — review is automatic on a pass', () => {
    // A neutral (passed === null) slot: no "mark reviewed" affordance anywhere;
    // there is nothing to hand-sign-off. The failure/verdict speaks for itself.
    render(<IconSpecCard spec={spec} slotState={{ reviewed: true, passed: null, notes: '' }} onUpdate={() => {}} />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/mark reviewed|manually reviewed|review manually/i)).not.toBeInTheDocument();
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

  it('shows no manual review checkbox on an empty slot', () => {
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={() => {}} />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/mark reviewed/i)).not.toBeInTheDocument();
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

    // First upload via the dropzone.
    await user.upload(screen.getByLabelText(/^upload file$/i), icoFileWithBytes('a.ico'));
    const firstUrl = (URL.createObjectURL as jest.Mock).mock.results[0].value;

    // The dropzone stays as the container; once a file is present its input's
    // label switches to "Replace file". A second file comes in through it.
    const replace = await screen.findByLabelText(/^replace file$/i);
    await user.upload(replace, icoFileWithBytes('b.ico'));

    await waitFor(() => {
      expect(revoke).toHaveBeenCalledWith(firstUrl);
    });
  });

  it('uploading a file that is not a valid .ico container fails (parsed, not trusted by extension)', async () => {
    const onUpdate = jest.fn();
    const user = userEvent.setup();
    render(<IconSpecCard spec={icoSpec} slotState={emptySlotState} onUpdate={onUpdate} />);

    // Garbage bytes with a .ico name — the parser rejects it as not-an-ICO.
    const buffer = new Uint8Array([1, 2, 3, 4]).buffer;
    const file = new File([buffer], 'favicon.ico', { type: 'image/x-icon' });
    Object.defineProperty(file, 'arrayBuffer', { value: () => Promise.resolve(buffer) });
    await user.upload(screen.getByLabelText(/upload file/i), file);

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith({ passed: false });
    });
    // A fail never auto-marks reviewed.
    expect(onUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ reviewed: true }));
  });

  it('shows the .ico preview as a persistent template, empty then filled', async () => {
    const user = userEvent.setup();
    render(<IconSpecCard spec={icoSpec} slotState={emptySlotState} onUpdate={() => {}} />);

    // The bookmarks-bar template is visible even before an upload (no favicon img).
    expect(screen.getByText(/sample brand/i)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /browser favicon.*preview/i })).not.toBeInTheDocument();

    await user.upload(screen.getByLabelText(/^upload file$/i), icoFileWithBytes('a.ico'));

    // After upload the uploaded favicon fills the bookmark's slot.
    expect(await screen.findByRole('img', { name: /browser favicon.*preview/i })).toBeInTheDocument();
  });

  it('fades strip mockups sideways at the card, and the phone on its own svg', () => {
    // Strips run off both sides, so the card's preview area fades them
    // horizontally. The phone's svg is h-auto and shorter than that container,
    // so a mask there would resolve in empty space below it — its bottom fade
    // lives on the svg itself, which is what actually gets cropped.
    const { container: icoContainer } = render(
      <IconSpecCard spec={icoSpec} slotState={emptySlotState} onUpdate={() => {}} />,
    );
    const icoPreview = icoContainer.querySelector<HTMLElement>('[style*="mask-image"]');
    expect(icoPreview?.style.maskImage).toContain('to right');

    const appleSpec = ICON_SPECS.find((s) => s.id === 'apple-touch-icon')!;
    const { container: appleContainer } = render(
      <IconSpecCard spec={appleSpec} slotState={emptySlotState} onUpdate={() => {}} />,
    );
    const masked = appleContainer.querySelector<HTMLElement>('[style*="mask-image"]');
    // The mask is on the svg, not the preview wrapper.
    expect(masked?.tagName.toLowerCase()).toBe('svg');
    expect(masked?.style.maskImage).toContain('to bottom');
  });

  it('fades the serp preview on all four edges, composited', () => {
    // The page is a zoomed crop meeting the frame on every side. Two gradients
    // must intersect — stacked without compositing they union, and nothing
    // fades at all.
    const serpSpec = ICON_SPECS.find((s) => s.id === 'favicon-192')!;
    const { container } = render(
      <IconSpecCard spec={serpSpec} slotState={emptySlotState} onUpdate={() => {}} />,
    );
    const frame = container.querySelector<HTMLElement>('[style*="mask-image"]');
    // Each axis fades at both ends, so each gradient carries two transparent stops.
    for (const axis of ['to right', 'to bottom']) {
      expect(frame?.style.maskImage).toContain(axis);
    }
    expect(frame?.style.maskImage?.match(/transparent/g)).toHaveLength(4);
    expect(frame?.style.maskComposite).toBe('intersect');
  });

  it('gives every centred preview the same 500x250 frame', async () => {
    // The frame is what keeps cards level: without a shared size, a tall mockup
    // sets its card's height and the row's other card grows a gap to match.
    const kinds = ['favicon-ico', 'favicon-32', 'favicon-192', 'apple-touch-icon'] as const;
    for (const id of kinds) {
      const spec = ICON_SPECS.find((s) => s.id === id)!;
      const { container, unmount } = render(
        <IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={() => {}} />,
      );
      const frame = container.querySelector('.max-w-\\[500px\\]');
      expect(frame?.getAttribute('class')).toContain('h-[250px]');
      unmount();
    }
  });

  it('removing an uploaded file clears the slot back to empty', async () => {
    const onUpdate = jest.fn();
    const user = userEvent.setup();
    render(<IconSpecCard spec={icoSpec} slotState={emptySlotState} onUpdate={onUpdate} />);

    await user.upload(screen.getByLabelText(/^upload file$/i), icoFileWithBytes('a.ico'));

    // The attachment (and its remove button) appears once a file is present.
    const remove = await screen.findByRole('button', { name: /remove file/i });
    await user.click(remove);

    // Slot verdict + reviewed state reset, and the empty dropzone returns.
    expect(onUpdate).toHaveBeenCalledWith({ passed: null, reviewed: false });
    expect(screen.getByLabelText(/^upload file$/i)).toBeInTheDocument();
  });
});
