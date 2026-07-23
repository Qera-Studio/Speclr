import { render, screen } from '@testing-library/react';
import PreviewMockup from '../PreviewMockups/PreviewMockup';

describe('PreviewMockup dispatcher', () => {
  it('renders nothing for kind "none"', () => {
    const { container } = render(<PreviewMockup kind="none" imageUrl="blob:x" alt="x" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the uploaded image for a browserTab mockup', () => {
    render(<PreviewMockup kind="browserTab" imageUrl="blob:x" alt="my favicon" />);
    expect(screen.getByAltText('my favicon')).toHaveAttribute('src', 'blob:x');
  });

  it('renders the uploaded image for a googleSerp mockup', () => {
    render(<PreviewMockup kind="googleSerp" imageUrl="blob:y" alt="serp favicon" />);
    expect(screen.getByAltText('serp favicon')).toHaveAttribute('src', 'blob:y');
  });
});
