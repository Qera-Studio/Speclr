import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadDropzone from '../UploadDropzone';

describe('UploadDropzone', () => {
  it('renders an Upload file control reachable by keyboard', () => {
    render(<UploadDropzone id="favicon-32" format="png" fileName={null} onFileSelected={() => {}} />);
    const input = screen.getByLabelText(/upload file/i);
    expect(input).not.toHaveAttribute('tabindex', '-1');
  });

  it('shows the selected file name and switches label to Replace file', () => {
    render(<UploadDropzone id="favicon-32" format="png" fileName="logo.png" onFileSelected={() => {}} />);
    expect(screen.getByText('logo.png')).toBeInTheDocument();
    expect(screen.getByLabelText(/replace file/i)).toBeInTheDocument();
  });

  it('calls onFileSelected when a file is chosen', async () => {
    const onFileSelected = jest.fn();
    const user = userEvent.setup();
    render(<UploadDropzone id="favicon-32" format="png" fileName={null} onFileSelected={onFileSelected} />);
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/upload file/i), file);
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });
});
