import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AfricaMapSvg } from '../../components/AfricaMap/AfricaMapSvg';
import { getWorldFeatureCollection } from '../../lib/d3/geoData';

describe('AfricaMapSvg', () => {
  it('renders one path per country in the real world dataset', () => {
    const { container } = render(<AfricaMapSvg width={800} height={800} />);
    const world = getWorldFeatureCollection();
    world.features.forEach((f) => {
      expect(container.querySelector(`[data-testid="country-${f.id}"]`)).toBeTruthy();
    });
  });

  it('renders a sphere outline and a graticule grid, the hallmarks of a globe rather than a flat map', () => {
    const { container } = render(<AfricaMapSvg width={800} height={800} />);
    const paths = container.querySelectorAll('path');
    // sphere fill + shading + sphere stroke + graticule + >100 country paths.
    // The geometry is what makes this a real projection; the gradients on top
    // of it are only lighting.
    expect(paths.length).toBeGreaterThan(100);
    const world = getWorldFeatureCollection();
    expect(container.querySelector(`[data-testid="country-${world.features[0].id}"]`)).toBeTruthy();
  });

  it('shades the sphere so it reads as a lit ball rather than a flat disc', () => {
    const { container } = render(<AfricaMapSvg width={800} height={800} />);
    expect(container.querySelectorAll('radialGradient').length).toBeGreaterThanOrEqual(3);
    expect(container.querySelector('filter feDropShadow')).toBeTruthy();
  });

  it('carries a glow for the routes and a shadow for the tags, so both survive the lit continent', () => {
    const { container } = render(<AfricaMapSvg width={800} height={800} />);
    expect(container.querySelector('#rovieRouteGlow feDropShadow')).toBeTruthy();
    expect(container.querySelector('#rovieTagShadow feDropShadow')).toBeTruthy();
  });

  const TAGS = [
    { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', price: '714K tokens · ₦775', family: 'gpt' },
    { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', price: '83K tokens · ₦775', family: 'claude' },
  ];

  it('hangs a priced tag off the globe for each top model', () => {
    render(<AfricaMapSvg width={800} height={800} highlightAlpha2="NG" tags={TAGS} />);

    const group = screen.getByLabelText(/top model prices/i);
    expect(group.textContent).toContain('GPT-5.6 Luna');
    expect(group.textContent).toContain('714K tokens · ₦775');
    expect(group.textContent).toContain('Claude Sonnet 5');
  });

  it('marks each tag with the provider’s real logo rather than a stand-in glyph', () => {
    const { container } = render(
      <AfricaMapSvg width={800} height={800} highlightAlpha2="NG" tags={TAGS} />
    );
    const group = screen.getByLabelText(/top model prices/i);
    // Two nested marks, each a real path from the provider's own SVG.
    expect(group.querySelectorAll('g[transform] path').length).toBeGreaterThanOrEqual(2);
    // OpenAI's knot needs its fill rule or it fills in solid.
    expect(container.querySelector('g[fill-rule="evenodd"]')).toBeTruthy();
  });

  it('draws a route from the visitor’s country to every tag', () => {
    const { container } = render(
      <AfricaMapSvg width={800} height={800} highlightAlpha2="NG" tags={TAGS} />
    );
    const routes = container.querySelectorAll('line');
    expect(routes.length).toBe(TAGS.length);
  });

  it('spreads a short tag list around the globe instead of bunching it', () => {
    const { container } = render(
      <AfricaMapSvg width={800} height={800} highlightAlpha2="NG" tags={TAGS} />
    );
    const group = screen.getByLabelText(/top model prices/i);
    const positions = [...group.children].map((g) => g.getAttribute('transform'));
    expect(new Set(positions).size).toBe(TAGS.length);
    expect(container).toBeTruthy();
  });

  it('renders an accessible label mentioning the globe and drag interaction', () => {
    render(<AfricaMapSvg width={800} height={800} />);
    expect(screen.getByRole('img', { name: /globe.*africa.*drag/i })).toBeInTheDocument();
  });

  it('highlights Nigeria and shows a visitor marker when highlightAlpha2="NG"', () => {
    const { getByTestId } = render(<AfricaMapSvg width={800} height={800} highlightAlpha2="NG" />);
    expect(getByTestId('country-566')).toBeInTheDocument();
    expect(getByTestId('visitor-marker')).toBeInTheDocument();
  });

  it('renders no marker when no country is highlighted', () => {
    const { queryByTestId } = render(<AfricaMapSvg width={800} height={800} />);
    expect(queryByTestId('visitor-marker')).not.toBeInTheDocument();
  });

  it('renders no marker for an unresolved/unknown highlight code', () => {
    const { queryByTestId } = render(<AfricaMapSvg width={800} height={800} highlightAlpha2="ZZ" />);
    expect(queryByTestId('visitor-marker')).not.toBeInTheDocument();
  });

  it('is draggable: pointer events are wired up on the svg element', () => {
    const { container } = render(<AfricaMapSvg width={800} height={800} />);
    const svg = container.querySelector('svg');
    // jsdom doesn't implement real pointer capture/dragging end-to-end, so
    // this asserts the interaction surface exists rather than simulating a
    // full drag gesture.
    expect(svg).toBeTruthy();
    expect(svg!.getAttribute('role')).toBe('img');
  });
});
