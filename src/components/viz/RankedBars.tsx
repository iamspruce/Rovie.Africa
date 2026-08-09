import { useState } from 'react';
import { VIZ_PRIMARY } from '../../lib/viz/palette';
import styles from './RankedBars.module.scss';

/**
 * Rows shown before "see more". Eight is enough to read a distribution -
 * a leader, a middle, and a tail - without a single section running longer
 * than the rest of the page.
 */
export const DEFAULT_VISIBLE_ROWS = 8;

export interface RankedBarRow {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  barPercent: number;
  sharePercent: number;
  /** Overrides the default single hue - only for a chart where series identity matters. */
  color?: string;
}

interface RankedBarsProps {
  rows: RankedBarRow[];
  /** Column heading for the value, e.g. "Tokens". */
  valueLabel: string;
  /** Renders the raw number for display; the bar reads the number itself. */
  formatValue: (value: number) => string;
  /** Hidden caption naming what the table shows, for screen readers. */
  caption: string;
  /** Hides the share column where a share of the total is meaningless (e.g. latency). */
  showShare?: boolean;
  emptyMessage?: string;
  /** Rows visible before "see more". Pass Infinity to always show everything. */
  visibleRows?: number;
  /** Plural noun for the see-more button, e.g. "countries". */
  itemNoun?: string;
}

/**
 * A ranked list drawn as a table with a bar in each row.
 *
 * Deliberately one component rather than a bar chart plus a separate table
 * view: the table IS the chart here, so every value is readable as text
 * without a tooltip, sorting is implicit in the row order, and there's no
 * second markup path to keep in sync. Long model names get a whole column
 * instead of being crushed into an x-axis.
 *
 * One hue for every bar, because these categories have no natural order -
 * colouring each bar darker-where-bigger would double-encode the length the
 * bar already shows.
 */
export function RankedBars({
  rows,
  valueLabel,
  formatValue,
  caption,
  showShare = true,
  emptyMessage = 'No traffic in this window yet.',
  visibleRows = DEFAULT_VISIBLE_ROWS,
  itemNoun = 'rows',
}: RankedBarsProps) {
  const [expanded, setExpanded] = useState(false);

  if (rows.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  const isTruncated = rows.length > visibleRows;
  const shown = isTruncated && !expanded ? rows.slice(0, visibleRows) : rows;

  return (
    <>
    <table className={styles.table}>
      <caption className={styles.caption}>{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className={styles.rank}>
            #
          </th>
          <th scope="col">Name</th>
          <th scope="col" className={styles.barHeader}>
            {valueLabel}
          </th>
          <th scope="col" className={styles.numeric}>
            {valueLabel}
          </th>
          {showShare && (
            <th scope="col" className={styles.numeric}>
              Share
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {shown.map((row, index) => (
          <tr key={row.key}>
            <td className={styles.rank}>{index + 1}</td>
            <th scope="row" className={styles.label}>
              <span className={styles.labelText}>{row.label}</span>
              {row.sublabel && <span className={styles.sublabel}>{row.sublabel}</span>}
            </th>
            <td className={styles.barCell}>
              {/* Presentation only: the adjacent cells carry the number and
                  the share as text, so nothing here is the sole encoding. */}
              <span className={styles.track} aria-hidden="true">
                <span
                  className={styles.bar}
                  style={{
                    width: `${Math.max(row.barPercent, row.value > 0 ? 1.5 : 0)}%`,
                    background: row.color ?? VIZ_PRIMARY,
                  }}
                />
              </span>
            </td>
            <td className={styles.numeric}>{formatValue(row.value)}</td>
            {showShare && (
              <td className={`${styles.numeric} ${styles.share}`}>
                {row.sharePercent >= 0.1 ? `${row.sharePercent.toFixed(1)}%` : '<0.1%'}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>

    {isTruncated && (
      <button
        type="button"
        className={styles.seeMore}
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded
          ? `Show top ${visibleRows}`
          : `Show all ${rows.length} ${itemNoun} (${rows.length - visibleRows} more)`}
      </button>
    )}
    </>
  );
}
