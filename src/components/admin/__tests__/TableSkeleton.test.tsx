import { render, screen } from '@testing-library/react';
import { TableSkeleton } from '../Page';

/**
 * The whole value of this component is that its geometry is the real table's,
 * so what is worth pinning is that it is *made of* the real table rather than
 * drawn to look like it. A rewrite into plain divs would still look right in a
 * screenshot and would silently stop tracking `TableRow`'s height.
 *
 * jsdom cannot measure any of it. It can see which components rendered.
 */
describe('TableSkeleton', () => {
  it('is a real table, so row height and padding come from the primitives', () => {
    const { container } = render(<TableSkeleton columns={['w-24', 'w-16']} rows={3} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="table-row"]')).toHaveLength(4); // 3 + header
    expect(container.querySelectorAll('[data-slot="table-head"]')).toHaveLength(2);
    // One bar per cell, header included.
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(8);
  });
});
