import { render, screen } from '@testing-library/react';
import ValidationResultBadge from '../ValidationResultBadge';
import type { ValidationResult } from '@/lib/spec/types';

const base: ValidationResult = {
  dimensionsOk: true,
  formatOk: true,
  transparency: 'opaque',
  transparencyIsWarning: false,
  actualWidth: 32,
  actualHeight: 32,
  actualFormat: 'image/png',
  objectUrl: 'blob:mock',
};

describe('ValidationResultBadge', () => {
  it('shows Pass for a fully valid opaque result', () => {
    render(<ValidationResultBadge result={base} />);
    expect(screen.getByText(/dimensions/i)).toBeInTheDocument();
    expect(screen.getByText(/32×32px/)).toBeInTheDocument();
    expect(screen.getAllByText('Pass').length).toBeGreaterThanOrEqual(2);
  });

  it('shows a Warning row when transparency is required but detected', () => {
    render(
      <ValidationResultBadge
        result={{ ...base, transparency: 'transparent', transparencyIsWarning: true }}
      />,
    );
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText(/expects a solid\/opaque background/i)).toBeInTheDocument();
  });

  it('shows Unknown and a note for an .ico-style result', () => {
    render(
      <ValidationResultBadge
        result={{
          ...base,
          dimensionsOk: 'unknown',
          transparency: 'unknown',
          note: 'pixel inspection not supported',
        }}
      />,
    );
    expect(screen.getAllByText('Unknown').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/pixel inspection not supported/i)).toBeInTheDocument();
  });
});
