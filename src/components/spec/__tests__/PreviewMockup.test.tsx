import { render, screen } from '@testing-library/react';
import PreviewMockup from '../PreviewMockups/PreviewMockup';

describe('PreviewMockup dispatcher', () => {
  it('renders nothing for kind "none"', () => {
    const { container } = render(<PreviewMockup kind="none" imageUrl="blob:x" alt="x" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the uploaded favicon inside a browser-tab mockup', () => {
    const { container } = render(<PreviewMockup kind="browserTab" imageUrl="blob:x" alt="my favicon" />);
    // The whole mockup carries the accessible label…
    expect(screen.getByRole('img', { name: /my favicon shown in a browser tab/i })).toBeInTheDocument();
    // …and the uploaded asset is the SVG <image> href.
    const image = container.querySelector('image');
    expect(image).toHaveAttribute('href', 'blob:x');
  });

  it('uses the client/project name as the browser-tab title, falling back to a placeholder', () => {
    const { rerender } = render(<PreviewMockup kind="browserTab" imageUrl="blob:x" alt="x" brandName="Qera Studio" />);
    expect(screen.getByText('Qera Studio')).toBeInTheDocument();

    rerender(<PreviewMockup kind="browserTab" imageUrl="blob:x" alt="x" />);
    expect(screen.getByText('Sample Brand')).toBeInTheDocument();
  });

  it('renders a bookmarks-bar mockup with the client name and uploaded favicon', () => {
    render(<PreviewMockup kind="bookmarksBar" imageUrl="blob:bm" alt="ico favicon" brandName="Qera Studio" />);
    expect(screen.getByText('Qera Studio')).toBeInTheDocument();
    expect(screen.getByAltText('ico favicon')).toHaveAttribute('src', 'blob:bm');
  });

  it('renders the bookmarks-bar template with no favicon before upload', () => {
    render(<PreviewMockup kind="bookmarksBar" alt="x" brandName="Qera Studio" />);
    expect(screen.getByText('Qera Studio')).toBeInTheDocument();
    expect(screen.queryByAltText('x')).not.toBeInTheDocument();
  });

  it('renders the uploaded image for a googleSerp mockup', () => {
    render(<PreviewMockup kind="googleSerp" imageUrl="blob:y" alt="serp favicon" />);
    expect(screen.getByAltText('serp favicon')).toHaveAttribute('src', 'blob:y');
  });
});
