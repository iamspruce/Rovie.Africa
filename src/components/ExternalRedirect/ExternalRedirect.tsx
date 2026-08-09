import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// -----------------------------------------------------------------------
// Sends the browser to another origin, for a path this app no longer serves.
//
// Used by the three routes that moved to docs.rovie.africa. It is a FALLBACK,
// not the mechanism: public/_redirects gives the host a real 301 for each of
// them, which is what search engines need and what keeps the old URLs' ranking
// pointed at the new pages. A client-side redirect is a 200 with a hop in it,
// and Google treats it far less kindly.
//
// This exists for the cases the host redirect does not cover - a deploy target
// that ignores _redirects, a local `vite preview`, or an in-app navigation that
// somehow reaches one of these paths. Better a working link than a 404 while
// the hosting is being set up.
// -----------------------------------------------------------------------

interface ExternalRedirectProps {
  /** Absolute origin to send the visitor to, without a trailing slash. */
  to: string;
  /**
   * When true the incoming pathname is appended, so /docs/quickstart lands on
   * <to>/quickstart rather than on the front page. Off for paths whose
   * structure did not survive the move.
   */
  preservePath?: boolean;
}

export function ExternalRedirect({ to, preservePath = false }: ExternalRedirectProps) {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const target = preservePath ? `${to}${pathname}${search}` : to;
    // replace(), not assign(): the page being left does not exist, so leaving
    // it in history means Back lands the visitor right back on the redirect.
    window.location.replace(target);
  }, [to, preservePath, pathname, search]);

  // Deliberately blank. The redirect fires on the first effect, so anything
  // rendered here is a flash of content nobody is meant to read - and a
  // "Redirecting…" message that appears for 40ms reads as a fault.
  return null;
}
