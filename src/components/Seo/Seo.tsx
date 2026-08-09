import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  OG_IMAGE_PATH,
  SITE_LOCALE,
  SITE_NAME,
  SITE_URL,
  TWITTER_HANDLE,
  canonicalFor,
  seoForPath,
  titleFor,
} from '../../content/seo';

// -----------------------------------------------------------------------
// Head tags, kept in step with the route.
//
// These are UPDATED IN PLACE rather than appended. index.html ships a title,
// a description and a full set of og:/twitter: tags - the build stamps the
// right ones into each route's HTML file, because no social crawler runs our
// JavaScript - and a page that appended its own would leave two of each in
// the head. Browsers honour the first <title> they find, so appending would
// mean the homepage's title on every route.
//
// Which is also why this is one component mounted once in the app shell,
// driven by the pathname, rather than something each page renders for itself.
// -----------------------------------------------------------------------

function upsertMeta(attribute: 'name' | 'property', key: string, content: string): void {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function upsertLink(rel: string, href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

function applySeo(pathname: string): void {
  const seo = seoForPath(pathname);
  const title = titleFor(seo);
  const canonical = canonicalFor(pathname);
  const image = `${SITE_URL}${OG_IMAGE_PATH}`;

  document.title = title;

  upsertMeta('name', 'description', seo.description);
  // "follow" even on the pages we keep out of the index: don't rank this, but
  // do go and find what it links to.
  upsertMeta('name', 'robots', seo.noindex ? 'noindex, follow' : 'index, follow');
  upsertLink('canonical', canonical);

  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:site_name', SITE_NAME);
  upsertMeta('property', 'og:locale', SITE_LOCALE);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', seo.description);
  upsertMeta('property', 'og:url', canonical);
  upsertMeta('property', 'og:image', image);

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', seo.description);
  upsertMeta('name', 'twitter:image', image);
  if (TWITTER_HANDLE) upsertMeta('name', 'twitter:site', TWITTER_HANDLE);
}

/**
 * Mounted once, above the route tree, so every destination is covered -
 * including the ones that draw their own chrome and never render the site
 * header.
 */
export function RouteSeo(): null {
  const { pathname } = useLocation();

  // Layout effect rather than effect: the title should change in the same
  // frame the page does, not one paint later.
  useLayoutEffect(() => {
    applySeo(pathname);
  }, [pathname]);

  return null;
}
