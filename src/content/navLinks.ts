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

// The two destinations that earn a slot in the bar itself. Both are pages
// someone still deciding would want; everything else is either a developer
// destination or a company one, and those live behind the Developers panel and
// in the footer respectively.
export const PRIMARY_NAV: readonly NavLink[] = [
  {
    to: '/models',
    label: 'Models',
    longLabel: 'Models & pricing',
    description: 'Every model and its price per million tokens, in your currency',
  },
  {
    to: '/rankings',
    label: 'Rankings',
    longLabel: 'What Africa is building with',
    description: 'Measured usage: what the continent actually runs',
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

export const CONTACT_EMAIL = 'hello@rovie.africa';
