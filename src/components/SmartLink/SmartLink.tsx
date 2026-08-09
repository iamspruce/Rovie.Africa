import { NavLink } from 'react-router-dom';

// -----------------------------------------------------------------------
// One link component for destinations that may or may not be in this app.
//
// The documentation moved to its own host (docs.rovie.africa - see docs/ in
// this repository), and it is linked from three places: the header's Developers
// panel, the mobile sheet and the footer. All three previously rendered a
// react-router <NavLink>, which resolves its `to` as a PATH - so an absolute
// URL would have routed to a page called "https://docs.rovie.africa/" and
// rendered the 404.
//
// Rather than three copies of the same ternary, the decision lives here. The
// className callback keeps react-router's shape in both branches, so callers
// don't have to know which one they got: an external link is never "active",
// which is correct - you are, by definition, not on it.
// -----------------------------------------------------------------------

interface SmartLinkProps {
  to: string;
  /** True when `to` leaves this app, in which case it must be an absolute URL. */
  external?: boolean;
  /**
   * Either a string or react-router's callback form. External links are given
   * `isActive: false`, since being on another origin is not being on a route.
   */
  className?: string | ((state: { isActive: boolean }) => string);
  onClick?: () => void;
  children: React.ReactNode;
}

export function SmartLink({ to, external, className, onClick, children }: SmartLinkProps) {
  if (external) {
    const resolved = typeof className === 'function' ? className({ isActive: false }) : className;

    return (
      // Same tab, deliberately. docs.rovie.africa is part of the same product
      // and carries a link back; opening it in a new tab would be deciding for
      // the reader that they are done here, and leaves them a tab to close.
      //
      // rel="noreferrer" is not set: the docs are ours, and the referrer is
      // how we find out which page sent someone to the quickstart.
      <a href={to} className={resolved} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <NavLink to={to} className={className} onClick={onClick}>
      {children}
    </NavLink>
  );
}
