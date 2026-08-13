import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeMenuItems } from '../ThemeToggle';

const setTheme = jest.fn();
let theme: string | undefined = 'dark';

jest.mock('next-themes', () => ({
  useTheme: () => ({ theme, setTheme }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  theme = 'dark';
});

function open() {
  render(
    <DropdownMenu>
      <DropdownMenuTrigger>Account</DropdownMenuTrigger>
      <DropdownMenuContent>
        <ThemeMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  // Base UI keeps `pointer-events: none` on a submenu popup while it animates
  // open, and jsdom runs no animations, so it never lifts. The guard is
  // protecting against a real-browser condition that does not exist here.
  return userEvent.setup({ pointerEventsCheck: 0 });
}

/**
 * The theme control moved out of the sidebar footer and into the account menu,
 * beside Settings and Sign out — it configures *you*, not a document surface.
 *
 * Rendered inside a real menu here rather than alone: a submenu trigger outside
 * a menu is not a thing, and what is worth checking is that it reads as one
 * choice out of three with a current value, which is a property of the radio
 * group and not of the icons.
 */
describe('ThemeMenuItems', () => {
  it('opens a Theme submenu offering all three options', async () => {
    const u = open();

    await u.click(screen.getByRole('button', { name: 'Account' }));
    await u.click(await screen.findByRole('menuitem', { name: /theme/i }));

    for (const label of ['Light', 'Dark', 'System']) {
      expect(await screen.findByRole('menuitemradio', { name: label })).toBeInTheDocument();
    }
  });

  /** A menu that does not say which theme is on makes you change it to find out. */
  it('marks the theme currently in use', async () => {
    const u = open();

    await u.click(screen.getByRole('button', { name: 'Account' }));
    await u.click(await screen.findByRole('menuitem', { name: /theme/i }));

    expect(await screen.findByRole('menuitemradio', { name: 'Dark' })).toBeChecked();
    expect(screen.getByRole('menuitemradio', { name: 'Light' })).not.toBeChecked();
  });

  /**
   * Activated from the keyboard, not the pointer: Base UI's radio items commit
   * on a real press sequence that jsdom's synthetic click does not complete, and
   * the keyboard path is the one that has to work anyway.
   */
  it('switches theme when another option is chosen', async () => {
    const u = open();

    await u.click(screen.getByRole('button', { name: 'Account' }));
    await u.click(await screen.findByRole('menuitem', { name: /theme/i }));
    (await screen.findByRole('menuitemradio', { name: 'System' })).focus();
    await u.keyboard('{Enter}');

    expect(setTheme).toHaveBeenCalledWith('system');
  });
});
