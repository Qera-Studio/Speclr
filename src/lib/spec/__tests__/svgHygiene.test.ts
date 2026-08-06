import { analyzeSvg } from '../svgHygiene';
import { ICON_SPECS } from '../iconSpecData';

const spec = (id: string) => ICON_SPECS.find((s) => s.id === id)!;
const kinds = (svg: string, id: string) => analyzeSvg(svg, spec(id)).map((w) => w.kind);

const CLEAN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 1h22v22H1z" fill="#123456"/></svg>';

describe('analyzeSvg', () => {
  it('returns no warnings for a clean single-color SVG with a viewBox', () => {
    expect(analyzeSvg(CLEAN, spec('svg-favicon'))).toEqual([]);
  });

  it('warns when the SVG has no viewBox', () => {
    const noViewBox = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1H0z" fill="#000"/></svg>';
    expect(kinds(noViewBox, 'svg-favicon')).toContain('svg-viewbox');
  });

  it('warns when the SVG embeds a raster <image>', () => {
    const withRaster =
      '<svg viewBox="0 0 24 24"><image href="data:image/png;base64,AAAA" width="24" height="24"/></svg>';
    expect(kinds(withRaster, 'svg-favicon')).toContain('svg-raster');
  });

  it('warns on external references via a modern href to a remote url', () => {
    const external = '<svg viewBox="0 0 24 24"><use href="https://evil.example/x.svg#a"/></svg>';
    expect(kinds(external, 'svg-favicon')).toContain('svg-external-ref');
  });

  it('warns on external references via a namespaced xlink:href', () => {
    const external =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><use xlink:href="https://evil.example/x.svg#a"/></svg>';
    expect(kinds(external, 'svg-favicon')).toContain('svg-external-ref');
  });

  it('warns when a Safari pinned-tab SVG uses more than one color', () => {
    const multicolor =
      '<svg viewBox="0 0 24 24"><path d="M0 0h12v24H0z" fill="#ff0000"/><path d="M12 0h12v24H12z" fill="#00ff00"/></svg>';
    expect(kinds(multicolor, 'safari-pinned-tab')).toContain('svg-monochrome');
  });

  it('does NOT apply the monochrome rule to a normal SVG favicon', () => {
    const multicolor =
      '<svg viewBox="0 0 24 24"><path fill="#ff0000" d="M0 0h1v1z"/><path fill="#00ff00" d="M1 1h1v1z"/></svg>';
    expect(kinds(multicolor, 'svg-favicon')).not.toContain('svg-monochrome');
  });

  it('returns no warnings when the text cannot be parsed as SVG (leave format check to handle it)', () => {
    expect(analyzeSvg('not svg at all', spec('svg-favicon'))).toEqual([]);
  });
});
