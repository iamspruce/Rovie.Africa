import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './DashboardUi.module.scss';

/** A titled panel. Every dashboard section is built from these. */
export function Card({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>{title}</h2>
          {description && <p className={styles.cardDescription}>{description}</p>}
        </div>
        {action && <div className={styles.cardAction}>{action}</div>}
      </header>
      {children}
    </section>
  );
}

/**
 * An empty state. Says what would be here and what to do about it - an empty
 * screen is an invitation to act, not a dead end.
 */
export function Empty({ children }: { children: ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}

export function Pending({ label }: { label: string }) {
  return (
    <p className={styles.pending} role="status">
      {label}
    </p>
  );
}

/** A neutral, non-alarming status panel. Announced, but not as an error. */
export function FormNotice({ children }: { children: ReactNode }) {
  return (
    <p className={styles.notice} role="status">
      {children}
    </p>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p className={styles.error} role="alert">
      {children}
    </p>
  );
}

/** A labelled figure. Used for balance and spend. */
export function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      {/* Tabular figures so a column of amounts lines up on the decimal
          rather than shifting with the digits. */}
      <span className={styles.statValue}>{value}</span>
      {note && <span className={styles.statNote}>{note}</span>}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className={styles.statRow}>{children}</div>;
}

/**
 * A proportion, drawn as one bar.
 *
 * Used where the ratio is the point and the two numbers on their own aren't:
 * credit left against credit bought, a key's spend against its cap. `tone`
 * only ever escalates - a bar that turns red is saying something the figure
 * beside it already says in words, never something only the colour carries.
 */
export function Meter({
  percent,
  label,
  value,
  tone = 'normal',
}: {
  /** 0-100. Clamped, so a stale balance can't draw past the track. */
  percent: number;
  label: string;
  value: string;
  tone?: 'normal' | 'warning' | 'danger';
}) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div className={styles.meter}>
      <div className={styles.meterHead}>
        <span className={styles.meterLabel}>{label}</span>
        <span className={styles.meterValue}>{value}</span>
      </div>
      {/* Presentation: the figure above is the accessible value. */}
      <span className={styles.meterTrack} aria-hidden="true">
        <span
          className={`${styles.meterFill} ${tone === 'danger' ? styles.meterDanger : ''} ${
            tone === 'warning' ? styles.meterWarning : ''
          }`}
          style={{ width: `${width}%` }}
        />
      </span>
    </div>
  );
}

/**
 * A value the user is meant to copy: base URL, key, config block.
 *
 * The button reports what happened rather than assuming - clipboard access
 * can be denied outright, and a "Copied" that lied would send someone off to
 * paste nothing.
 */
export function CopyField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 2000);
  }

  return (
    <div className={`${styles.copyField} ${multiline ? styles.copyBlock : ''}`}>
      <span className={styles.copyLabel}>{label}</span>
      <div className={styles.copyBody}>
        <code className={styles.copyValue}>{value}</code>
        <button type="button" className={styles.copyButton} onClick={copy}>
          {state === 'copied' ? 'Copied' : state === 'failed' ? 'Press ⌘C' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

/** A short state word. Carries a colour, but never only a colour. */
export function Tag({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'danger' | 'muted';
}) {
  return <span className={`${styles.tag} ${styles[`tag-${tone}`]}`}>{children}</span>;
}

/** Wraps a wide table so it scrolls itself rather than the page. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className={styles.tableWrap}>{children}</div>;
}

// The windows account-service will actually answer for. Anything else is
// coerced server-side, so offering a fourth here would silently lie.
const WINDOW_CHOICES: readonly { days: number; label: string }[] = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

/** The window every figure on a screen is measured over. */
export function WindowPicker({
  value,
  onChange,
  id,
}: {
  value: number;
  onChange: (days: number) => void;
  id: string;
}) {
  return (
    <div className={styles.windowPicker}>
      <label htmlFor={id}>Period</label>
      <select id={id} value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {WINDOW_CHOICES.map((choice) => (
          <option key={choice.days} value={choice.days}>
            {choice.label}
          </option>
        ))}
      </select>
    </div>
  );
}
