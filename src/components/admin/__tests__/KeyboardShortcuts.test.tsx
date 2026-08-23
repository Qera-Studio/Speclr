import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KeyboardShortcuts from '../KeyboardShortcuts';
import { jumpsForProfile } from '../nav';
import { PROFILES } from '@/lib/profile';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => '/client',
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => mockPush.mockClear());

describe('jump letters', () => {
  it('are unique within a profile', () => {
    for (const profile of PROFILES) {
      const letters = jumpsForProfile(profile).map((link) => link.jump);
      expect(new Set(letters).size).toBe(letters.length);
    }
  });

  /**
   * The rule `nav.ts` states, with its one stated exception. A letter that
   * meant two different pages depending on which side you were standing on is
   * the binding that gets pressed by muscle memory and lands somewhere else.
   */
  it('mean the same page on both sides, or are the home each side has', () => {
    const byLetter = new Map<string, Set<string>>();
    for (const profile of PROFILES) {
      for (const link of jumpsForProfile(profile)) {
        const seen = byLetter.get(link.jump!) ?? new Set<string>();
        seen.add(link.href);
        byLetter.set(link.jump!, seen);
      }
    }
    for (const [letter, hrefs] of byLetter) {
      if (letter === 'H') continue;
      expect(hrefs.size).toBe(1);
    }
  });
});

describe('KeyboardShortcuts', () => {
  it('jumps on g then a letter', async () => {
    const u = userEvent.setup();
    render(<KeyboardShortcuts profile="client" />);

    await u.keyboard('g');
    expect(mockPush).not.toHaveBeenCalled();

    await u.keyboard('c');
    expect(mockPush).toHaveBeenCalledWith('/client/clients');
  });

  it('does not arm while the caret is in a field', async () => {
    const u = userEvent.setup();
    render(
      <>
        <input aria-label="Notes" />
        <KeyboardShortcuts profile="client" />
      </>,
    );

    await u.click(screen.getByLabelText('Notes'));
    await u.keyboard('gc');

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Notes')).toHaveValue('gc');
  });

  it('opens the cheatsheet on ? and lists this profile’s bindings', async () => {
    const u = userEvent.setup();
    render(<KeyboardShortcuts profile="client" />);

    await u.keyboard('?');

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Keyboard shortcuts');
    // A jump destination and a create shortcut, both derived from the nav.
    expect(dialog).toHaveTextContent('Clause library');
    expect(dialog).toHaveTextContent('Invoice');
    // The other side's document types are not bound here.
    expect(dialog).not.toHaveTextContent('Pay slip');
  });
});
