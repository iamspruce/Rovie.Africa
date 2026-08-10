import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Logo } from '../Logo/Logo';
import {
  HORIZONTAL_VIEWBOX,
  MARK_PATHS,
  MARK_VIEWBOX,
  WORDMARK_PATH,
} from '../../assets/logo.generated';

function svgIn(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('no <svg> rendered');
  return svg as SVGSVGElement;
}

describe('Logo', () => {
  // The whole reason the artwork is inlined instead of loaded as an <img>. If
  // a hex ever creeps back in, the logo stops following the theme and one of
  // the two colour schemes gets an invisible or clashing mark - which is
  // exactly the failure the "-inverted" brand files exist to work around, and
  // which this app avoids by never using them.
  it('draws itself in currentColor and nothing else', () => {
    const { container } = render(<Logo variant="horizontal" />);
    const markup = svgIn(container).outerHTML;

    expect(markup).toContain('currentColor');
    expect(markup).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(markup).not.toMatch(/\b(?:rgb|hsl)a?\(/i);
  });

  it('renders the mark alone, without the wordmark', () => {
    const { container } = render(<Logo variant="mark" />);
    const svg = svgIn(container);

    expect(svg.getAttribute('viewBox')).toBe(MARK_VIEWBOX);
    expect(svg.querySelectorAll('path')).toHaveLength(MARK_PATHS.length);
    expect(svg.outerHTML).not.toContain(WORDMARK_PATH);
  });

  it('renders the mark plus the wordmark in the horizontal lockup', () => {
    const { container } = render(<Logo variant="horizontal" />);
    const svg = svgIn(container);

    expect(svg.getAttribute('viewBox')).toBe(HORIZONTAL_VIEWBOX);
    expect(svg.querySelectorAll('path')).toHaveLength(MARK_PATHS.length + 1);
  });

  // The two lockups are very different shapes, so a caller asking for a height
  // must not get a square. Width is derived from the lockup's own viewBox.
  it('derives width from the lockup aspect ratio', () => {
    const [, , markW, markH] = MARK_VIEWBOX.split(/\s+/).map(Number);
    const [, , wideW, wideH] = HORIZONTAL_VIEWBOX.split(/\s+/).map(Number);

    const mark = render(<Logo variant="mark" height={100} />);
    expect(svgIn(mark.container).getAttribute('width')).toBe(String(Math.round(100 * (markW / markH))));

    const wide = render(<Logo variant="horizontal" height={100} />);
    expect(svgIn(wide.container).getAttribute('width')).toBe(String(Math.round(100 * (wideW / wideH))));
  });

  // It almost always sits inside a link that already has an accessible name,
  // so announcing "Rovie" again would make every header read the brand twice.
  it('is decorative unless given a title', () => {
    const { container } = render(<Logo />);
    expect(svgIn(container).getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('title')).toBeNull();
  });

  it('becomes an image with a name when given a title', () => {
    const { container, getByTitle } = render(<Logo title="Rovie" />);
    expect(svgIn(container).getAttribute('role')).toBe('img');
    expect(svgIn(container).getAttribute('aria-hidden')).toBeNull();
    expect(getByTitle('Rovie')).toBeInTheDocument();
  });
});
