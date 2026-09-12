import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './DashboardLayout.module.scss';

const SECTIONS = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/usage', label: 'Usage', end: false },
  { to: '/dashboard/keys', label: 'API keys', end: false },
  { to: '/dashboard/billing', label: 'Billing', end: false },
  { to: '/dashboard/account', label: 'Account', end: false },
];

export function DashboardLayout() {
  const { user, needsCountry } = useAuth();

  return (
    <div className={styles.dashboard}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>
            Rovie Route · Signed in as {user?.email ?? user?.name ?? 'your account'}
          </p>
          <h1 className={styles.title}>{user?.name ? `Hello, ${user.name}` : 'Rovie Route dashboard'}</h1>
        </header>

        {/* Google and magic-link signups arrive with no country, and a key
            can't be issued without one. Persistent across every section
            rather than shown once, because it blocks the main thing the
            dashboard is for. */}
        {needsCountry && (
          <p className={styles.banner} role="status">
            Set your country before creating an API key — it decides the currency you&apos;re billed
            in. <NavLink to="/dashboard/account">Set it now</NavLink>
          </p>
        )}

        <nav className={styles.tabs} aria-label="Rovie Route dashboard sections">
          {SECTIONS.map((section) => (
            <NavLink
              key={section.to}
              to={section.to}
              end={section.end}
              className={({ isActive }) => (isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab)}
            >
              {section.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
