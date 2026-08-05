import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditorSection from '../EditorSection';

describe('EditorSection', () => {
  it('keeps its contents out of the DOM until opened', async () => {
    const u = userEvent.setup();
    render(
      <EditorSection title="Terms" description="The clauses printed at the foot">
        <input aria-label="Term title" />
      </EditorSection>,
    );

    // Collapsed is the point: forty fields in a 384px rail is unusable, so a
    // closed section must not merely be visually hidden.
    expect(screen.queryByLabelText('Term title')).not.toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: /terms/i }));
    expect(screen.getByLabelText('Term title')).toBeInTheDocument();
  });

  it('opens on demand and says so to assistive tech', () => {
    render(
      <EditorSection title="Letter" defaultOpen>
        <input aria-label="Body" />
      </EditorSection>,
    );

    expect(screen.getByLabelText('Body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /letter/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
