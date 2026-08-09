import { Link, useLocation } from 'react-router-dom';
import { findPlaceholderByPath } from '../../content/placeholderPages';
import { CONTACT_EMAIL } from '../../content/navLinks';
import styles from './Placeholder.module.scss';

/**
 * Renders any route listed in PLACEHOLDER_PAGES. One component rather than a
 * file per page, so an unwritten page costs three lines of data, and finishing
 * one means writing a real page and removing its entry.
 *
 * It says plainly that the page isn't written rather than showing invented
 * content - the rest of the site is careful never to state a number it can't
 * back up, and that applies to prose too.
 */
export function Placeholder() {
  const { pathname } = useLocation();
  const page = findPlaceholderByPath(pathname);

  if (!page) {
    return (
      <main className={`container ${styles.page}`}>
        <h1>Page not found</h1>
        <p className={styles.summary}>
          Nothing lives at <code>{pathname}</code>.
        </p>
        <Link className={styles.back} to="/">
          Back to the homepage
        </Link>
      </main>
    );
  }

  return (
    <main className={`container ${styles.page}`}>
      <span className={styles.eyebrow}>Coming soon</span>
      <h1>{page.title}</h1>
      <p className={styles.summary}>{page.summary}</p>

      <p className={styles.note} role="status">
        We haven&apos;t written this page yet. Rather than show you something invented, here&apos;s
        what it will carry when it lands.
      </p>

      <div className={styles.actions}>
        <Link className={styles.back} to="/models">
          Browse the model catalog
        </Link>
        <a className={styles.back} href={`mailto:${CONTACT_EMAIL}`}>
          Ask us directly
        </a>
      </div>
    </main>
  );
}
