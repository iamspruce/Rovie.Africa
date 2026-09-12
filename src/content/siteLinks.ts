import { DEVELOPER_NAV, LEARN_NAV, PRODUCT_NAV } from './navLinks';

export interface SiteLink {
  /** Internal route, or an absolute URL / mailto: for anything off-site. */
  to: string;
  /** Set when `to` leaves this app, so the footer renders an <a> not a <Link>. */
  external?: boolean;
  label: string;
}

export interface SocialLink {
  label: string;
  /**
   * Empty until someone pastes the real account URL in. The footer renders
   * only the entries that have one, so an unfilled row is invisible rather
   * than a link that 404s or points at an account we don't own.
   */
  url: string;
}

// -------------------------------------------------------------- product

export const PRODUCT_LINKS: readonly SiteLink[] = PRODUCT_NAV.map((link) => ({
  to: link.to,
  external: link.external,
  label: link.longLabel,
}));

export const LEARN_LINKS: readonly SiteLink[] = LEARN_NAV.map((link) => ({
  to: link.to,
  label: link.longLabel,
}));

// ----------------------------------------------------------- developers

// The same four the header's Developers panel offers, under their full names.
// Derived rather than retyped: adding a developer destination should put it in
// both places or neither. Three of them now point at docs.rovie.africa, so the
// `external` flag comes along with them.
export const DEVELOPER_LINKS: readonly SiteLink[] = DEVELOPER_NAV.map((link) => ({
  to: link.to,
  external: link.external,
  label: link.longLabel,
}));

// --------------------------------------------------------------- company

export const COMPANY_LINKS: readonly SiteLink[] = [
  { to: '/about', label: 'About' },
  { to: '/support', label: 'Support' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/data-policy', label: 'Data policy' },
  { to: '/terms', label: 'Terms of service' },
];

// --------------------------------------------------------------- connect
//
// Paste the account URLs in here and each one appears in the footer. Nothing
// else needs changing.
export const SOCIAL_LINKS: readonly SocialLink[] = [
  { label: 'Discord', url: '' },
  { label: 'X', url: '' },
  { label: 'GitHub', url: '' },
  { label: 'LinkedIn', url: '' },
  { label: 'YouTube', url: '' },
];
