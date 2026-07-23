import { render, screen } from '@testing-library/react';
import IconSpecTool from '../IconSpecTool';
import { ICON_SPECS } from '@/lib/spec/iconSpecData';

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:mock') });
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: jest.fn() });
});

describe('IconSpecTool', () => {
  it('renders the tool title as the single h1', () => {
    render(<IconSpecTool />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(/icon & logo spec checklist/i);
  });

  it('renders a card per icon spec', () => {
    render(<IconSpecTool />);
    for (const spec of ICON_SPECS) {
      expect(screen.getByRole('heading', { name: spec.name })).toBeInTheDocument();
    }
  });

  it('renders the client name field and progress bar', () => {
    render(<IconSpecTool />);
    expect(screen.getByLabelText(/client \/ project name/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
