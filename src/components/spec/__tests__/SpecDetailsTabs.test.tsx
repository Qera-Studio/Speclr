import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpecDetailsTabs from '../SpecDetailsTabs';

// Motion animates the slide; behaviour must not depend on its animation
// lifecycle. Mock to plain elements and render only the current child.
jest.mock('motion/react', () => {
  const React = require('react');
  const passthrough = (tag: string) =>
    React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      const { whileHover, initial, animate, exit, transition, custom, variants, layoutId, layout, ...rest } = props;
      void whileHover;
      void initial;
      void animate;
      void exit;
      void transition;
      void custom;
      void variants;
      void layoutId;
      void layout;
      return React.createElement(tag, { ...rest, ref });
    });
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy({}, { get: (_t, tag: string) => passthrough(tag) }),
  };
});

const tabs = [
  { id: 'used-in', label: 'Used in', content: 'Browser tab and bookmarks' },
  { id: 'why', label: 'Why it matters', content: 'Primary tab icon everywhere' },
  { id: 'standard', label: 'Industry standard', content: 'Square non-transparent PNG' },
];

describe('SpecDetailsTabs', () => {
  it('renders all three tab titles in one row', () => {
    render(<SpecDetailsTabs tabs={tabs} />);
    expect(screen.getByRole('tab', { name: 'Used in' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Why it matters' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Industry standard' })).toBeInTheDocument();
  });

  it('renders every tab body on the slider track', () => {
    render(<SpecDetailsTabs tabs={tabs} />);
    // All bodies are mounted on the track (only the active one is in view).
    expect(screen.getByText('Browser tab and bookmarks')).toBeInTheDocument();
    expect(screen.getByText('Square non-transparent PNG')).toBeInTheDocument();
  });

  it('marks the first tab active by default and switches on click', async () => {
    const user = userEvent.setup();
    render(<SpecDetailsTabs tabs={tabs} />);
    expect(screen.getByRole('tab', { name: 'Used in' })).toHaveAttribute('data-active');

    await user.click(screen.getByRole('tab', { name: 'Industry standard' }));
    expect(screen.getByRole('tab', { name: 'Industry standard' })).toHaveAttribute('data-active');
    expect(screen.getByRole('tab', { name: 'Used in' })).not.toHaveAttribute('data-active');
  });
});
