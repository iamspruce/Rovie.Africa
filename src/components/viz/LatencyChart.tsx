import { useId, useLayoutEffect, useRef, useState } from 'react';
import { VIZ_AXIS, VIZ_GRID } from '../../lib/viz/palette';
import type { Sample } from '../../lib/statusHistory';
import styles from './LatencyChart.module.scss';

export interface LatencySeries {
  id: string;
  label: string;
  color: string;
  samples: Sample[];
}

interface LatencyChartProps {
  series: LatencySeries[];
  height?: number;
  /** Drawn as a rule, so "slow" is a line on the chart and not just a word in a table. */
  degradedAboveMs: number;
}

const PADDING = { top: 16, right: 92, bottom: 28, left: 46 };
const DEFAULT_WIDTH = 720;
const TICK_COUNT = 4;

function formatClock(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * Response time for every monitored service, on one shared axis.
 *
 * One axis, deliberately - every series is milliseconds, so they are directly
 * comparable, and that comparison is the whole reason this chart exists. Four
 * lines that rise together mean the connection they share; one line rising
 * alone means that service. A per-service chart cannot show either.
 *
 * Four series is the point at which colour alone stops being enough, so each
 * line is also labelled at its right-hand end - which is what the right padding
 * is for - and the legend above names all four regardless.
 */
export function LatencyChart({ series, height = 260, degradedAboveMs }: LatencyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [activeAt, setActiveAt] = useState<number | null>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    setWidth(node.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const w = width > 0 ? width : DEFAULT_WIDTH;
  const plotWidth = Math.max(1, w - PADDING.left - PADDING.right);
  const plotHeight = Math.max(1, height - PADDING.top - PADDING.bottom);

  // Every timestamp any series recorded. The services are probed in one round
  // so these line up, but a service added mid-session legitimately has fewer -
  // taking the union rather than one series' length keeps the x-axis honest.
  const times = Array.from(new Set(series.flatMap((s) => s.samples.map((sample) => sample.at)))).sort(
    (a, b) => a - b
  );

  if (times.length < 2) {
    return (
      <div className={styles.wrap} ref={containerRef}>
        <p className={styles.empty}>
          Two checks are needed before there is a shape to draw. The next one runs within a minute.
        </p>
      </div>
    );
  }

  // Scaled to the checks that SUCCEEDED, not to every reading.
  //
  // A failed check's duration is the client's timeout - eight seconds, every
  // time. Letting that set the ceiling pins the axis at 10,000 ms and squashes
  // the band everything actually lives in (100-400 ms) into a flat line along
  // the bottom, so the chart stops being able to answer its own question the
  // moment anything fails. Which is precisely when someone is reading it.
  //
  // Failures are not dropped - the line breaks at them and they are drawn as
  // marks pinned to the top of the plot, so they are more visible than before,
  // not less. Their exact durations are in the readout and the table.
  const succeeded = series.flatMap((s) =>
    s.samples.filter((sample) => sample.state !== 'down').map((sample) => sample.latencyMs ?? 0)
  );
  const peak = Math.max(...succeeded, degradedAboveMs, 1);
  // Rounded up to a clean step so the axis reads in round numbers rather than
  // "1847 ms".
  const max = niceCeiling(peak);

  const first = times[0];
  const span = Math.max(1, times[times.length - 1] - first);
  const x = (at: number) => PADDING.left + ((at - first) / span) * plotWidth;
  const y = (value: number) => PADDING.top + plotHeight - (value / max) * plotHeight;

  const yTicks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => (max / TICK_COUNT) * i);
  const xTickTimes = Array.from({ length: Math.min(TICK_COUNT, times.length) }, (_, i) =>
    times[Math.round((i / Math.max(1, Math.min(TICK_COUNT, times.length) - 1)) * (times.length - 1))]
  );

  const handlePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    // The SVG is scaled to its container, so client pixels are not user units.
    const scale = w / rect.width;
    const offset = (event.clientX - rect.left) * scale - PADDING.left;
    const ratio = Math.max(0, Math.min(1, offset / plotWidth));
    const target = first + ratio * span;

    // Nearest recorded time rather than the raw pointer position: the crosshair
    // must land on a check that happened, not between two of them.
    setActiveAt(
      times.reduce((best, at) => (Math.abs(at - target) < Math.abs(best - target) ? at : best), times[0])
    );
  };

  return (
    <div className={styles.wrap} ref={containerRef}>
      <ul className={styles.legend}>
        {series.map((s) => (
          <li key={s.id}>
            <span className={styles.swatch} style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>

      <svg
        className={styles.svg}
        viewBox={`0 0 ${w} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-labelledby={titleId}
        onPointerMove={handlePointer}
        onPointerLeave={() => setActiveAt(null)}
      >
        <title id={titleId}>
          {`Response time in milliseconds for ${series.length} services across ${times.length} checks, ` +
            `peaking at ${Math.round(peak)} ms.`}
        </title>

        {/* Solid hairlines, one shade off the surface. Dashes here would read as
            a threshold or a projection, which is what the degraded rule is. */}
        {yTicks.map((value) => (
          <g key={value}>
            <line
              x1={PADDING.left}
              x2={PADDING.left + plotWidth}
              y1={y(value)}
              y2={y(value)}
              stroke={VIZ_GRID}
              strokeWidth={1}
            />
            <text x={PADDING.left - 8} y={y(value) + 4} textAnchor="end" className={styles.tick}>
              {Math.round(value)}
            </text>
          </g>
        ))}

        {/* The one dashed line on the chart, and it earns it: this is a
            threshold, not data. Anything above it is counted as slow. */}
        <line
          x1={PADDING.left}
          x2={PADDING.left + plotWidth}
          y1={y(degradedAboveMs)}
          y2={y(degradedAboveMs)}
          className={styles.threshold}
        />
        <text x={PADDING.left + 4} y={y(degradedAboveMs) - 5} className={styles.thresholdLabel}>
          Slow above {degradedAboveMs} ms
        </text>

        {xTickTimes.map((at) => (
          <text key={at} x={x(at)} y={height - 8} textAnchor="middle" className={styles.tick}>
            {formatClock(at)}
          </text>
        ))}

        <line
          x1={PADDING.left}
          x2={PADDING.left + plotWidth}
          y1={PADDING.top + plotHeight}
          y2={PADDING.top + plotHeight}
          stroke={VIZ_AXIS}
          strokeWidth={1}
        />

        {activeAt !== null && (
          <line
            x1={x(activeAt)}
            x2={x(activeAt)}
            y1={PADDING.top}
            y2={PADDING.top + plotHeight}
            className={styles.crosshair}
          />
        )}

        {series.map((s) => {
          const drawable = s.samples.filter(
            (sample) => sample.state !== 'down' && sample.latencyMs !== null
          );
          if (drawable.length === 0) return null;

          return (
            <g key={s.id}>
              {/* One subpath per unbroken run of successful checks. Drawing
                  straight through a failure would assert a response time that
                  was never measured, and the join would slope through the gap
                  as if the service had merely been slow. */}
              {runsOf(s.samples).map((run) => (
                <path
                  key={run[0].at}
                  d={run
                    .map(
                      (sample, index) =>
                        `${index === 0 ? 'M' : 'L'}${x(sample.at)},${y(sample.latencyMs!)}`
                    )
                    .join(' ')}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}

              {/* Failures, pinned to the top of the plot in the series' own
                  colour with a danger-toned centre. Above the axis on purpose:
                  a failure took longer than anything on the scale, and putting
                  it at the ceiling says so. */}
              {s.samples
                .filter((sample) => sample.state === 'down')
                .map((sample) => (
                  <g key={sample.at}>
                    <line
                      x1={x(sample.at)}
                      x2={x(sample.at)}
                      y1={PADDING.top}
                      y2={PADDING.top + plotHeight}
                      stroke={s.color}
                      strokeWidth={1}
                      opacity={0.28}
                    />
                    <circle
                      cx={x(sample.at)}
                      cy={PADDING.top}
                      r={4}
                      className={styles.failure}
                    />
                  </g>
                ))}
            </g>
          );
        })}

        {/* Direct labels, laid out after every line so they can be nudged apart.
            Four series is where colour stops carrying identity on its own, so
            each line names itself - but four services that are all healthy sit
            within a few milliseconds of each other, and four labels at the same
            y is an unreadable smudge exactly when everything is fine. */}
        {layoutLabels(series, x, y, plotHeight).map((label) => (
          <text
            key={label.id}
            x={label.x + 8}
            y={label.y}
            className={styles.seriesLabel}
            style={{ fill: label.color }}
          >
            {label.text}
          </text>
        ))}

        {activeAt !== null &&
          series.map((s) => {
            const sample = s.samples.find((candidate) => candidate.at === activeAt);
            if (!sample || sample.latencyMs === null) return null;
            return (
              <circle
                key={s.id}
                cx={x(activeAt)}
                cy={y(sample.latencyMs)}
                r={4}
                fill={s.color}
                className={styles.marker}
                strokeWidth={2}
              />
            );
          })}
      </svg>

      {/* Reserved height, so the chart does not jump as the pointer enters it. */}
      <p className={styles.readout}>
        {activeAt !== null
          ? `${formatClock(activeAt)} · ${series
              .map((s) => {
                const sample = s.samples.find((candidate) => candidate.at === activeAt);
                if (!sample) return `${s.label} —`;
                return `${s.label} ${
                  sample.state === 'down' ? 'failed' : `${sample.latencyMs} ms`
                }`;
              })
              .join(' · ')}`
          : 'Hover the chart to read every service at one moment.'}
      </p>
    </div>
  );
}

/**
 * Splits a service's samples into unbroken runs of successful checks.
 *
 * A run of one is kept: a single good check between two failures is a real
 * reading, and dropping it because a line cannot be drawn through one point
 * would hide a service that is flapping rather than simply down.
 */
function runsOf(samples: Sample[]): Sample[][] {
  const runs: Sample[][] = [];
  let current: Sample[] = [];

  for (const sample of samples) {
    if (sample.state === 'down' || sample.latencyMs === null) {
      if (current.length > 0) runs.push(current);
      current = [];
    } else {
      current.push(sample);
    }
  }

  if (current.length > 0) runs.push(current);
  return runs;
}

interface PlacedLabel {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
}

const LABEL_LINE_HEIGHT = 12;

/**
 * Places one end-label per series, pushed apart so none overlaps another.
 *
 * Sorts by the y each label wants, then walks down keeping a minimum gap. The
 * result is nudged rather than repositioned: a label never moves further than
 * it has to, so it still reads as belonging to the line it names.
 */
function layoutLabels(
  series: LatencySeries[],
  x: (at: number) => number,
  y: (value: number) => number,
  plotHeight: number
): PlacedLabel[] {
  const wanted = series
    .map((s) => {
      const drawable = s.samples.filter(
        (sample) => sample.state !== 'down' && sample.latencyMs !== null
      );
      const last = drawable[drawable.length - 1];
      if (!last) return null;
      return {
        id: s.id,
        text: s.label,
        color: s.color,
        x: x(last.at),
        y: y(last.latencyMs!) + 4,
      };
    })
    .filter((label): label is PlacedLabel => label !== null)
    .sort((a, b) => a.y - b.y);

  let floor = -Infinity;
  for (const label of wanted) {
    label.y = Math.max(label.y, floor + LABEL_LINE_HEIGHT);
    floor = label.y;
  }

  // Pushing down can run the last label off the bottom of the plot. Shift the
  // whole stack back up by the overflow rather than clamping one label onto
  // another, which would undo the spacing this exists to create.
  const overflow = wanted.length > 0 ? wanted[wanted.length - 1].y - (PADDING.top + plotHeight) : 0;
  if (overflow > 0) wanted.forEach((label) => (label.y -= overflow));

  return wanted;
}

/** 1 → 1, 1.4k → 1.5k, 1.6k → 2k. Keeps the axis in figures people read back. */
function niceCeiling(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  return step * magnitude;
}
