import { useId, useLayoutEffect, useRef, useState } from 'react';
import { VIZ_AXIS, VIZ_GRID, VIZ_PRIMARY } from '../../lib/viz/palette';
import { formatShortDate } from '../../lib/rankings';
import styles from './TrendChart.module.scss';

export interface TrendDatum {
  date: string;
  value: number;
}

interface TrendChartProps {
  data: TrendDatum[];
  /** Names the one series - there's no legend, because there's nothing to tell apart. */
  seriesLabel: string;
  formatValue: (value: number) => string;
  height?: number;
}

const PADDING = { top: 12, right: 8, bottom: 26, left: 8 };
const DEFAULT_WIDTH = 720;
const TICK_COUNT = 4;

/**
 * Daily volume over the window: one series, so an area in the lead hue with
 * no legend (the heading names it) and no number on every point.
 *
 * The hover layer is a single full-height overlay that resolves to the
 * nearest point, rather than per-point hit targets - at 90 daily points those
 * would be a few pixels wide each.
 */
export function TrendChart({ data, seriesLabel, formatValue, height = 220 }: TrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
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

  if (data.length === 0) {
    return <p className={styles.empty}>No traffic in this window yet.</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const x = (index: number) =>
    PADDING.left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const y = (value: number) => PADDING.top + plotHeight - (value / max) * plotHeight;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.value)}`).join(' ');
  const areaPath = `${linePath} L${x(data.length - 1)},${PADDING.top + plotHeight} L${x(0)},${
    PADDING.top + plotHeight
  } Z`;

  // Enough ticks to orient, not enough to crowd — first, last, and a couple between.
  const tickIndexes = Array.from({ length: Math.min(TICK_COUNT, data.length) }, (_, i) =>
    Math.round((i / Math.max(1, Math.min(TICK_COUNT, data.length) - 1)) * (data.length - 1))
  );

  const active = activeIndex !== null ? data[activeIndex] : null;

  const handlePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offset = event.clientX - rect.left - PADDING.left;
    const ratio = Math.max(0, Math.min(1, offset / plotWidth));
    setActiveIndex(Math.round(ratio * (data.length - 1)));
  };

  return (
    <div className={styles.wrap} ref={containerRef}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${w} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-labelledby={titleId}
        onPointerMove={handlePointer}
        onPointerLeave={() => setActiveIndex(null)}
      >
        <title id={titleId}>
          {seriesLabel} per day, {formatShortDate(data[0].date)} to{' '}
          {formatShortDate(data[data.length - 1].date)}. Peak {formatValue(max)}.
        </title>

        <line
          x1={PADDING.left}
          x2={w - PADDING.right}
          y1={PADDING.top + plotHeight}
          y2={PADDING.top + plotHeight}
          style={{ stroke: VIZ_AXIS }}
          strokeWidth="1"
        />
        <line
          x1={PADDING.left}
          x2={w - PADDING.right}
          y1={PADDING.top + plotHeight / 2}
          y2={PADDING.top + plotHeight / 2}
          style={{ stroke: VIZ_GRID }}
          strokeWidth="1"
        />

        <path d={areaPath} style={{ fill: VIZ_PRIMARY }} fillOpacity="0.16" />
        <path d={linePath} fill="none" style={{ stroke: VIZ_PRIMARY }} strokeWidth="2" strokeLinejoin="round" />

        {tickIndexes.map((index) => (
          <text
            key={index}
            x={x(index)}
            y={height - 8}
            className={styles.tick}
            textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}
          >
            {formatShortDate(data[index].date)}
          </text>
        ))}

        {activeIndex !== null && active && (
          <g pointerEvents="none">
            <line
              x1={x(activeIndex)}
              x2={x(activeIndex)}
              y1={PADDING.top}
              y2={PADDING.top + plotHeight}
              style={{ stroke: VIZ_AXIS }}
              strokeWidth="1"
            />
            {/* 2px surface ring so the marker reads over the area fill. */}
            <circle
              cx={x(activeIndex)}
              cy={y(active.value)}
              r="5"
              style={{ fill: VIZ_PRIMARY }}
              stroke="#1d2328"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Live region, so a keyboard/AT user gets the same read-out as hover.
          The figures also exist in the sections below - this never gates a value. */}
      <p className={styles.readout} role="status">
        {active
          ? `${formatShortDate(active.date)}: ${formatValue(active.value)} ${seriesLabel.toLowerCase()}`
          : `Peak ${formatValue(max)} ${seriesLabel.toLowerCase()} in a day`}
      </p>
    </div>
  );
}
