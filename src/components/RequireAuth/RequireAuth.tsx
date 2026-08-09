import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './RequireAuth.module.scss';

/**
 * Gates the dashboard routes.
 *
 * Waits for the first session check before deciding. Redirecting while the
 * check is still in flight would bounce every signed-in user to /signin on
 * every hard refresh, since the cookie isn't readable from JavaScript and
 * "signed in" is only known once /me answers.
 *
 * This is a convenience, not the security boundary - portal-api authorises
 * every request on its own. Nothing here can be bypassed into data.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isSignedIn } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className={styles.pending} role="status" aria-live="polite">
        <span className={styles.spinner} aria-hidden="true" />
        <span className={styles.label}>Checking your session…</span>
      </div>
    );
  }

  if (!isSignedIn) {
    // Carry where they were headed so sign-in can return them there.
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/signin?next=${next}`} replace />;
  }

  return <>{children}</>;
}
