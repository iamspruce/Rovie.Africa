import type { ReactNode } from 'react';
import { AuthPlate } from '../AuthPlate/AuthPlate';
import styles from './AuthLayout.module.scss';

interface AuthLayoutProps {
  title: string;
  /** One line under the title. Says what this page does, not what Rovie is. */
  subtitle: string;
  children: ReactNode;
  /** The "no account yet?" / "already have one?" line at the foot of the column. */
  footer?: ReactNode;
}

/**
 * Two-column shell for /signin and /signup: the plate on the left, the form
 * on the right. Below `lg` the plate collapses to a banner above the form
 * rather than disappearing, so the page keeps its identity on a phone.
 *
 * Deliberately outside the site's Header/Footer chrome. A visitor on these
 * pages has exactly one job, and a nav bar offering eight other routes works
 * against it.
 */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className={styles.layout}>
      <AuthPlate />

      <main className={styles.panel}>
        <div className={styles.column}>
          <header className={styles.heading}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
          </header>

          {children}

          {footer && <p className={styles.footer}>{footer}</p>}
        </div>
      </main>
    </div>
  );
}
