import { describe, it, expect } from 'vitest';
import {
  INDEXABLE_ROUTES,
  NOT_FOUND_SEO,
  ROUTE_SEO,
  SITE_URL,
  canonicalFor,
  seoForPath,
  titleFor,
} from '../seo';
import { PLACEHOLDER_PAGES } from '../placeholderPages';
import { PRIMARY_NAV, DEVELOPER_NAV } from '../navLinks';
import { COMPANY_LINKS } from '../siteLinks';
import { LEGAL_DOCS } from '../../pages/Legal/Legal';

// Every path the router serves in its own right. Redirects are deliberately
// absent: they never render, so they never need a title.
const ROUTED_PATHS = [
  '/',
  '/models',
  '/rankings',
  '/status',
  '/support',
  '/about',
  '/signin',
  '/signup',
  '/reset-password',
  '/dashboard',
  '/dashboard/usage',
  '/dashboard/keys',
  '/dashboard/billing',
  '/dashboard/account',
  ...LEGAL_DOCS.map((doc) => doc.path),
  ...PLACEHOLDER_PAGES.map((page) => page.path),
];

describe('route metadata', () => {
  // The failure this exists to catch: a route ships, nobody adds it here, and
  // it goes out with the homepage's title and the homepage's canonical - which
  // tells Google the two pages are the same page.
  it.each(ROUTED_PATHS)('covers %s with its own entry', (path) => {
    expect(seoForPath(path)).not.toBe(NOT_FOUND_SEO);
  });

  // The other direction: an entry for a route that no longer exists puts a
  // dead URL in the sitemap and a prerendered file nothing serves.
  it('has no entry for a route the app does not serve', () => {
    const servedPrefixes = new Set(ROUTED_PATHS);
    ROUTE_SEO.forEach((entry) => {
      expect(servedPrefixes.has(entry.path)).toBe(true);
    });
  });

  it('gives an unknown path the not-found entry, kept out of the index', () => {
    expect(seoForPath('/not-a-page')).toBe(NOT_FOUND_SEO);
    expect(NOT_FOUND_SEO.noindex).toBe(true);
  });

  it('lets the dashboard subtree inherit its parent, all of it noindex', () => {
    expect(seoForPath('/dashboard/keys').path).toBe('/dashboard');
    expect(seoForPath('/dashboard/keys').noindex).toBe(true);
  });

  // Everything reachable from the header or the footer is a page we want
  // ranked. If one of them is noindex, either the link or the flag is wrong.
  //
  // Off-site destinations are excluded: three of the developer links point at
  // docs.rovie.africa, which has its own titles and its own sitemap. Asking
  // this app's SEO table about a URL it does not serve would only ever return
  // the not-found entry.
  it.each(
    [...PRIMARY_NAV, ...DEVELOPER_NAV, ...COMPANY_LINKS]
      .filter((link) => !link.external)
      .map((link) => link.to)
  )('keeps the linked destination %s indexable', (path) => {
    expect(seoForPath(path).noindex).toBeUndefined();
  });

  // The routes the docs used to occupy. They are redirects now - to the host
  // via public/_redirects, and client-side via routes/router.tsx - and a
  // redirect must not carry an SEO entry, or it ships a prerendered file and a
  // sitemap URL for a page that immediately sends the visitor elsewhere.
  it.each(['/docs', '/api-reference', '/sdk'])('has no entry for the retired %s', (path) => {
    expect(seoForPath(path)).toBe(NOT_FOUND_SEO);
  });
});

describe('titles and descriptions', () => {
  // Google renders roughly 60 characters of title and 160 of description.
  // Past that it truncates mid-word, and a snippet that ends in an ellipsis is
  // one the searcher has to guess the end of.
  it.each(ROUTE_SEO.map((entry) => [entry.path, entry] as const))(
    '%s fits in a search result',
    (_path, entry) => {
      expect(titleFor(entry).length).toBeLessThanOrEqual(60);
      expect(entry.description.length).toBeLessThanOrEqual(160);
    }
  );

  // Too short and Google ignores it, padding the snippet with whatever text it
  // scrapes off the page instead. Only enforced on pages we actually want
  // ranked - "Sign in to your Rovie account." is the whole truth about /signin.
  it.each(INDEXABLE_ROUTES.map((entry) => [entry.path, entry] as const))(
    '%s says enough to be used as the snippet',
    (_path, entry) => {
      expect(entry.description.length).toBeGreaterThanOrEqual(110);
    }
  );

  it('never repeats a title or a description', () => {
    const titles = ROUTE_SEO.map(titleFor);
    const descriptions = ROUTE_SEO.map((entry) => entry.description);

    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('suffixes every title except the homepage, which names the site already', () => {
    ROUTE_SEO.forEach((entry) => {
      const title = titleFor(entry);
      expect(title).toContain('Rovie');
      if (entry.path !== '/') expect(title.endsWith(' · Rovie')).toBe(true);
    });
  });
});

describe('canonical URLs', () => {
  it('is absolute, and one per page', () => {
    const canonicals = ROUTE_SEO.map((entry) => canonicalFor(entry.path));
    canonicals.forEach((url) => expect(url.startsWith(`${SITE_URL}/`)).toBe(true));
    expect(new Set(canonicals).size).toBe(canonicals.length);
  });

  // A sorted catalog, a trailing slash and the bare path are one page. Left
  // alone they are three competing URLs sharing the ranking of one.
  it('collapses trailing slashes, query strings and fragments', () => {
    expect(canonicalFor('/models/')).toBe(`${SITE_URL}/models`);
    expect(canonicalFor('/models?sort=price')).toBe(`${SITE_URL}/models`);
    expect(canonicalFor('/models#pricing')).toBe(`${SITE_URL}/models`);
    expect(canonicalFor('/')).toBe(`${SITE_URL}/`);
  });

  it('resolves a path the same way however it is written', () => {
    expect(seoForPath('/models/')).toBe(seoForPath('/models'));
    expect(seoForPath('/models?sort=price')).toBe(seoForPath('/models'));
  });
});

describe('the sitemap set', () => {
  it('carries the public pages and nothing private', () => {
    const paths = INDEXABLE_ROUTES.map((entry) => entry.path);

    expect(paths).toContain('/');
    expect(paths).toContain('/models');
    expect(paths).toContain('/signup');
    expect(paths).not.toContain('/signin');
    expect(paths).not.toContain('/dashboard');
  });
});
