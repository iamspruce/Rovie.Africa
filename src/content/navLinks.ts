// One source for the site's primary destinations. The header bar, the mobile
// menu and the footer's Product column all read from here, so a route cannot
// be listed in one place and go missing from another - which is how /rankings
// ended up shipping with no link to it in the footer.
export interface NavLink {
  to: string;
  /** Short form, for the header bar and the mobile menu. */
  label: string;
  /** The fuller name, for the footer where there's room to say what a page is. */
  longLabel: string;
}

// Docs are deliberately not here. They're a developer destination, reached
// from the footer's Developers column and from the pages that need them, not
// something to spend a slot on in a menu aimed at people still deciding.
export const PRIMARY_NAV: readonly NavLink[] = [
  { to: '/models', label: 'Models', longLabel: 'Models & pricing' },
  { to: '/rankings', label: 'Rankings', longLabel: 'What Africa is building with' },
];

export const CONTACT_EMAIL = 'hello@rovie.africa';
