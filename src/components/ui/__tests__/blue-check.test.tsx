import { render, screen } from '@testing-library/react';
import { BlueCheck } from '../blue-check';

describe('BlueCheck', () => {
  it('defaults to the primary-blue variant: muted stroke ring, muted tick, no background', () => {
    render(<BlueCheck aria-label="Pass" />);
    const el = screen.getByRole('img', { name: 'Pass' });
    expect(el.className).not.toMatch(/bg-(blue-500|primary)/);
    expect(el.className).toMatch(/border-primary/);
    expect(el.className).toMatch(/text-primary/);
    expect(el.querySelector('svg')).toBeInTheDocument();
  });

  it('renders an outline variant inheriting currentColor, no background', () => {
    render(<BlueCheck aria-label="Reviewed" variant="outline" />);
    const el = screen.getByRole('img', { name: 'Reviewed' });
    expect(el.className).not.toMatch(/bg-blue-500/);
    // Outline = bordered ring, inherits currentColor.
    expect(el.className).toMatch(/border-current/);
    expect(el.querySelector('svg')).toBeInTheDocument();
  });

  it('renders a custom glyph inside the same ring when an icon is provided', () => {
    const Star = ((props: { className?: string }) => (
      <svg data-testid="star-glyph" {...props} />
    )) as unknown as typeof import('lucide-react').Star;
    render(<BlueCheck aria-label="Needs attention" variant="outline" icon={Star} />);
    const el = screen.getByRole('img', { name: 'Needs attention' });
    // Same ring container…
    expect(el.className).toMatch(/border-current/);
    // …but the custom glyph, not the default checkmark.
    expect(el.querySelector('[data-testid="star-glyph"]')).toBeInTheDocument();
  });
});
