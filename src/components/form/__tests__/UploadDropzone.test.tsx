import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadDropzone from '../UploadDropzone';

// userEvent has no drag-and-drop simulation, so drop events are dispatched
// directly. A minimal DataTransfer stand-in carries the dropped files.
function dropFiles(el: Element, files: File[]) {
  fireEvent.drop(el, { dataTransfer: { files, items: files.map((f) => ({ kind: 'file', getAsFile: () => f })), types: ['Files'] } });
}

describe('UploadDropzone', () => {
  it('renders an Upload file control reachable by keyboard', () => {
    render(<UploadDropzone id="favicon-32" accept="image/png" onFileSelected={() => {}} />);
    const input = screen.getByLabelText(/upload file/i);
    expect(input).not.toHaveAttribute('tabindex', '-1');
  });

  it('switches the label to Replace file once a file is present', () => {
    render(<UploadDropzone id="favicon-32" accept="image/png" hasFile onFileSelected={() => {}} />);
    expect(screen.getByLabelText(/replace file/i)).toBeInTheDocument();
  });

  it('renders the attachment slot inside the box when provided', () => {
    render(
      <UploadDropzone
        id="favicon-32"
        accept="image/png"
        hasFile
        onFileSelected={() => {}}
        attachment={<div>logo.png · PNG</div>}
      />,
    );
    expect(screen.getByText('logo.png · PNG')).toBeInTheDocument();
  });

  it('calls onFileSelected when a file is chosen', async () => {
    const onFileSelected = jest.fn();
    const user = userEvent.setup();
    render(<UploadDropzone id="favicon-32" accept="image/png" onFileSelected={onFileSelected} />);
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/upload file/i), file);
    expect(onFileSelected).toHaveBeenCalledWith(file, 1);
  });

  it('exposes a labelled drop target', () => {
    render(<UploadDropzone id="favicon-32" accept="image/png" onFileSelected={() => {}} />);
    expect(screen.getByRole('button', { name: /drag.*drop|drop.*file|upload/i })).toBeInTheDocument();
  });

  it('calls onFileSelected with the dropped file', () => {
    const onFileSelected = jest.fn();
    render(<UploadDropzone id="favicon-32" accept="image/png" onFileSelected={onFileSelected} />);
    const file = new File(['x'], 'dropped.png', { type: 'image/png' });
    dropFiles(screen.getByRole('button', { name: /drag.*drop|drop.*file|upload/i }), [file]);
    expect(onFileSelected).toHaveBeenCalledWith(file, 1);
  });

  it('takes the first of several dropped files, and says how many there were', () => {
    const onFileSelected = jest.fn();
    render(<UploadDropzone id="favicon-32" accept="image/png" onFileSelected={onFileSelected} />);
    const first = new File(['x'], 'first.png', { type: 'image/png' });
    const second = new File(['x'], 'second.png', { type: 'image/png' });
    dropFiles(screen.getByRole('button', { name: /drag.*drop|drop.*file|upload/i }), [
      first,
      second,
    ]);
    // The count is the caller's business: this box takes one file, and the one
    // that owns the surrounding fields is the one that can explain why.
    expect(onFileSelected).toHaveBeenCalledWith(first, 2);
  });

  it('ignores a drop that carries no files', () => {
    const onFileSelected = jest.fn();
    render(<UploadDropzone id="favicon-32" accept="image/png" onFileSelected={onFileSelected} />);
    dropFiles(screen.getByRole('button', { name: /drag.*drop|drop.*file|upload/i }), []);
    expect(onFileSelected).not.toHaveBeenCalled();
  });
});
