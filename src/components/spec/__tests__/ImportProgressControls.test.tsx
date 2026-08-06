import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportProgressControls from '../ImportProgressControls';

describe('ImportProgressControls', () => {
  it('renders an import button and a hidden file input', () => {
    render(<ImportProgressControls onImport={() => true} importError={null} />);
    expect(screen.getByRole('button', { name: /import progress/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/import progress file/i)).toBeInTheDocument();
  });

  it('reads a chosen file and calls onImport with its contents', async () => {
    const onImport = jest.fn(() => true);
    const user = userEvent.setup();
    render(<ImportProgressControls onImport={onImport} importError={null} />);

    const file = new File(['{"schemaVersion":1}'], 'progress.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText(/import progress file/i), file);

    await screen.findByRole('button', { name: /import progress/i });
    // FileReader is async; wait a tick for onload.
    await new Promise((r) => setTimeout(r, 0));
    expect(onImport).toHaveBeenCalledWith('{"schemaVersion":1}');
  });

  it('surfaces an import error via a role=alert region', () => {
    render(<ImportProgressControls onImport={() => false} importError="This file is not a valid icon-spec export." />);
    expect(screen.getByRole('alert')).toHaveTextContent(/not a valid/i);
  });
});
