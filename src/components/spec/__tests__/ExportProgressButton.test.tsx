import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportProgressButton from '../ExportProgressButton';
import type { ExportedProgress } from '@/lib/spec/types';

const sample: ExportedProgress = {
  schemaVersion: 1,
  clientName: 'Acme Co.',
  exportedAt: '2026-07-23T00:00:00.000Z',
  slots: {},
};

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:mock') });
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: jest.fn() });
});

describe('ExportProgressButton', () => {
  it('renders an export button', () => {
    render(<ExportProgressButton clientName="Acme Co." onExport={() => sample} />);
    expect(screen.getByRole('button', { name: /export progress/i })).toBeInTheDocument();
  });

  it('runs the export handler and creates a downloadable blob on click', async () => {
    const onExport = jest.fn(() => sample);
    const user = userEvent.setup();
    render(<ExportProgressButton clientName="Acme Co." onExport={onExport} />);
    await user.click(screen.getByRole('button', { name: /export progress/i }));
    expect(onExport).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
