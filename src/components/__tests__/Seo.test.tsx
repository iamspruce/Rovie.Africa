import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { RouteSeo } from '../Seo/Seo';
import { canonicalFor, seoForPath, titleFor } from '../../content/seo';

function metaContent(selector: string): string | null {
  return document.head.querySelector(selector)?.getAttribute('content') ?? null;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RouteSeo />
      <Routes>
        <Route path="*" element={<Link to="/models">Models</Link>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RouteSeo', () => {
  // index.html ships one of each of these. The component's job is to rewrite
  // them, so the tests start from the same shape the real document has.
  beforeEach(() => {
    document.head.innerHTML = `
      <title>Rovie — the AI layer for Africa</title>
      <meta name="description" content="homepage" />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href="https://rovie.africa/" />
      <meta property="og:title" content="homepage" />
      <meta property="og:url" content="https://rovie.africa/" />
    `;
  });

  it('writes the route’s own title, description and canonical', () => {
    renderAt('/models');
    const seo = seoForPath('/models');

    expect(document.title).toBe(titleFor(seo));
    expect(metaContent('meta[name="description"]')).toBe(seo.description);
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      canonicalFor('/models')
    );
  });

  // The reason this component mutates instead of appending. Browsers honour
  // the FIRST <title> in the head, so a second one means every route silently
  // keeps the homepage's title - and two canonicals is worse than none.
  it('updates the tags in place rather than adding a second of each', () => {
    renderAt('/models');

    expect(document.head.querySelectorAll('title')).toHaveLength(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
  });

  it('follows a client-side navigation', async () => {
    renderAt('/');
    expect(document.title).toBe(titleFor(seoForPath('/')));

    await userEvent.click(document.querySelector('a')!);

    expect(document.title).toBe(titleFor(seoForPath('/models')));
    expect(document.head.querySelectorAll('title')).toHaveLength(1);
  });

  it('keeps the private pages out of the index, but still crawlable for links', () => {
    renderAt('/dashboard/keys');
    expect(metaContent('meta[name="robots"]')).toBe('noindex, follow');
  });

  it('marks an unknown path noindex so the SPA fallback is not a duplicate', () => {
    renderAt('/not-a-real-page');
    expect(metaContent('meta[name="robots"]')).toBe('noindex, follow');
  });

  it('fills the social card, image included', () => {
    renderAt('/models');
    const seo = seoForPath('/models');

    expect(metaContent('meta[property="og:title"]')).toBe(titleFor(seo));
    expect(metaContent('meta[property="og:url"]')).toBe(canonicalFor('/models'));
    expect(metaContent('meta[property="og:image"]')).toMatch(/^https:\/\/rovie\.africa\/og\.png$/);
    expect(metaContent('meta[name="twitter:card"]')).toBe('summary_large_image');
  });
});
