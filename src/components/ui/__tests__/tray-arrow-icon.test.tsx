import { render } from '@testing-library/react';
import { TrayArrowIcon } from '../tray-arrow-icon';

describe('TrayArrowIcon', () => {
  it('renders an svg with the tray plus two arrow groups (resting + incoming)', () => {
    const { container } = render(<TrayArrowIcon direction="down" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // Tray path + two arrows (each = stem + chevron) = 5 <path> elements.
    expect(container.querySelectorAll('path')).toHaveLength(5);
    // Two arrow groups inside the clipped group.
    expect(container.querySelectorAll('g > g')).toHaveLength(2);
  });

  it('uses the up geometry for direction="up"', () => {
    const { container } = render(<TrayArrowIcon direction="up" />);
    expect(container.querySelector('path[d="m17 8-5-5-5 5"]')).toBeInTheDocument();
  });

  it('animates off the parent group/tray hover group', () => {
    const { container } = render(<TrayArrowIcon direction="down" />);
    const groups = container.querySelectorAll('g > g');
    // Both arrows key their transition to the shared group/tray hover marker, so
    // the icon animates inside any container carrying `group/tray`.
    for (const g of groups) {
      expect(g.getAttribute('class') ?? '').toMatch(/group-hover\/tray:/);
    }
  });
});
