import { NavLink } from 'react-router-dom';
import { PRIMARY_NAV, CONTACT_EMAIL } from '../../content/navLinks';
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

interface HamburgerMenuProps {
  isOpen: boolean;
  onNavigate: () => void;
}

export function HamburgerMenu({ isOpen, onNavigate }: HamburgerMenuProps) {
  if (!isOpen) return null;

  return (
    <nav id="rovie-nav-menu" className={styles.menu} aria-label="Site navigation">
      <ul>
        {PRIMARY_NAV.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              onClick={onNavigate}
              className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
            >
              {link.label}
            </NavLink>
          </li>
        ))}

        {/* "Contact us" comes out of the bar at this width, so it lands here
            rather than being reachable only from the footer. */}
        <li>
          <a className={styles.link} href={`mailto:${CONTACT_EMAIL}`} onClick={onNavigate}>
            Contact us
          </a>
        </li>
      </ul>
    </nav>
  );
}
