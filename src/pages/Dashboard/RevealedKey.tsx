import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button/Button';
import styles from './RevealedKey.module.scss';

/**
 * The one moment a full API key is on screen.
 *
 * LiteLLM issues the key and account-service stores it encrypted so a top-up
 * can raise its budget; nothing in the product can show it to the user again.
 * So this panel has to be unmissable, has to make copying trivial, and has to
 * require a deliberate dismissal - an auto-hiding toast here loses someone
 * their key.
 */
export function RevealedKey({ apiKey, onDismiss }: { apiKey: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus here on appear: the key is the result of the action just
  // taken, and a keyboard or screen-reader user should land on it rather
  // than still be on the Create button.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context, denied permission). The key is
      // selectable text either way, so say so instead of failing silently.
      setCopied(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="revealed-key-heading">
      <h2 className={styles.heading} id="revealed-key-heading" tabIndex={-1} ref={headingRef}>
        Copy your key now
      </h2>
      <p className={styles.body}>
        This is the only time it will be shown. If you lose it, revoke it and create another.
      </p>

      <div className={styles.keyRow}>
        {/* readOnly input rather than a <code> block: it gives select-all on
            click and a working Ctrl+C when the clipboard API is unavailable. */}
        <input
          className={styles.keyInput}
          value={apiKey}
          readOnly
          onFocus={(event) => event.target.select()}
          aria-label="Your new API key"
        />
        <Button onClick={handleCopy}>{copied ? 'Copied' : 'Copy'}</Button>
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onDismiss}>
          I&apos;ve saved it
        </Button>
      </div>
    </section>
  );
}
