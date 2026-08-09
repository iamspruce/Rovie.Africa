import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../Button/Button';
import { LogoMap } from '../LogoMap/LogoMap';
import { HamburgerButton, HamburgerMenu } from '../HamburgerMenu/HamburgerMenu';
import { useAuth } from '../../context/AuthContext';
import styles from './Header.module.scss';

export function Header() {
  const { isSignedIn, isLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>

      <div className={styles.bar}>
        <Link to="/" className={styles.logo} aria-label="Rovie.africa home">
          <LogoMap size={28} />
          Rovie
        </Link>

        {/* Navigation lives behind the menu button at every width, and the
            button sits last so the two things a visitor is most likely to want
            - signing in and starting - stay in front of it. */}
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
                <Button as={Link} to="/signin" variant="ghost">
                  Sign in
                </Button>
                <Button as={Link} to="/signup" variant="primary">
                  Get started
                </Button>
              </>
            ))}

          <HamburgerButton isOpen={isMenuOpen} onToggle={() => setIsMenuOpen((v) => !v)} />
        </div>

        <HamburgerMenu isOpen={isMenuOpen} onNavigate={() => setIsMenuOpen(false)} />
      </div>
    </header>
  );
}
