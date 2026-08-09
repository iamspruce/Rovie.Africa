import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ExternalRedirect } from '../ExternalRedirect/ExternalRedirect';

const replace = vi.fn();
const assign = vi.fn();

beforeEach(() => {
  replace.mockClear();
  assign.mockClear();
  // jsdom refuses a real cross-origin navigation ("Not implemented:
  // navigation to another Document"), so the one call this component makes is
  // stubbed and asserted on directly. assign is stubbed alongside it so the
  // test below can prove it is the one NOT used.
  vi.stubGlobal('location', { ...window.location, replace, assign });
});

function renderAt(path: string, element: React.ReactNode, routePattern: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePattern} element={element} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ExternalRedirect', () => {
  it('sends the browser to the target', () => {
    renderAt('/api-reference', <ExternalRedirect to="https://docs.rovie.africa/api/" />, '/api-reference');

    expect(replace).toHaveBeenCalledWith('https://docs.rovie.africa/api/');
  });

  // replace(), not assign(): the page being left no longer exists, so leaving
  // it in history means Back lands the visitor straight back on the redirect
  // and bounces them forward again.
  it('replaces the entry rather than pushing one', () => {
    renderAt('/sdk', <ExternalRedirect to="https://docs.rovie.africa/sdks/overview/" />, '/sdk');

    expect(replace).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
  });

  // /docs/quickstart has a real counterpart at the same slug. Dropping the
  // path would throw away the specificity a bookmark or an inbound link
  // already had, and land everyone on the front page.
  it('carries the path over when asked to', () => {
    renderAt('/docs/streaming', <ExternalRedirect to="https://docs.rovie.africa" preservePath />, '/docs/*');

    expect(replace).toHaveBeenCalledWith('https://docs.rovie.africa/docs/streaming');
  });

  it('carries the query string with it', () => {
    renderAt(
      '/docs/streaming?utm_source=x',
      <ExternalRedirect to="https://docs.rovie.africa" preservePath />,
      '/docs/*'
    );

    expect(replace).toHaveBeenCalledWith('https://docs.rovie.africa/docs/streaming?utm_source=x');
  });

  // Anything rendered here is a flash of content nobody is meant to read, and
  // a "Redirecting…" that shows for 40ms reads as a fault.
  it('renders nothing while it goes', () => {
    const { container } = renderAt('/sdk', <ExternalRedirect to="https://docs.rovie.africa/" />, '/sdk');

    expect(container).toBeEmptyDOMElement();
  });
});
