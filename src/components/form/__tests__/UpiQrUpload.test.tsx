import { useState } from 'react';
// fireEvent, not userEvent: userEvent has no drag-and-drop API, and drop is
// the one path where a non-image file can actually reach the component.
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UpiQrUpload from '../UpiQrUpload';

const compress = jest.fn();
jest.mock('@/lib/images/compressImage', () => ({
  ...jest.requireActual('@/lib/images/compressImage'),
  compressImageToDataUrl: (...args: unknown[]) => compress(...args),
}));

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <UpiQrUpload id="qr" value={value} onValueChange={setValue} />;
}

const PNG = 'data:image/png;base64,abc';

/** The real <input type="file">; the dropzone shares its accessible name. */
function fileInput(): HTMLInputElement {
  return document.getElementById('qr') as HTMLInputElement;
}

beforeEach(() => jest.clearAllMocks());

describe('UpiQrUpload', () => {
  it('invites an upload when empty', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /upload qr image/i })).toBeInTheDocument();
  });

  it('shows the stored QR and offers to replace it', () => {
    render(<Harness initial={PNG} />);

    expect(screen.getByAltText(/upi qr code preview/i)).toHaveAttribute('src', PNG);
    expect(screen.getByRole('button', { name: /replace qr image/i })).toBeInTheDocument();
  });

  it('compresses a chosen file before storing it', async () => {
    compress.mockResolvedValue(PNG);
    const user = userEvent.setup();
    render(<Harness />);

    const file = new File(['bytes'], 'qr.png', { type: 'image/png' });
    await user.upload(fileInput(), file);

    expect(compress).toHaveBeenCalledWith(file, expect.objectContaining({ maxBytes: expect.any(Number) }));
    expect(await screen.findByAltText(/upi qr code preview/i)).toHaveAttribute('src', PNG);
  });

  it('explains why a dropped file was rejected instead of failing silently', async () => {
    // Drag-and-drop bypasses the input's `accept` filter, so this is the path
    // where a non-image can actually reach the component and must be explained.
    compress.mockRejectedValue(new Error('That file is not an image.'));
    render(<Harness />);

    const dropzone = screen.getByRole('button', { name: /upload qr image/i });
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [new File(['x'], 'notes.pdf', { type: 'application/pdf' })] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(/not an image/i);
    expect(screen.queryByAltText(/upi qr code preview/i)).not.toBeInTheDocument();
  });

  it('accepts a dropped image', async () => {
    compress.mockResolvedValue(PNG);
    render(<Harness />);

    fireEvent.drop(screen.getByRole('button', { name: /upload qr image/i }), {
      dataTransfer: { files: [new File(['bytes'], 'qr.png', { type: 'image/png' })] },
    });

    expect(await screen.findByAltText(/upi qr code preview/i)).toHaveAttribute('src', PNG);
  });

  it('lets the user remove a stored QR', async () => {
    const user = userEvent.setup();
    render(<Harness initial={PNG} />);

    await user.click(screen.getByRole('button', { name: /clear/i }));

    expect(screen.queryByAltText(/upi qr code preview/i)).not.toBeInTheDocument();
  });
});
