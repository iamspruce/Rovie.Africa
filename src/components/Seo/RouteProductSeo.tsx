import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { canonicalFor, seoForPath, SITE_NAME, SITE_URL, titleFor } from '../../content/routeSeo';

function setMeta(name: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}

/** Metadata for the standalone Route product, not the Rovie company site. */
export function RouteProductSeo(): null {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const seo = seoForPath(pathname);
    document.title = titleFor(seo);
    setMeta('description', seo.description);
    setMeta('robots', seo.noindex ? 'noindex, follow' : 'index, follow');
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalFor(pathname);
    setMeta('application-name', SITE_NAME);
    document.documentElement.dataset.siteOrigin = SITE_URL;
  }, [pathname]);

  return null;
}
