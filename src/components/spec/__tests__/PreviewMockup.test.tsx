import { render, screen } from '@testing-library/react';
import PreviewMockup from '../PreviewMockups/PreviewMockup';

describe('PreviewMockup dispatcher', () => {
  it('renders nothing for kind "none"', () => {
    const { container } = render(<PreviewMockup kind="none" imageUrl="blob:x" alt="x" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the uploaded favicon inside a browser-tab mockup', () => {
    const { container } = render(<PreviewMockup kind="browserTab" imageUrl="blob:x" alt="my favicon" />);
    // The whole mockup carries the accessible label…
    expect(screen.getByRole('img', { name: /my favicon shown in a browser tab/i })).toBeInTheDocument();
    // …and the uploaded asset is the SVG <image> href.
    const image = container.querySelector('image');
    expect(image).toHaveAttribute('href', 'blob:x');
  });

  it('uses the client/project name as the browser-tab title, falling back to a placeholder', () => {
    const { rerender } = render(<PreviewMockup kind="browserTab" imageUrl="blob:x" alt="x" brandName="Qera Studio" />);
    expect(screen.getByText('Qera Studio')).toBeInTheDocument();

    rerender(<PreviewMockup kind="browserTab" imageUrl="blob:x" alt="x" />);
    expect(screen.getByText('Sample Brand')).toBeInTheDocument();
  });

  it('renders a bookmarks-bar mockup with the client name and uploaded favicon', () => {
    render(<PreviewMockup kind="bookmarksBar" imageUrl="blob:bm" alt="ico favicon" brandName="Qera Studio" />);
    expect(screen.getByText('Qera Studio')).toBeInTheDocument();
    expect(screen.getByAltText('ico favicon')).toHaveAttribute('src', 'blob:bm');
  });

  it('renders the bookmarks-bar template with no favicon before upload', () => {
    render(<PreviewMockup kind="bookmarksBar" alt="x" brandName="Qera Studio" />);
    expect(screen.getByText('Qera Studio')).toBeInTheDocument();
    expect(screen.queryByAltText('x')).not.toBeInTheDocument();
  });

  it('scales the bookmarks bar up from a fixed width so it overflows the card', () => {
    // The bar is drawn at a fixed natural width then transform-scaled, so the
    // strip runs past the card and meets the same left/right fade as the browser
    // tab. A percentage width would re-fit the container and never overflow.
    // The exact factor is a visual tuning knob; what matters is fixed width +
    // scale > 1, so assert that rather than pinning a number.
    const { container } = render(<PreviewMockup kind="bookmarksBar" alt="x" brandName="Qera Studio" />);
    const scaled = container.querySelector('[data-testid="bookmarks-bar-scale"]');

    expect(scaled?.className).toMatch(/w-\[\d+px\]/);

    const scaleClass = scaled?.className.match(/scale-\[([\d.]+)\]/);
    expect(scaleClass).not.toBeNull();
    expect(Number(scaleClass![1])).toBeGreaterThan(1);
  });

  it('flanks the active bookmark with neighbours on both sides', () => {
    // origin-center scales around the strip's midpoint, so the active bookmark
    // has to sit at that midpoint. With neighbours only trailing it, it lands at
    // the far left and the scale pushes it out of the card — which regressed
    // once and showed only a sliver of the label.
    const { container } = render(<PreviewMockup kind="bookmarksBar" alt="x" brandName="Qera Studio" />);
    const strip = container.querySelector('[data-testid="bookmarks-bar-scale"] > div');
    const children = Array.from(strip?.children ?? []);
    const activeIndex = children.findIndex((el) => el.textContent?.includes('Qera Studio'));

    expect(activeIndex).toBeGreaterThan(0); // something leads it
    expect(activeIndex).toBeLessThan(children.length - 1); // and something trails it
  });

  it('does not clip the bookmarks bar itself — the card owns the fade', () => {
    // Clipping inside the mockup would cut the strip to its *unscaled* box and
    // hide almost all of it. This regressed once; keep it pinned.
    const { container } = render(<PreviewMockup kind="bookmarksBar" alt="x" brandName="Qera Studio" />);
    const scaled = container.querySelector('[data-testid="bookmarks-bar-scale"]');
    expect(scaled?.parentElement?.className).not.toMatch(/overflow-hidden/);
  });

  it('renders the uploaded icon in the iOS home-screen slot', () => {
    const { container } = render(
      <PreviewMockup kind="iosHomeScreen" imageUrl="blob:ios" alt="apple touch icon" brandName="Qera Studio" />,
    );
    expect(screen.getByRole('img', { name: /apple touch icon shown on an iOS home screen/i })).toBeInTheDocument();

    const hrefs = Array.from(container.querySelectorAll('image')).map((el) => el.getAttribute('href'));
    expect(hrefs).toContain('blob:ios');
  });

  it('renders the iOS home-screen template with an empty slot before upload', () => {
    const { container } = render(<PreviewMockup kind="iosHomeScreen" alt="x" brandName="Qera Studio" />);
    // Neighbour apps still render; only the uploaded icon is absent.
    const hrefs = Array.from(container.querySelectorAll('image')).map((el) => el.getAttribute('href'));
    expect(hrefs.some((h) => h?.includes('/app'))).toBe(true);
    expect(hrefs.some((h) => h?.startsWith('blob:'))).toBe(false);
  });

  it('keeps the Dynamic Island dark rather than inverting it in dark mode', () => {
    // It is a physical cutout, not themed chrome. Using fill-foreground made it
    // render pure white in dark mode.
    const { container } = render(<PreviewMockup kind="iosHomeScreen" alt="x" />);
    const island = Array.from(container.querySelectorAll('rect')).find((r) => r.getAttribute('rx') === '19');

    expect(island).toBeDefined();
    // A literal dark fill, not a theme token that flips with the colour scheme.
    expect(island?.getAttribute('class') ?? '').not.toMatch(/fill-foreground/);
    expect(island?.getAttribute('fill')).toMatch(/^#/);
  });

  it('leaves row 2 to the uploaded icon alone', () => {
    // The export shipped a placeholder tile beside the upload slot; that slot is
    // live now, so a second row-2 icon would be a duplicate.
    const { container } = render(<PreviewMockup kind="iosHomeScreen" alt="x" />);
    const rowTwo = Array.from(container.querySelectorAll('image')).filter(
      (el) => el.getAttribute('y') === '284.069',
    );
    expect(rowTwo).toHaveLength(0);
  });

  it('draws the iOS device as theme-token vector, not a raster photo', () => {
    // The device frame must recolour with the theme like the browser-tab mockup.
    // The export baked steel rails into a JPEG, which stayed photographic silver
    // in dark mode; only the app icons may remain raster.
    const { container } = render(<PreviewMockup kind="iosHomeScreen" alt="x" />);

    const hrefs = Array.from(container.querySelectorAll('image')).map((el) => el.getAttribute('href') ?? '');
    expect(hrefs.every((h) => h.includes('/app'))).toBe(true);

    const themed = container.querySelectorAll('[class*="fill-muted"], [class*="fill-background"]');
    expect(themed.length).toBeGreaterThan(0);
  });

  it('fits the entire device frame inside the viewBox on every side', () => {
    // The device body spans x 134->565 and the side buttons protrude to x 131
    // and 568. Clipping any of that terminates the hardware flat and reads as a
    // broken render, which regressed repeatedly. The sides and top must sit
    // strictly inside the viewBox; the bottom is deliberately cropped and faded.
    const { container } = render(<PreviewMockup kind="iosHomeScreen" alt="x" />);
    const [minX, minY, width, height] = container
      .querySelector('svg')!
      .getAttribute('viewBox')!
      .split(/\s+/)
      .map(Number);

    expect(minX).toBeLessThan(131);
    expect(minX + width).toBeGreaterThan(568);
    expect(minY).toBeLessThan(79);
    // The app label under the uploaded icon must stay above the crop.
    expect(minY + height).toBeGreaterThan(284.069 + 63 + 13);
  });

  it('shows the client name as the iOS app label, truncating long names', () => {
    const { rerender } = render(<PreviewMockup kind="iosHomeScreen" alt="x" brandName="Qera" />);
    expect(screen.getByText('Qera')).toBeInTheDocument();

    // iOS truncates long app labels rather than letting them collide.
    rerender(<PreviewMockup kind="iosHomeScreen" alt="x" brandName="A Very Long Brand Name" />);
    expect(screen.getByText(/…$/)).toBeInTheDocument();
  });

  it('puts the uploaded icon in the first Safari pinned tab', () => {
    const { container } = render(
      <PreviewMockup kind="safariPinnedTab" imageUrl="blob:pin" alt="pinned tab icon" />,
    );
    expect(screen.getByRole('img', { name: /pinned tab icon shown as a Safari pinned tab/i })).toBeInTheDocument();

    const images = Array.from(container.querySelectorAll('image'));
    // The uploaded icon leads the row; the samples follow it.
    expect(images[0].getAttribute('href')).toBe('blob:pin');
  });

  it('keeps the sample pinned tabs alongside the uploaded one', () => {
    // A pinned tab is only judged in company — the samples show whether the
    // uploaded icon stays recognisable beside real sites' icons.
    const { container } = render(<PreviewMockup kind="safariPinnedTab" imageUrl="blob:pin" alt="x" />);
    const samples = Array.from(container.querySelectorAll('image')).filter((el) =>
      el.getAttribute('href')?.includes('/safari-pinned/'),
    );
    expect(samples).toHaveLength(10);
  });

  it('renders the pinned-tab template with an empty first pill before upload', () => {
    const { container } = render(<PreviewMockup kind="safariPinnedTab" alt="x" />);
    const hrefs = Array.from(container.querySelectorAll('image')).map((el) => el.getAttribute('href') ?? '');
    expect(hrefs.every((h) => h.includes('/safari-pinned/'))).toBe(true);
  });

  it('includes the toolbar row above the pinned tabs', () => {
    // The window chrome is part of the design: the sidebar toggle and chevron
    // sit above the tab row. Cropping to the tabs alone lost it.
    const { container } = render(<PreviewMockup kind="safariPinnedTab" alt="x" domain="qera.studio" />);
    const [, minY, , height] = container
      .querySelector('svg')!
      .getAttribute('viewBox')!
      .split(/\s+/)
      .map(Number);

    // The frame starts at the toolbar, not at the tab row (y=59.5).
    expect(minY).toBeLessThan(20);
    // …and still reaches past the bottom of the tabs.
    expect(minY + height).toBeGreaterThan(59.5 + 28);

    // No address bar: the URL belongs to the browser-tab mockup, not here.
    expect(screen.queryByText('qera.studio')).not.toBeInTheDocument();
  });

  it('left-aligns the sidebar icon with the first pinned tab', () => {
    // They sit in the same optical column. Hand-placed x values drifted apart.
    const { container } = render(<PreviewMockup kind="safariPinnedTab" alt="x" />);

    // The sidebar toggle is the only stroked rect in the toolbar (y=20).
    const sidebar = Array.from(container.querySelectorAll('rect')).find(
      (r) => r.getAttribute('y') === '20' && r.getAttribute('fill') === 'none',
    );
    // The first tab is the leading circle in the row.
    const firstTab = container.querySelector('circle');

    const sidebarX = Number(sidebar?.getAttribute('x'));
    const tabLeft = Number(firstTab?.getAttribute('cx')) - Number(firstTab?.getAttribute('r'));

    // Optically level: the icon is nudged a couple of screen px right of the
    // circle's bounding edge, but must not drift into a different column.
    expect(sidebarX).toBeGreaterThanOrEqual(tabLeft);
    expect(sidebarX - tabLeft).toBeLessThan(2);
  });

  it('draws pinned tabs as circles, not rounded rectangles', () => {
    // Safari pins tabs as circles; the export clips each icon with rx=14 on a
    // 28-tall rect. Using the background rect's rx=6 made them read as pills.
    const { container } = render(<PreviewMockup kind="safariPinnedTab" alt="x" />);
    const clipRect = container.querySelector('clipPath rect');
    const rx = Number(clipRect?.getAttribute('rx'));
    const h = Number(clipRect?.getAttribute('height'));

    expect(rx).toBeCloseTo(h / 2, 3);
  });

  it('starts the pinned-tab panel near the card centre, running off to the right', () => {
    // The frame begins left of the panel so its edge lands mid-card and the
    // uploaded tab sits near the middle; the row then overflows rightward.
    const { container } = render(<PreviewMockup kind="safariPinnedTab" alt="x" />);
    const [minX, , width] = container
      .querySelector('svg')!
      .getAttribute('viewBox')!
      .split(/\s+/)
      .map(Number);

    expect(minX).toBeLessThan(0);
    // The panel's left edge (x=0) falls in the middle third of the frame.
    const edgeFraction = (0 - minX) / width;
    expect(edgeFraction).toBeGreaterThan(0.25);
    expect(edgeFraction).toBeLessThan(0.5);
  });

  it('shows the entered domain in the browser-tab address bar', () => {
    // "Qera Studio" must not be slugged into "qerastudio.com" when a real
    // domain is supplied.
    render(
      <PreviewMockup kind="browserTab" imageUrl="blob:x" alt="x" brandName="Qera Studio" domain="qera.studio" />,
    );
    expect(screen.getByText('qera.studio')).toBeInTheDocument();
    expect(screen.queryByText('qerastudio.com')).not.toBeInTheDocument();
  });

  it('falls back to a slugged brand name in the address bar when no domain is set', () => {
    render(<PreviewMockup kind="browserTab" imageUrl="blob:x" alt="x" brandName="Acme Co" />);
    expect(screen.getByText('acmeco.com')).toBeInTheDocument();
  });

  it('shows the entered brand and domain in the serp result row', () => {
    // The capture's own first row is blanked to placeholders; these values are
    // drawn over it, so a static asset would leave the row frozen.
    render(<PreviewMockup kind="googleSerp" alt="x" brandName="Qera Studio" domain="qera.studio" />);
    // One per themed layer, and the brand appears twice per layer — as the site
    // name beside the favicon and again as the blue link title.
    expect(screen.getAllByText('Qera Studio')).toHaveLength(4);
    expect(screen.getAllByText('https://qera.studio')).toHaveLength(2);
  });

  it('places the uploaded favicon in the serp chip, clipped to a circle', () => {
    const { container } = render(<PreviewMockup kind="googleSerp" imageUrl="blob:y" alt="x" />);
    const icons = container.querySelectorAll('image[clip-path]');
    expect(icons).toHaveLength(2); // one per themed layer
    expect(icons[0]).toHaveAttribute('href', 'blob:y');
  });

  it('leaves the serp chip empty before upload', () => {
    const { container } = render(<PreviewMockup kind="googleSerp" alt="x" />);
    expect(container.querySelectorAll('image[clip-path]')).toHaveLength(0);
  });

  it('ships a light and a dark serp page, swapped by theme', () => {
    // A referenced <image> can't inherit theme tokens, so both captures render
    // as sibling layers and CSS reveals one. Losing either leaves a light page
    // in a dark card.
    const { container } = render(<PreviewMockup kind="googleSerp" alt="x" />);
    const pages = Array.from(container.querySelectorAll('image[href*="serp-page"]'));
    expect(pages.map((p) => p.getAttribute('href'))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('serp-page-light'),
        expect.stringContaining('serp-page-dark'),
      ]),
    );
    const layers = Array.from(container.querySelectorAll('g[class]')).map((g) => g.getAttribute('class'));
    expect(layers).toEqual(
      expect.arrayContaining([expect.stringContaining('dark:hidden'), expect.stringContaining('dark:block')]),
    );
  });

  it('shows the entered domain in the socialCard mockup', () => {
    render(<PreviewMockup kind="socialCard" imageUrl="blob:z" alt="x" domain="qera.studio" />);
    expect(screen.getByText('qera.studio')).toBeInTheDocument();
  });

  it('renders the square OG variant at 1:1, not the landscape crop', () => {
    // A 1200x1200 upload shown in the 1.91:1 frame gets letterboxed and reads as
    // broken when it is in fact correct — the square spec needs its own frame.
    const { container } = render(<PreviewMockup kind="socialCardSquare" imageUrl="blob:z" alt="x" />);
    expect(container.querySelector('.aspect-square')).toBeInTheDocument();
    expect(container.querySelector('.aspect-\\[1200\\/630\\]')).not.toBeInTheDocument();
  });
});

describe('PreviewMockup — Android launcher', () => {
  it('renders the "any" purpose icon unmasked, full-bleed in its tile', () => {
    render(<PreviewMockup kind="androidLauncher" imageUrl="blob:a" alt="Launcher icon" />);
    const icon = screen.getByRole('img', { name: /launcher icon/i });
    // The whole point of the any/maskable pair: "any" gets no OS shaping.
    expect(icon).not.toHaveAttribute('clip-path');
  });

  it('shows the brand name as the app label under the tile', () => {
    render(<PreviewMockup kind="androidLauncher" imageUrl="blob:a" alt="x" brandName="Qera Studio" />);
    expect(screen.getByText('Qera Studio')).toBeInTheDocument();
  });

  it('renders as a template before upload so the slot still reads', () => {
    render(<PreviewMockup kind="androidLauncher" alt="x" brandName="Qera Studio" />);
    expect(screen.getByText('Qera Studio')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /^x$/ })).not.toBeInTheDocument();
  });
});

describe('PreviewMockup — PWA install prompt', () => {
  it('shows the install sheet with the app name and origin', () => {
    render(
      <PreviewMockup kind="pwaInstall" imageUrl="blob:b" alt="x" brandName="Qera Studio" domain="qera.studio" />,
    );
    expect(screen.getByText('Qera Studio')).toBeInTheDocument();
    expect(screen.getByText('qera.studio')).toBeInTheDocument();
    expect(screen.getByText(/install/i)).toBeInTheDocument();
  });

  it('renders as a template before upload', () => {
    render(<PreviewMockup kind="pwaInstall" alt="x" brandName="Qera Studio" />);
    expect(screen.getByText('Qera Studio')).toBeInTheDocument();
  });
});
