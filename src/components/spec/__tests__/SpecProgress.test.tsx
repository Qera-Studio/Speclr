import { render, screen } from '@testing-library/react';
import SpecProgress from '../SpecProgress';

describe('SpecProgress', () => {
  it('exposes progress via a progressbar role with correct aria values', () => {
    render(<SpecProgress reviewed={3} total={10} />);
    const bar = screen.getByRole('progressbar', { name: /3 of 10/i });
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
  });

  it('renders a human-readable count', () => {
    render(<SpecProgress reviewed={3} total={10} />);
    expect(screen.getByText('3 of 10 reviewed')).toBeInTheDocument();
  });

  it('does not divide by zero when total is 0', () => {
    render(<SpecProgress reviewed={0} total={0} />);
    expect(screen.getByText('0 of 0 reviewed')).toBeInTheDocument();
  });
});
