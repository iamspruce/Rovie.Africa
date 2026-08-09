import { Link } from 'react-router-dom';
import { useServiceHealth } from '../../hooks/useServiceHealth';
import type { ServiceState } from '../../hooks/useServiceHealth';
import { CONTACT_EMAIL } from '../../content/navLinks';
import styles from './Status.module.scss';

const STATE_LABEL: Record<ServiceState, string> = {
  operational: 'Operational',
  degraded: 'Slow',
  down: 'Not responding',
  unmonitored: 'Not monitored',
  checking: 'Checking…',
};

const HEADLINE: Record<ServiceState, string> = {
  operational: 'All systems operational',
  degraded: 'Some systems are slow',
  down: 'Something is not responding',
  unmonitored: 'Nothing to report',
  checking: 'Checking systems…',
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function Status() {
  const { checks, overall, lastCheckedAt, isChecking, refresh } = useServiceHealth();

  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.head}>
        <span className={styles.eyebrow}>Status</span>
        <h1>{HEADLINE[overall]}</h1>
        <p className={styles.intro}>
          Checked live from your browser, right now — these are the same requests this site makes to
          run. A result here reflects what you can reach from where you are, not an average across
          everyone.
        </p>

        <div className={styles.meta}>
          <p className={styles.checked} role="status">
            {lastCheckedAt
              ? `Last checked at ${formatTime(lastCheckedAt)}. Rechecks every minute.`
              : 'Running the first check…'}
          </p>
          <button
            type="button"
            className={styles.refresh}
            onClick={refresh}
            disabled={isChecking}
          >
            {isChecking ? 'Checking…' : 'Check again'}
          </button>
        </div>
      </header>

      <ul className={styles.list} aria-label="Service status">
        {checks.map((check) => (
          <li key={check.id} className={styles.row} data-state={check.state}>
            <span className={styles.dot} aria-hidden="true" />

            <div className={styles.identity}>
              <h2>{check.name}</h2>
              <p>{check.description}</p>
            </div>

            <div className={styles.reading}>
              <span className={styles.state}>{STATE_LABEL[check.state]}</span>
              {check.latencyMs !== null && check.state !== 'checking' && (
                <span className={styles.latency}>{check.latencyMs} ms</span>
              )}
              {check.detail && <span className={styles.detail}>{check.detail}</span>}
            </div>
          </li>
        ))}
      </ul>

      <section className={styles.note} aria-labelledby="status-note-heading">
        <h2 id="status-note-heading">If something looks wrong</h2>
        <p>
          A failure here can be your network as easily as ours — the checks run from your browser.
          If a service stays red after a refresh, tell us what you&apos;re seeing and we&apos;ll
          look at it from our side.
        </p>
        <div className={styles.actions}>
          <a
            className={styles.action}
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Status report')}`}
          >
            Report a problem
          </a>
          <Link className={styles.action} to="/support">
            Get support
          </Link>
        </div>
      </section>
    </main>
  );
}
