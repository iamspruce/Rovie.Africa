import { useId } from 'react';
import type { Sample } from '../../lib/statusHistory';
import styles from './Sparkline.module.scss';

interface SparklineProps {
  samples: Sample[];
  /** Colour of the line. One series, so this is identity, not magnitude. */
  color: string;
  /** Names the series for assistive tech - the row's heading is not enough on its own. */
  label: string;
  width?: number;
  height?: number;
}

/**
 * One service's latency across the window, at row size.
 *
 * No axes, no grid, no legend and no tooltip: at 96x24 there is no room for
 * any of them and nothing would be readable if there were. It answers one
 * question - has this been steady, or is it all over the place - and the exact
 * figures live in the row beside it and in the table view under the charts.
 *
 * Failed checks are drawn as a mark on the baseline rather than skipped. A
 * gap in the line would read as "no data", which is the opposite of what a
 * failure is: the most important reading in the window, not a missing one.
 */
export function Sparkline({ samples, color, label, width = 96, height = 24 }: SparklineProps) {
  const titleId = useId();

  if (samples.length < 2) {
    return <span className={styles.tooShort}>Not enough checks yet</span>;
  }

  const values = samples.map((sample) => sample.latencyMs ?? 0);
  // Against the window's own worst reading rather than a fixed ceiling: this
  // shows shape, and a service that never exceeds 200 ms should still fill the
  // box. Cross-service comparison is the big chart's job, and it shares one axis.
  const max = Math.max(...values, 1);
  const step = width / (samples.length - 1);

  const x = (index: number) => index * step;
  // 1px inset top and bottom so the stroke is not clipped at either extreme.
  const y = (value: number) => height - 1 - (value / max) * (height - 2);

  const line = samples
    .map((sample, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(sample.latencyMs ?? 0)}`)
    .join(' ');

  const failures = samples
    .map((sample, index) => ({ sample, index }))
    .filter((entry) => entry.sample.state === 'down');

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-labelledby={titleId}
      preserveAspectRatio="none"
    >
      <title id={titleId}>
        {`${label}: response time across the last ${samples.length} checks, ` +
          `peaking at ${max} ms` +
          (failures.length > 0 ? `, with ${failures.length} failed` : '')}
      </title>

      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />

      {/* Drawn after the line so a failure is never hidden under it. The
          surface-coloured ring is what keeps two adjacent failures readable as
          two rather than as one blob. */}
      {failures.map(({ index }) => (
        <circle
          key={index}
          cx={x(index)}
          cy={height - 1}
          r={2.5}
          className={styles.failure}
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}
