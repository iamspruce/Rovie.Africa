// One source for the site's primary destinations. The header bar, the mobile
// menu and the footer's Product and Developers columns all read from here, so
// a route cannot be listed in one place and go missing from another - which is
// how /rankings ended up shipping with no link to it in the footer.
/**
 * Where the documentation lives.
 *
 * A separate site on its own ORIGIN, not a route in this app - see docs/ in
 * this repository. Every link to it is therefore an absolute URL and a real
 * navigation, which is why NavLink carries `external` at all: react-router's
 * <Link> would treat "https://docs.rovie.africa/" as a path and route to a
 * page called that.
 *
 * Environment-aware, on the same pattern as sdk/config.ts - in dev the docs
 * are the Astro dev server on its own port, not the deployed site. Hardcoding
 * the production URL meant clicking "Docs" while developing left the app
 * entirely, so a change to a guide could not be reached from the thing that
 * links to it.
 *
 * A subdomain of localhost cannot stand in for this. `docs.localhost:5173`
 * resolves to 127.0.0.1 and then hits whatever is listening on 5173 - the
 * app's own Vite server, which serves index.html for every path and has no
 * vhost routing. Different site, different port, always.
 *
 * Set VITE_DOCS_URL to override - point it at https://docs.rovie.africa if
 * you are not running the docs locally and would rather the links still work.
 */
export const DOCS_URL: string =
  import.meta.env.VITE_DOCS_URL ||
  (import.meta.env.PROD ? 'https://docs.rovie.africa' : 'http://localhost:4321');

/**
 * Rovie Route is a product in its own right, with its own signed-in surface.
 * The umbrella site links there as a real cross-origin navigation rather than
 * mounting Route's account and billing screens under rovie.africa.
 *
 * Set VITE_ROUTE_URL locally when a Route web app is running. Production is
 * deliberately explicit: authentication, account cookies, and dashboards
 * belong on route.rovie.africa.
 */
export const ROUTE_URL: string =
  import.meta.env.VITE_ROUTE_URL ||
  (import.meta.env.PROD ? 'https://route.rovie.africa' : 'http://localhost:5174');

export interface NavLink {
  /** An internal route, or an absolute URL when `external` is set. */
  to: string;
  /**
   * True when `to` leaves this app. The header, the mobile sheet and the
   * footer all render an <a> for these instead of a routed link.
   */
  external?: boolean;
  /** Short form, for the header bar and the mobile menu. */
  label: string;
  /** The fuller name, for the footer where there's room to say what a page is. */
  longLabel: string;
  /**
   * One line saying what you'd go there for. Shown in the header's Developers
   * panel and under each row in the mobile sheet - a menu of four routes
   * called Documentation, API reference, SDK and Status tells a first-time
   * visitor almost nothing about which one they want.
   */
  description?: string;
}

/** Rovie's product family, shared by the footer and mobile navigation. */
export const PRODUCT_NAV: readonly NavLink[] = [
  {
    to: ROUTE_URL,
    external: true,
    label: 'Route',
    longLabel: 'Rovie Route',
    description: 'One API for leading models, priced and paid for locally',
  },
  {
    to: '/code',
    label: 'Code',
    longLabel: 'Rovie Code',
    description: 'A focused workflow for AI coding agents',
  },
  {
    to: '/research',
    label: 'Research',
    longLabel: 'Rovie Research',
    description: 'Research for AI that serves Africa',
  },
];

/** Reading and company context, kept separate from product conversion. */
export const LEARN_NAV: readonly NavLink[] = [
  {
    to: '/about',
    label: 'About',
    longLabel: 'About Rovie',
    description: 'Why Rovie exists and the problem we are here to solve',
  },
  {
    to: '/research',
    label: 'Research',
    longLabel: 'Research approach',
    description: 'Our areas of inquiry and public body of work',
  },
  {
    to: '/rankings',
    label: 'Rankings',
    longLabel: 'What Africa is building with',
    description: 'Measured usage across Rovie Route',
  },
];

/** Everything someone needs to evaluate, begin, or return to Route. */
export const ROUTE_NAV: readonly NavLink[] = [
  {
    to: ROUTE_URL,
    external: true,
    label: 'Overview',
    longLabel: 'Rovie Route overview',
    description: 'One API for leading models, priced and paid for locally',
  },
  {
    to: `${ROUTE_URL}/models`,
    external: true,
    label: 'Models',
    longLabel: 'Models and pricing',
    description: 'The live catalog, capabilities, and local-currency prices',
  },
  {
    to: `${DOCS_URL}/start/quickstart/`,
    external: true,
    label: 'Docs',
    longLabel: 'Route documentation',
    description: 'Set up your key and make your first call',
  },
  {
    to: `${ROUTE_URL}/signin`,
    external: true,
    label: 'Sign in',
    longLabel: 'Sign in to Route',
    description: 'Open your Route dashboard',
  },
  {
    to: `${ROUTE_URL}/signup`,
    external: true,
    label: 'Start',
    longLabel: 'Create a Route account',
    description: 'Get an API key and start building',
  },
];

// Grouped behind one bar item rather than spent as four. Status is here and
// not in Company on purpose - the person who wants it is mid-incident with a
// failing request, and that is a developer errand.
export const DEVELOPER_NAV: readonly NavLink[] = [
  {
    to: `${DOCS_URL}/start/quickstart/`,
    external: true,
    label: 'Docs',
    longLabel: 'Documentation',
    description: 'Get a key and make your first call',
  },
  {
    to: `${DOCS_URL}/api/`,
    external: true,
    label: 'API reference',
    longLabel: 'API reference',
    description: 'Every endpoint, parameter and error',
  },
  {
    to: `${DOCS_URL}/sdks/overview/`,
    external: true,
    label: 'SDKs',
    longLabel: 'SDKs and tools',
    description: 'Any OpenAI client works - what to point where',
  },
  {
    to: '/status',
    label: 'Status',
    longLabel: 'Status',
    description: 'Live health of the gateway, accounts and payments',
  },
];

/** The label on the bar item that opens the developer panel. */
export const DEVELOPER_NAV_LABEL = 'Developers';

/** @deprecated Use PRODUCT_NAV. Kept while downstream navigation migrates. */
export const PRIMARY_NAV = PRODUCT_NAV;

export const CONTACT_EMAIL = 'hello@rovie.africa';
