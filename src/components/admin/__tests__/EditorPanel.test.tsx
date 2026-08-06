import { render, screen } from '@testing-library/react';
import { useEditorPanel, EditorPanelProvider, EditorPanelContent } from '../EditorPanel';

/** Mounts a host div and surfaces the panel state for assertions. */
function Harness({ children }: { children: React.ReactNode }) {
  return (
    <EditorPanelProvider>
      <Host />
      {children}
    </EditorPanelProvider>
  );
}

function Host() {
  const panel = useEditorPanel();
  if (!panel) return null;
  return (
    <div>
      <div data-testid="host" ref={panel.setHost} />
      <span data-testid="count">{panel.count}</span>
      <span data-testid="title">{panel.title ?? '—'}</span>
      <span data-testid="open">{String(panel.open)}</span>
    </div>
  );
}

describe('EditorPanelContent', () => {
  it('portals its children into the host', () => {
    render(
      <Harness>
        <EditorPanelContent>
          <p>Panel body</p>
        </EditorPanelContent>
      </Harness>,
    );
    const host = screen.getByTestId('host');
    expect(host).toContainElement(screen.getByText('Panel body'));
  });

  /**
   * The signed-out layout renders no shell. Content must degrade to rendering
   * in place — dropping it would silently cost the page its form.
   */
  it('renders in place when there is no provider', () => {
    render(
      <EditorPanelContent>
        <p>Panel body</p>
      </EditorPanelContent>,
    );
    expect(screen.getByText('Panel body')).toBeInTheDocument();
  });

  it('registers while mounted and deregisters on unmount', () => {
    const { rerender } = render(
      <Harness>
        <EditorPanelContent>
          <p>Body</p>
        </EditorPanelContent>
      </Harness>,
    );
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    rerender(<Harness>{null}</Harness>);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('publishes its title and clears it on unmount', () => {
    const { rerender } = render(
      <Harness>
        <EditorPanelContent title="New invoice">
          <p>Body</p>
        </EditorPanelContent>
      </Harness>,
    );
    expect(screen.getByTestId('title')).toHaveTextContent('New invoice');

    rerender(<Harness>{null}</Harness>);
    expect(screen.getByTestId('title')).toHaveTextContent('—');
  });

  it('opens the rail on mount only when autoOpen is set', () => {
    const { unmount } = render(
      <Harness>
        <EditorPanelContent>
          <p>Body</p>
        </EditorPanelContent>
      </Harness>,
    );
    expect(screen.getByTestId('open')).toHaveTextContent('false');
    unmount();

    render(
      <Harness>
        <EditorPanelContent autoOpen>
          <p>Body</p>
        </EditorPanelContent>
      </Harness>,
    );
    expect(screen.getByTestId('open')).toHaveTextContent('true');
  });
});
