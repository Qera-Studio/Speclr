import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadedAttachment from '../UploadedAttachment';

describe('UploadedAttachment', () => {
  it('shows the file name and a TYPE · SIZE description', () => {
    render(
      <UploadedAttachment name="favicon-32x32.png" size={12 * 1024} format="png" objectUrl="blob:mock" onRemove={() => {}} />,
    );
    expect(screen.getByText('favicon-32x32.png')).toBeInTheDocument();
    // e.g. "PNG · 12 KB"
    expect(screen.getByText(/PNG.*12 KB/i)).toBeInTheDocument();
  });

  it('renders an image thumbnail for a raster format', () => {
    render(<UploadedAttachment name="a.png" size={1024} format="png" objectUrl="blob:mock" onRemove={() => {}} />);
    const img = screen.getByRole('img', { name: /a\.png/i });
    expect(img).toHaveAttribute('src', 'blob:mock');
  });

  it('renders a file icon (no thumbnail) for a .ico', () => {
    render(<UploadedAttachment name="favicon.ico" size={1024} format="ico" objectUrl="blob:mock" onRemove={() => {}} />);
    // No <img> thumbnail for .ico (can't render reliably); an icon glyph instead.
    expect(screen.queryByRole('img', { name: /favicon\.ico/i })).not.toBeInTheDocument();
  });

  it('fires onRemove when the remove (X) button is clicked', async () => {
    const onRemove = jest.fn();
    const user = userEvent.setup();
    render(<UploadedAttachment name="a.png" size={1024} format="png" objectUrl="blob:mock" onRemove={onRemove} />);
    await user.click(screen.getByRole('button', { name: /remove file/i }));
    expect(onRemove).toHaveBeenCalled();
  });
});
