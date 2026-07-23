import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportImportControls from '../ExportImportControls';
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

describe('ExportImportControls', () => {
  it('renders export and import controls', () => {
    render(
      <ExportImportControls clientName="Acme Co." onExport={() => sample} onImport={() => true} importError={null} />,
    );
    expect(screen.getByRole('button', { name: /export progress/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/import progress/i)).toBeInTheDocument();
  });

  it('triggers the export handler and creates a downloadable blob', async () => {
    const onExport = jest.fn(() => sample);
    const user = userEvent.setup();
    render(<ExportImportControls clientName="Acme Co." onExport={onExport} onImport={() => true} importError={null} />);
    await user.click(screen.getByRole('button', { name: /export progress/i }));
    expect(onExport).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('surfaces an import error via a role=alert region', () => {
    render(
      <ExportImportControls
        clientName="Acme Co."
        onExport={() => sample}
        onImport={() => false}
        importError="This file is not a valid kessler-spec export."
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/not a valid/i);
  });
});
