import { Link, useLocation } from 'react-router-dom';
import { Logo } from '../Logo/Logo';
import { NavDropdown } from '../Header/NavDropdown';
import { DOCS_URL } from '../../content/navLinks';
import type { NavLink } from '../../content/navLinks';
import styles from './RouteChrome.module.scss';

const ACCOUNT_NAV: readonly NavLink[] = [
  {
    to: '/signup',
    label: 'Create account',
    longLabel: 'Create a Route account',
    description: 'Get an API key and start building',
  },
  {
    to: '/signin',
    label: 'Sign in',
    longLabel: 'Sign in to Route',
    description: 'Return to your Route dashboard',
  },
];

function RouteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <Link to="/" className={styles.brand} aria-label="Rovie Route home">
            <Logo variant="horizontal" height={30} />
            <span>Route</span>
          </Link>
          <nav className={styles.nav} aria-label="Rovie Route">
            <Link to="/models">Models</Link>
            <a href={`${DOCS_URL}/start/quickstart/`}>Docs</a>
          </nav>
        </div>
        <div className={styles.actions}>
          <NavDropdown label="Start building" links={ACCOUNT_NAV} variant="primary" align="end" />
        </div>
      </div>
    </header>
  );
}

function RouteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Link to="/" className={styles.brand} aria-label="Rovie Route home">
            <Logo variant="horizontal" height={30} />
            <span>Route</span>
          </Link>
          <p>One API for leading AI models, priced and paid for locally.</p>
        </div>
        <div className={styles.footerLinks}>
          <nav aria-label="Route product">
            <h2>Product</h2>
            <Link to="/models">Models and pricing</Link>
            <a href={`${DOCS_URL}/start/quickstart/`}>Documentation</a>
          </nav>
          <nav aria-label="Route account">
            <h2>Account</h2>
            <Link to="/signup">Create account</Link>
            <Link to="/signin">Sign in</Link>
          </nav>
          <nav aria-label="Rovie company">
            <h2>Rovie</h2>
            <a href="https://rovie.africa">About Rovie</a>
            <a href="https://rovie.africa/status">Status</a>
          </nav>
        </div>
      </div>
      <div className={styles.footerBottom}>© {new Date().getFullYear()} Rovie Route</div>
    </footer>
  );
}

/** Product chrome for Route's public marketing pages only. */
export function RouteChrome({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const focused = pathname === '/signin' || pathname === '/signup' || pathname === '/reset-password' || pathname.startsWith('/dashboard');

  if (focused) return <>{children}</>;

  return (
    <div className={styles.shell}>
      <RouteHeader />
      <div className={styles.main}>{children}</div>
      <RouteFooter />
    </div>
  );
}
