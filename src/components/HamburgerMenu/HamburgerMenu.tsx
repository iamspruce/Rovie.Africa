import { NavLink, Link } from 'react-router-dom';
import {
  CONTACT_EMAIL,
  DEVELOPER_NAV,
  DEVELOPER_NAV_LABEL,
  PRIMARY_NAV,
} from '../../content/navLinks';
import type { NavLink as NavLinkData } from '../../content/navLinks';
import { COMPANY_LINKS } from '../../content/siteLinks';
import { SmartLink } from '../SmartLink/SmartLink';
import { Button } from '../Button/Button';
import styles from './HamburgerMenu.module.scss';

interface HamburgerButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function HamburgerButton({ isOpen, onToggle }: HamburgerButtonProps) {
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls="rovie-nav-menu"
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
    >
      <span className={`${styles.bar} ${isOpen ? styles.barOpenTop : ''}`} />
      <span className={`${styles.bar} ${isOpen ? styles.barOpenMiddle : ''}`} />
      <span className={`${styles.bar} ${isOpen ? styles.barOpenBottom : ''}`} />
    </button>
  );
}

interface GroupProps {
  id: string;
  title: string;
  links: readonly NavLinkData[];
  onNavigate: () => void;
}

function Group({ id, title, links, onNavigate }: GroupProps) {
  return (
    <div className={styles.group}>
      {/* A <p> rather than a heading: these label a menu, and injecting four
          h2s into every page's outline to do it would misdescribe the page. */}
      <p className={styles.groupTitle} id={id}>
        {title}
      </p>
      <ul aria-labelledby={id}>
        {links.map((link) => (
          <li key={link.to}>
            <SmartLink
              to={link.to}
              external={link.external}
              onClick={onNavigate}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.linkActive}` : styles.link
              }
            >
              <span className={styles.linkLabel}>{link.longLabel}</span>
              {link.description && (
                <span className={styles.linkDescription}>{link.description}</span>
              )}
            </SmartLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface HamburgerMenuProps {
  isOpen: boolean;
  isSignedIn: boolean;
  /** The session check hasn't landed yet, so neither answer is honest. */
  isAuthLoading: boolean;
  onNavigate: () => void;
}

/**
 * The full-height sheet the bar's destinations live in below the large
 * breakpoint. It is not a shortened version of the desktop navigation: it
 * carries the company routes and the contact address too, because on a phone
 * this is the only navigation on the page until you reach the footer.
 */
export function HamburgerMenu({
  isOpen,
  isSignedIn,
  isAuthLoading,
  onNavigate,
}: HamburgerMenuProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.sheet} id="rovie-nav-menu">
      <nav className={styles.sheetInner} aria-label="Site navigation">
        <Group
          id="rovie-nav-product"
          title="Product"
          links={PRIMARY_NAV}
          onNavigate={onNavigate}
        />
        <Group
          id="rovie-nav-developers"
          title={DEVELOPER_NAV_LABEL}
          links={DEVELOPER_NAV}
          onNavigate={onNavigate}
        />

        <div className={styles.group}>
          <p className={styles.groupTitle} id="rovie-nav-company">
            Company
          </p>
          <ul aria-labelledby="rovie-nav-company">
            {COMPANY_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    isActive ? `${styles.link} ${styles.linkActive}` : styles.link
                  }
                >
                  <span className={styles.linkLabel}>{link.label}</span>
                </NavLink>
              </li>
            ))}
            {/* "Contact us" is not a route, so it can't come from the list
                above - and the footer is a long way down on a phone. */}
            <li>
              <a className={styles.link} href={`mailto:${CONTACT_EMAIL}`} onClick={onNavigate}>
                <span className={styles.linkLabel}>Contact us</span>
              </a>
            </li>
          </ul>
        </div>

        {/* The bar drops "Sign in" under 480px and both actions are easier to
            hit down here anyway. Nothing renders until the session check
            lands, for the same reason the bar renders nothing. */}
        {!isAuthLoading && (
          <div className={styles.actions}>
            {isSignedIn ? (
              <Button as={Link} to="/dashboard" variant="primary" onClick={onNavigate}>
                Dashboard
              </Button>
            ) : (
              <>
                <Button as={Link} to="/signin" variant="ghost" onClick={onNavigate}>
                  Sign in
                </Button>
                <Button as={Link} to="/signup" variant="primary" onClick={onNavigate}>
                  Get started
                </Button>
              </>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}
