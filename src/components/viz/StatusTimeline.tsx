import { Fragment, useId, useState } from 'react';
import type { RecordedState, Sample } from '../../lib/statusHistory';
import styles from './StatusTimeline.module.scss';

interface StatusTimelineProps {
  samples: Sample[];
  label: string;
  /**
   * How many cells to reserve, so every service's strip shares one x scale.
   *
   * Pass the longest history on the page rather than a fixed number: a fixed
   * ceiling leaves a third of every strip empty for the first hour, which reads
   * as missing data rather than as a young window.
   */
  slots?: number;
  /** How far apart consecutive checks are meant to be. Anything much larger is a gap. */
  expectedIntervalMs?: number;
}

/**
 * A gap is drawn once the interval stretches past this multiple of the
 * expected one. Generous, because a throttled background timer or a slow
 * round legitimately runs late by a few seconds and that is not a gap.
 */
const GAP_FACTOR = 2.5;

// -----------------------------------------------------------------------
// State is encoded TWICE - height as well as colour - and that is not a
// stylistic flourish.
//
// The three status tones on this site are green #2f9e6a, amber #d99013 and red
// #d24b3c on dark, and their light-theme counterparts. Run through the
// colour-vision check, the amber/red pair separates by only ΔE 7.6 for normal
// vision and 4.9 under deuteranopia on the light theme; amber/green manages 7.8
// under protanopia on dark. Those are below the ΔE 8 floor, which means a
// meaningful number of readers cannot reliably tell "slow" from "not
// responding" by colour.
//
// Widening the palette is not available - these are the site's reserved status
// tones and a status colour must never drift toward a series colour. So the
// second channel carries the same information: a healthy check is a short tick
// at the baseline, slow is half height, down is the full bar. The strip reads
// as "problems spike", it survives greyscale and forced-colors, and every cell
// still carries its own text label for a screen reader.
// -----------------------------------------------------------------------
const HEIGHT_RATIO: Record<RecordedState, number> = {
  operational: 0.3,
  degraded: 0.62,
  down: 1,
};

const STATE_LABEL: Record<RecordedState, string> = {
  operational: 'Operational',
  degraded: 'Slow',
  down: 'Not responding',
};

function formatClock(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatGap(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

/**
 * One cell per check, oldest on the left.
 *
 * The familiar status-page strip, honestly scoped: these are this browser's own
 * checks over the stored window, not an uptime record. Hovering or focusing a
 * cell names the state and the time it was taken.
 */
export function StatusTimeline({
  samples,
  label,
  slots = 60,
  expectedIntervalMs = 60_000,
}: StatusTimelineProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const titleId = useId();

  const shown = samples.slice(-slots);
  // Left-padded with blanks so every service's newest check sits at the same
  // x position, whatever its own history length. Without this a service added
  // later would draw its first check under another service's hour-old one.
  const padding = Math.max(0, slots - shown.length);

  if (shown.length === 0) {
    return <p className={styles.empty}>No checks recorded yet.</p>;
  }

  const active = activeIndex !== null ? shown[activeIndex] : null;
  const counts = shown.reduce<Record<string, number>>((accumulator, sample) => {
    accumulator[sample.state] = (accumulator[sample.state] ?? 0) + 1;
    return accumulator;
  }, {});

  return (
    <div className={styles.wrap}>
      <div
        className={styles.strip}
        role="img"
        aria-labelledby={titleId}
        onPointerLeave={() => setActiveIndex(null)}
      >
        {Array.from({ length: padding }, (_, index) => (
          <span key={`pad-${index}`} className={styles.pad} aria-hidden="true" />
        ))}

        {shown.map((sample, index) => {
          // The strip has no time axis - one cell is one check, and adjacency
          // is read as "a minute apart". That stops being true whenever
          // checking paused: a hidden tab, a closed laptop, a browser reopened
          // three hours later. Without a break drawn here, two cells either
          // side of a four-hour gap would look like consecutive minutes, and
          // an outage that ended overnight would read as one that just ended.
          const previous = shown[index - 1];
          const gapMs = previous ? sample.at - previous.at : 0;
          const isAfterGap = previous !== undefined && gapMs > expectedIntervalMs * GAP_FACTOR;

          return (
            <Fragment key={sample.at}>
              {isAfterGap && (
                <span
                  className={styles.gap}
                  title={`No checks for ${formatGap(gapMs)} — the page was not open`}
                  aria-label={`Gap: no checks for ${formatGap(gapMs)}`}
                />
              )}

              {/* A button rather than a div: each cell is a real hit target,
                  reachable by keyboard, and the hit area is the full column
                  height even though the mark inside it may be a third of that. */}
              <button
                type="button"
                className={styles.cell}
                data-state={sample.state}
                data-active={index === activeIndex || undefined}
                onPointerEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                aria-label={`${formatClock(sample.at)}: ${STATE_LABEL[sample.state]}${
                  sample.latencyMs !== null ? `, ${sample.latencyMs} ms` : ''
                }`}
              >
                <span
                  className={styles.mark}
                  style={{ height: `${HEIGHT_RATIO[sample.state] * 100}%` }}
                />
              </button>
            </Fragment>
          );
        })}
      </div>

      <p id={titleId} className={styles.summary}>
        {active ? (
          <>
            <span className={styles.summaryState} data-state={active.state}>
              {STATE_LABEL[active.state]}
            </span>{' '}
            at {formatClock(active.at)}
            {active.latencyMs !== null && ` · ${active.latencyMs} ms`}
          </>
        ) : (
          `${label}: ${shown.length} checks · ${counts.operational ?? 0} operational, ${
            counts.degraded ?? 0
          } slow, ${counts.down ?? 0} not responding`
        )}
      </p>
    </div>
  );
}
