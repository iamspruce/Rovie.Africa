import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Button } from '../Button/Button';
import { LogoMap } from '../LogoMap/LogoMap';
import { NavDropdown } from './NavDropdown';
import { ModelLibraryCard } from './ModelLibraryCard';
import { HamburgerButton, HamburgerMenu } from '../HamburgerMenu/HamburgerMenu';
import { DEVELOPER_NAV, DEVELOPER_NAV_LABEL, PRIMARY_NAV } from '../../content/navLinks';
import { useAuth } from '../../context/AuthContext';
import styles from './Header.module.scss';

// How far down the page the bar starts drawing its underline. Far enough that
// it doesn't flicker on the elastic overscroll at the top of the homepage.
const SCROLLED_AFTER_PX = 8;

export function Header() {
  const { isSignedIn, isLoading } = useAuth();
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
        <Link to="/" className={styles.logo} aria-label="Rovie.africa home">
          <LogoMap size={28} />
          Rovie
        </Link>

        {/* The real navigation, visible from the large breakpoint up. Below
            that the same destinations are in the sheet - see HamburgerMenu -
            because four bar items, two buttons and a wordmark do not fit on a
            phone without one of them shrinking to nothing. */}
        <nav className={styles.nav} aria-label="Main">
          <ul>
            {PRIMARY_NAV.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
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
          {/* Nothing is rendered until the session check lands. Showing
              "Sign in" first and swapping it for "Dashboard" a moment later
              tells a signed-in user they've been logged out. */}
          {!isLoading &&
            (isSignedIn ? (
              <Button as={Link} to="/dashboard" variant="primary">
                Dashboard
              </Button>
            ) : (
              <>
                {/* Hidden on the narrowest screens, where it would push the
                    primary action off the bar. The sheet carries it there. */}
                <Button as={Link} to="/signin" variant="ghost" className={styles.signIn}>
                  Sign in
                </Button>
                <Button as={Link} to="/signup" variant="primary">
                  Get started
                </Button>
              </>
            ))}

          <HamburgerButton isOpen={isMenuOpen} onToggle={() => setIsMenuOpen((v) => !v)} />
        </div>
      </div>

      <HamburgerMenu
        isOpen={isMenuOpen}
        isSignedIn={isSignedIn}
        isAuthLoading={isLoading}
        onNavigate={() => setIsMenuOpen(false)}
      />
    </header>
  );
}
