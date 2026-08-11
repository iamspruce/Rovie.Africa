// -----------------------------------------------------------------------
// Every page's title, description and index status, in one list.
//
// Three things read this file and they must never disagree:
//   1. <Seo> in the app, which writes the tags into <head> at runtime;
//   2. the build plugin, which stamps the same tags into a static HTML file
//      per route - the only copy a social-card crawler will ever see, since
//      none of them run JavaScript;
//   3. the same plugin's sitemap.xml.
//
// A route missing from here is a route that ships with the homepage's title
// on it, so `seo.test.ts` asserts the router and this list stay in step.
// -----------------------------------------------------------------------

export const SITE_URL = 'https://rovie.africa';
export const SITE_NAME = 'Rovie';
export const SITE_LOCALE = 'en_US';

// 1200x630. Referenced absolutely in the tags because Slack, WhatsApp, X and
// LinkedIn all reject a relative og:image.
export const OG_IMAGE_PATH = '/favicons/og-image.png';

// Empty until the accounts exist - same rule the footer's SOCIAL_LINKS follow.
// An empty string renders no tag rather than a tag pointing at nobody.
export const TWITTER_HANDLE = '';

export interface RouteSeo {
  /** Router path, exactly as the route declares it. */
  path: string;
  /** The <title>, without the site suffix. The homepage supplies its own whole title. */
  title: string;
  /**
   * The SERP snippet and the social card's body text. Aim for 140-160
   * characters: under ~120 Google pads it with page text, over ~160 it
   * truncates mid-sentence.
   */
  description: string;
  /**
   * Kept out of the index, out of the sitemap, and out of the prerender. For
   * pages that are private, transactional, or have nothing on them yet.
   */
  noindex?: boolean;
}

// The homepage's title stands alone - "Rovie · Rovie" helps nobody.
const HOME_TITLE = 'Rovie — the AI layer for Africa';
const TITLE_SUFFIX = ' · Rovie';

export const ROUTE_SEO: readonly RouteSeo[] = [
  {
    path: '/',
    title: HOME_TITLE,
    description:
      'One account and one API key for GPT, Claude, Gemini, Llama and every leading AI model — priced in your own currency, paid for the way Africa pays.',
  },
  {
    path: '/models',
    title: 'AI model pricing in your currency',
    description:
      'Every model a Rovie API key reaches, priced per million tokens and converted live from USD into your own currency. Cheapest first, updated as rates move.',
  },
  {
    path: '/rankings',
    title: 'What Africa is building with',
    description:
      'Measured usage across the Rovie API: which AI models African developers actually run, and how that shifts month to month. Aggregated, never per-account.',
  },
  {
    path: '/status',
    title: 'Service status',
    description:
      'Live health of the Rovie gateway, accounts and payments. Every check runs against the same services your API key does, so this page fails when your calls would.',
  },
  {
    path: '/support',
    title: 'Getting help',
    description:
      'Where to take a billing question, a failing request or a misbehaving model — plus answers to the things people ask most about keys, balances and pricing.',
  },

  // ------------------------------------------------------------ developers
  //
  // Nothing here. Documentation, the API reference and the SDK guide are on
  // docs.rovie.africa now - a separate Astro site, built from docs/ in this
  // repository, with its own titles, its own sitemap and its own llms.txt.
  // /docs, /api-reference and /sdk survive only as 301s (public/_redirects),
  // and a redirect never renders, so it needs no entry.

  // -------------------------------------------------------------- company

  {
    path: '/about',
    title: 'Why Rovie exists',
    description:
      'Frontier AI is priced in dollars and billed to a card, which rules out most of a continent. What we built instead, how we make money, and what we will not do.',
  },
  {
    path: '/privacy',
    title: 'Privacy',
    description:
      'What Rovie collects about you, why we collect it, how long we keep it, who else ever sees it, and what you can ask us to do with it.',
  },
  {
    path: '/data-policy',
    title: 'Data policy',
    description:
      'What happens to the prompts and completions passing through the Rovie gateway, what the model providers receive, and what we retain.',
  },
  {
    path: '/terms',
    title: 'Terms of service',
    description:
      'The agreement covering your Rovie account, your API key, your balance and your usage of the models we route to.',
  },

  // ----------------------------------------------------------------- auth
  //
  // Sign-up is indexable: it is a destination people search for by name and
  // the page makes a real offer. Sign-in is not - it is furniture, it competes
  // with the homepage for the brand query, and an indexed login page is a
  // phishing lure with our name on it.

  {
    path: '/signup',
    title: 'Create an account',
    description:
      'Open a Rovie account, get an API key, and call any frontier model with a balance topped up in your own currency. No card required to start.',
  },
  { path: '/signin', title: 'Sign in', description: 'Sign in to your Rovie account.', noindex: true },
  // Reached only from an emailed link, and useless without the token in its
  // query string. Listed so it gets its own title instead of falling through
  // to "Page not found", which is what an unlisted route would say.
  {
    path: '/reset-password',
    title: 'Set a new password',
    description: 'Set a new password for your Rovie account.',
    noindex: true,
  },

  // ------------------------------------------------------------ dashboard
  //
  // One entry covers the whole subtree - see seoForPath. None of it is
  // reachable without a session, so none of it should be crawled.

  {
    path: '/dashboard',
    title: 'Dashboard',
    description: 'Your Rovie usage, API keys, balance and account settings.',
    noindex: true,
  },
];

// What a route we have never heard of gets. Noindex matters more than the
// wording: the SPA serves the same 200 for every unknown path, so without this
// a typo'd URL is an indexable duplicate of the homepage.
export const NOT_FOUND_SEO: RouteSeo = {
  path: '*',
  title: 'Page not found',
  description: 'That page does not exist. The models, pricing and docs are all still where you left them.',
  noindex: true,
};

/** The full <title> for an entry, suffixed unless it already names the site. */
export function titleFor(seo: RouteSeo): string {
  return seo.title === HOME_TITLE ? seo.title : `${seo.title}${TITLE_SUFFIX}`;
}

/**
 * The absolute URL a page wants to be indexed under. Query strings and
 * trailing slashes are dropped: `/models?sort=price` and `/models/` are the
 * same page as `/models`, and telling search engines otherwise splits its
 * ranking three ways.
 */
export function canonicalFor(path: string): string {
  const clean = path.split('?')[0].split('#')[0].replace(/\/+$/, '');
  return `${SITE_URL}${clean || '/'}`;
}

export function seoForPath(pathname: string): RouteSeo {
  const clean = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

  const exact = ROUTE_SEO.find((entry) => entry.path === clean);
  if (exact) return exact;

  // /dashboard/usage, /dashboard/keys and the rest inherit the parent's entry
  // rather than each needing a line here - they are all noindex anyway.
  const parent = ROUTE_SEO.find(
    (entry) => entry.path !== '/' && clean.startsWith(`${entry.path}/`)
  );
  if (parent) return parent;

  return NOT_FOUND_SEO;
}

/** Everything that belongs in the sitemap and gets a prerendered HTML file. */
export const INDEXABLE_ROUTES: readonly RouteSeo[] = ROUTE_SEO.filter((entry) => !entry.noindex);
