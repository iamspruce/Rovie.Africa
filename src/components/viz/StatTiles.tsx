import styles from './StatTiles.module.scss';

export interface Stat {
  key: string;
  label: string;
  value: string;
  /** One line of context under the figure, e.g. what it's a median of. */
  note?: string;
}

interface StatTilesProps {
  stats: Stat[];
  /** Renders the first tile as the page's hero figure. */
  lead?: boolean;
}

/**
 * A row of headline numbers.
 *
 * These are figures, not charts - a single value with no trend has no shape
 * to draw, and a one-bar bar chart would be a worse way to read it. Values
 * use proportional figures, not tabular: equal-width digits make a large
 * standalone number look loose.
 */
export function StatTiles({ stats, lead = false }: StatTilesProps) {
  return (
    <dl className={`${styles.row} ${lead ? styles.withLead : ''}`}>
      {stats.map((stat, index) => (
        <div
          key={stat.key}
          className={`${styles.tile} ${lead && index === 0 ? styles.leadTile : ''}`}
        >
          <dt className={styles.label}>{stat.label}</dt>
          <dd className={styles.value}>{stat.value}</dd>
          {stat.note && <dd className={styles.note}>{stat.note}</dd>}
        </div>
      ))}
    </dl>
  );
}
