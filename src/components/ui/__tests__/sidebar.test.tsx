import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarTrigger,
} from '../sidebar';

/**
 * These cover the local fork of shadcn's sidebar: the `state` override on
 * `Sidebar` that lets a second rail (the app's editor panel) collapse
 * independently under the single shared provider, and the `insetRight` escape
 * hatch on `SidebarInset`.
 */

function clearCookies() {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  });
}

beforeEach(clearCookies);

describe('SidebarProvider', () => {
  it('persists open state and toggles on Meta+B', async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarTrigger />
        </Sidebar>
        <SidebarInset />
      </SidebarProvider>,
    );

    await user.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    expect(document.cookie).toContain('sidebar_state=false');

    await user.keyboard('{Meta>}b{/Meta}');
    expect(document.cookie).toContain('sidebar_state=true');
  });
});

describe('Sidebar — independent state override', () => {
  /**
   * One provider carries one open state, so two sidebars under it would expand
   * and collapse together. The `state` prop is what keeps the editor rail
   * independent of the nav; everything downstream reads `data-state` off the
   * DOM, so overriding it here is sufficient.
   */
  it('honours an explicit state instead of the shared context', async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <Sidebar data-testid="nav">
          <SidebarTrigger />
        </Sidebar>
        <SidebarInset insetRight />
        <Sidebar side="right" state="collapsed" data-testid="rail" />
      </SidebarProvider>,
    );

    const nav = () => screen.getByTestId('nav').closest('[data-slot="sidebar"]');
    const rail = () => screen.getByTestId('rail').closest('[data-slot="sidebar"]');

    expect(nav()).toHaveAttribute('data-state', 'expanded');
    expect(rail()).toHaveAttribute('data-state', 'collapsed');

    // Toggling the nav must not move the rail.
    await user.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    expect(nav()).toHaveAttribute('data-state', 'collapsed');
    expect(rail()).toHaveAttribute('data-state', 'collapsed');
  });

  /**
   * Regression: `style` used to land on the fixed container only, via the props
   * spread. The gap div — which is what actually reserves horizontal space —
   * kept reading the provider's `--sidebar-width`, so a wider rail overlapped
   * the content card instead of sitting beside it. The override has to be on
   * the wrapper, where it cascades to both.
   */
  it('applies a width override to the wrapper so the gap and panel agree', () => {
    render(
      <SidebarProvider>
        <Sidebar
          side="right"
          data-testid="rail"
          style={{ '--sidebar-width': '384px' } as React.CSSProperties}
        />
      </SidebarProvider>,
    );
    const wrapper = screen.getByTestId('rail').closest('[data-slot="sidebar"]') as HTMLElement;
    expect(wrapper.style.getPropertyValue('--sidebar-width')).toBe('384px');
    // The gap is a descendant, so it inherits the same variable.
    expect(wrapper.querySelector('[data-slot="sidebar-gap"]')).toBeInTheDocument();
  });

  it('falls back to context state when no override is given', () => {
    render(
      <SidebarProvider>
        <Sidebar data-testid="nav" />
      </SidebarProvider>,
    );
    expect(screen.getByTestId('nav').closest('[data-slot="sidebar"]')).toHaveAttribute(
      'data-state',
      'expanded',
    );
  });

  /**
   * `collapsible="float"` was added for the nav rail alone, and one
   * `SidebarProvider` holds the `peeking` flag that drives it — so an `icon`
   * rail under that same provider (the editor panel) must be blind to it.
   *
   * Both halves matter. A float that stopped reporting `data-collapsible=icon`
   * would drop every label-hiding rule; an `icon` rail that started reporting
   * `data-float` would detach the editor panel nobody asked to detach.
   */
  it('leaves collapsible="icon" untouched by the float variant', () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar collapsible="icon" data-testid="icon" />
        <Sidebar collapsible="float" side="right" data-testid="float" />
      </SidebarProvider>,
    );
    const shell = (id: string) =>
      screen.getByTestId(id).closest('[data-slot="sidebar"]')!;

    expect(shell('icon')).not.toHaveAttribute('data-float');
    expect(shell('icon')).toHaveAttribute('data-collapsible', 'icon');

    // The float reports itself *as* an icon rail, which is what keeps the
    // dozen existing `group-data-[collapsible=icon]` rules working for it.
    expect(shell('float')).toHaveAttribute('data-float');
    expect(shell('float')).toHaveAttribute('data-collapsible', 'icon');
  });
});

describe('SidebarInset', () => {
  /**
   * `insetRight` must NOT be peer-gated: the sidebar it pairs with is a
   * following sibling, which no CSS sibling selector can reach. Asserting the
   * unprefixed classes guards against someone "tidying" it back into a
   * `peer-data-*` rule that would silently never match.
   */
  it('adds an unconditional right-hand card treatment only when asked', () => {
    const { rerender } = render(
      <SidebarProvider>
        <Sidebar variant="inset" />
        <SidebarInset data-testid="inset" />
      </SidebarProvider>,
    );
    expect(screen.getByTestId('inset').className).not.toContain('md:mr-0');

    rerender(
      <SidebarProvider>
        <Sidebar variant="inset" />
        <SidebarInset insetRight data-testid="inset" />
      </SidebarProvider>,
    );
    const className = screen.getByTestId('inset').className;
    expect(className).toContain('md:mr-0');
    expect(className).toContain('md:rounded-md');
    expect(className).not.toContain('peer-data-[variant=inset]:mr-0');
  });
});
