import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from '../Logo/Logo';
import { NavDropdown } from './NavDropdown';
import { ModelLibraryCard } from './ModelLibraryCard';
import { HamburgerButton, HamburgerMenu } from '../HamburgerMenu/HamburgerMenu';
import {
  DEVELOPER_NAV,
  DEVELOPER_NAV_LABEL,
  LEARN_NAV,
  PRODUCT_NAV,
  ROUTE_NAV,
} from '../../content/navLinks';
import styles from './Header.module.scss';

// How far down the page the bar starts drawing its underline. Far enough that
// it doesn't flicker on the elastic overscroll at the top of the homepage.
const SCROLLED_AFTER_PX = 8;

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { pathname } = useLocation();

  // Navigating from inside the sheet closes it. Handling that here rather than
  // on each link means it also covers the back button and any redirect.
  useEffect(() => setIsMenuOpen(false), [pathname]);

  // The page behind an open full-height sheet must not scroll under it.
  useEffect(() => {
    if (!isMenuOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMenuOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > SCROLLED_AFTER_PX);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={styles.header} data-scrolled={isScrolled || undefined}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>

      <div className={styles.bar}>
        {/* The horizontal lockup already draws the wordmark, so the literal
            "Rovie" text node that used to sit beside the mark is gone. The
            link keeps its aria-label, which is now the only accessible name
            it has. */}
        <Link to="/" className={styles.logo} aria-label="Rovie.africa home">
          <Logo variant="horizontal" height={34} />
        </Link>

        {/* The real navigation, visible from the large breakpoint up. Below
            that the same destinations are in the sheet - see HamburgerMenu -
            because four bar items, two buttons and a wordmark do not fit on a
            phone without one of them shrinking to nothing. */}
        <nav className={styles.nav} aria-label="Main">
          <ul>
            <li><NavDropdown label="Products" links={PRODUCT_NAV} /></li>
            <li><NavDropdown label="Learn" links={LEARN_NAV} /></li>
            <li>
              <NavDropdown
                label={DEVELOPER_NAV_LABEL}
                links={DEVELOPER_NAV}
                feature={<ModelLibraryCard />}
              />
            </li>
          </ul>
        </nav>

        <div className={styles.actions}>
          <NavDropdown label="Try Route" links={ROUTE_NAV} variant="primary" align="end" />

          <HamburgerButton isOpen={isMenuOpen} onToggle={() => setIsMenuOpen((v) => !v)} />
        </div>
      </div>

      <HamburgerMenu
        isOpen={isMenuOpen}
        onNavigate={() => setIsMenuOpen(false)}
      />
    </header>
  );
}
