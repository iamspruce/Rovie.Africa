import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../Logo/Logo';
import { SmartLink } from '../SmartLink/SmartLink';
import { Button } from '../Button/Button';
import { CONTACT_EMAIL } from '../../content/navLinks';
import {
  PRODUCT_LINKS,
  LEARN_LINKS,
  DEVELOPER_LINKS,
  COMPANY_LINKS,
  SOCIAL_LINKS,
} from '../../content/siteLinks';
import type { SiteLink } from '../../content/siteLinks';
import styles from './Footer.module.scss';

// Deliberately loose - just enough to catch a typo before we accept the
// address. Real verification happens when the list provider confirms it.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Only the accounts that actually have a URL. An unfilled entry renders as
// nothing rather than as a link to a page that doesn't exist.
const CONNECTED_SOCIALS = SOCIAL_LINKS.filter((social) => social.url.length > 0);

function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'invalid' | 'subscribed'>('idle');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setStatus('invalid');
      return;
    }
    // TODO: post to the list provider once the subscribe endpoint exists.
    setStatus('subscribed');
    setEmail('');
  }

  return (
    <section className={styles.newsletter} aria-labelledby="footer-newsletter-heading">
      <div className={styles.newsletterCopy}>
        <h2 id="footer-newsletter-heading">Subscribe to our newsletter</h2>
        <p>
          When we add a model, when pricing moves, and what we ship next. A short note now and
          then, never spam.
        </p>
      </div>

      <form className={styles.newsletterForm} onSubmit={handleSubmit} noValidate>
        <label className={styles.newsletterLabel} htmlFor="footer-newsletter-email">
          Email address
        </label>

        {/* Input and button share one pill so the whole thing reads as a
            single control; the focus ring lives on the wrapper. */}
        <div
          className={`${styles.newsletterField} ${status === 'invalid' ? styles.newsletterFieldInvalid : ''
            }`}
        >
          <input
            id="footer-newsletter-email"
            type="email"
            name="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (status !== 'idle') setStatus('idle');
            }}
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={status === 'invalid'}
            aria-describedby="footer-newsletter-status"
          />
          <Button type="submit" className={styles.newsletterSubmit}>
            Subscribe
          </Button>
        </div>

        {/* Always rendered so confirming a subscription doesn't shift the
            footer under the pointer. */}
        <p
          id="footer-newsletter-status"
          role="status"
          className={[
            styles.newsletterStatus,
            status === 'invalid' ? styles.newsletterError : '',
            status === 'subscribed' ? styles.newsletterSuccess : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {status === 'invalid' && 'Enter a valid email address.'}
          {status === 'subscribed' && "You're on the list — thanks for subscribing."}
          {status === 'idle' && 'No spam. Unsubscribe any time.'}
        </p>
      </form>
    </section>
  );
}

interface ColumnProps {
  title: string;
  links: readonly SiteLink[];
  /** Rendered after the routed links - contact addresses, social accounts. */
  children?: React.ReactNode;
}

function Column({ title, links, children }: ColumnProps) {
  return (
    <div className={styles.column}>
      <h2>{title}</h2>
      <ul>
        {links.map((link) => (
          <li key={link.to}>
            <SmartLink to={link.to} external={link.external}>
              {link.label}
            </SmartLink>
          </li>
        ))}
        {children}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Newsletter />

      <div className={styles.sitemap}>
        <div className={styles.brand}>
          {/* Horizontal lockup, matching the header. The mark and the "Rovie"
              span it used to sit beside are both inside the artwork now. */}
          <Link to="/" className={styles.logo} aria-label="Rovie.africa home">
            <Logo variant="horizontal" height={38} />
          </Link>

          <p className={styles.blurb}>
            Rovie&apos;s aim is to make AI accessible and cheaper for Africans.
          </p>

          <p className={styles.creed}>Africa should help shape the future of AI.</p>
        </div>

        <nav className={styles.columns} aria-label="Footer">
          <Column title="Product" links={PRODUCT_LINKS} />
          <Column title="Learn" links={LEARN_LINKS} />
          <Column title="Developers" links={DEVELOPER_LINKS} />

          {/* Support is a routed page now, so it comes through COMPANY_LINKS
              like the rest - the mailto that used to sit beside it would be a
              second row reading "Support" pointing somewhere else. */}
          <Column title="Company" links={COMPANY_LINKS} />

          <Column title="Connect" links={[]}>
            {CONNECTED_SOCIALS.map((social) => (
              <li key={social.label}>
                <a href={social.url} target="_blank" rel="me noreferrer">
                  {social.label}
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`}>Contact us</a>
            </li>
          </Column>
        </nav>
      </div>

      <div className={styles.bottom}>
        {/* The mark, drawn large and nearly out - the continent the whole site
            is about, sitting under the last line on the page. Decorative, so
            it's hidden from assistive tech and takes no pointer events. */}
        <div className={styles.watermark} aria-hidden="true">
          <Logo variant="mark" height={300} />
        </div>

        <p className={styles.copyright}>
          © {new Date().getFullYear()} Rovie. Making AI accessible and cheaper for Africans.
        </p>

      </div>
    </footer>
  );
}
