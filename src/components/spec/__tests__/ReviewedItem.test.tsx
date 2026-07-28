import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewedItem from '../ReviewedItem';
import type { ValidationResult } from '@/lib/spec/types';

const passResult: ValidationResult = {
  dimensionsOk: true,
  formatOk: true,
  transparency: 'opaque',
  transparencyIsWarning: false,
  actualWidth: 32,
  actualHeight: 32,
  actualFormat: 'image/png',
  objectUrl: 'blob:mock',
};

const criteria = { dimensions: true, format: true, transparency: true };

describe('ReviewedItem', () => {
  it('reads "All checks passed" with a passed tick when everything passes cleanly', () => {
    render(<ReviewedItem result={passResult} criteria={criteria} />);
    expect(screen.getByText('Reviewed')).toBeInTheDocument();
    expect(screen.getByText(/all checks passed/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^passed$/i })).toBeInTheDocument();
  });

  it('summarises passed + warning counts when a warning is present', () => {
    render(
      <ReviewedItem
        result={{ ...passResult, warnings: [{ kind: 'aspect-ratio', message: 'Not square' }] }}
        criteria={criteria}
      />,
    );
    expect(screen.getByText(/3 passed · 1 warning/i)).toBeInTheDocument();
  });

  it('summarises passed + failed counts and shows a warning tick when a check fails', () => {
    render(
      <ReviewedItem result={{ ...passResult, dimensionsOk: false }} criteria={criteria} />,
    );
    expect(screen.getByText(/2 passed · 1 failed/i)).toBeInTheDocument();
    // A failing outcome uses the amber "warnings/attention" tick, not the clean pass tick.
    expect(screen.getByRole('img', { name: /attention|warning|passed with/i })).toBeInTheDocument();
  });

  it('hides the individual check rows until expanded, then reveals them', async () => {
    const user = userEvent.setup();
    render(<ReviewedItem result={passResult} criteria={criteria} />);

    // Collapsed: the detailed rows are not shown.
    expect(screen.queryByText(/no transparency detected/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show checks|reviewed/i }));

    expect(screen.getByText(/no transparency detected/i)).toBeInTheDocument();
  });
});
