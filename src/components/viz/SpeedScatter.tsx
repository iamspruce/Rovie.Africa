import { useId, useLayoutEffect, useRef, useState } from 'react';
import { VIZ_AXIS, VIZ_GRID, VIZ_PRIMARY } from '../../lib/viz/palette';
import { formatDuration } from '../../lib/rankings';
import type { ModelLatency } from '../../lib/rankings';
import styles from './SpeedScatter.module.scss';

interface SpeedScatterProps {
  models: ModelLatency[];
  height?: number;
}

const PADDING = { top: 16, right: 16, bottom: 40, left: 52 };
const DEFAULT_WIDTH = 640;
/** Direct-label this many leaders; the rest are reachable by hover and in the table. */
const LABELLED = 3;

/**
 * Throughput against time-to-first-token: fast to start, and fast to finish.
 *
 * One hue for every point, not one per model. A scatter compares all pairs
 * at once, where the palette only guarantees three mutually-distinguishable
 * hues - and identity here is carried by the direct labels on the leaders
 * plus the table underneath, which is a better channel than colour anyway.
 */
export function SpeedScatter({ models, height = 300 }: SpeedScatterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [activeModel, setActiveModel] = useState<string | null>(null);
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

  // Only models whose provider reported a first-token time can be placed on
  // this plot; the rest are still ranked in the table below.
  const plotted = models.filter((model) => model.medianFirstTokenMs !== null);

  if (plotted.length === 0) {
    return (
      <p className={styles.empty}>
        Not enough timed requests yet to compare speed. A model needs a steady stream of traffic
        before a median means anything.
      </p>
    );
  }

  const w = width > 0 ? width : DEFAULT_WIDTH;
  const plotWidth = Math.max(1, w - PADDING.left - PADDING.right);
  const plotHeight = Math.max(1, height - PADDING.top - PADDING.bottom);

  const maxTtft = Math.max(...plotted.map((m) => m.medianFirstTokenMs!), 1);
  const maxTps = Math.max(...plotted.map((m) => m.medianTokensPerSecond), 1);

  const x = (ttft: number) => PADDING.left + (ttft / maxTtft) * plotWidth;
  const y = (tps: number) => PADDING.top + plotHeight - (tps / maxTps) * plotHeight;

  const active = plotted.find((model) => model.model === activeModel) ?? null;

  return (
    <div className={styles.wrap} ref={containerRef}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${w} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>
          Output speed against time to first token for {plotted.length} models. Faster models sit
          toward the top left. Exact figures are in the table below.
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
          x2={PADDING.left}
          y1={PADDING.top}
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

        {plotted.map((model, index) => {
          const cx = x(model.medianFirstTokenMs!);
          const cy = y(model.medianTokensPerSecond);
          const isActive = model.model === activeModel;
          return (
            <g key={model.model}>
              {/* Generous invisible hit area — the visible dot is 9px across
                  and would otherwise need pixel-accurate pointing. */}
              <circle
                cx={cx}
                cy={cy}
                r="14"
                fill="transparent"
                onPointerEnter={() => setActiveModel(model.model)}
                onPointerLeave={() => setActiveModel(null)}
              />
              <circle
                cx={cx}
                cy={cy}
                r={isActive ? 6.5 : 4.5}
                style={{ fill: VIZ_PRIMARY }}
                stroke="#1d2328"
                strokeWidth="2"
                pointerEvents="none"
              />
              {index < LABELLED && (
                <text
                  x={cx + 10}
                  y={cy + 4}
                  className={styles.pointLabel}
                  pointerEvents="none"
                >
                  {model.model}
                </text>
              )}
            </g>
          );
        })}

        <text x={PADDING.left} y={height - 8} className={styles.axisLabel}>
          Time to first token →
        </text>
        <text
          x={-(PADDING.top + plotHeight / 2)}
          y={14}
          transform="rotate(-90)"
          textAnchor="middle"
          className={styles.axisLabel}
        >
          Tokens/sec →
        </text>
      </svg>

      <p className={styles.readout} role="status">
        {active
          ? `${active.model}: ${active.medianTokensPerSecond} tokens/sec, first token in ${formatDuration(
              active.medianFirstTokenMs
            )} (median of ${active.requests.toLocaleString()} requests)`
          : 'Top left is fastest. Hover a point, or read the table below.'}
      </p>
    </div>
  );
}
