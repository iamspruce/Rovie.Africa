import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getAfricaFeatureCollection } from '../../lib/d3/geoData';
import { buildCountryPaths, createProjection } from '../../lib/d3/projection';
import { findByAlpha2, findByNumericId } from '../../lib/d3/africaCountries';
import { VIZ_EMPTY, sequentialFor, sequentialStep } from '../../lib/viz/palette';
import { usePrefersDark } from '../../hooks/usePrefersDark';
import { formatCompactNumber } from '../../lib/rankings';
import type { CountryUsage } from '../../lib/rankings';
import styles from './AfricaUsageMap.module.scss';

interface AfricaUsageMapProps {
  countries: CountryUsage[];
  height?: number;
}

const DEFAULT_WIDTH = 560;
const ASPECT = 1.02;

/**
 * Usage by country, as a choropleth.
 *
 * This is the section no aggregator outside the continent can publish -
 * it exists because User.country is captured at signup and User.id is
 * LiteLLM's user_id, so the spend rollups join straight onto a country.
 *
 * A country with no traffic is painted as "nothing here", visibly distinct
 * from the ramp's lowest step - "no developers yet" and "a few developers"
 * are different facts and the map shouldn't blur them.
 *
 * The table beside this map is not a fallback: it's where the exact figures
 * live, so no value is reachable only by hovering a shape.
 */
export function AfricaUsageMap({ countries, height }: AfricaUsageMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
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

  const usageByAlpha2 = useMemo(() => {
    const map = new Map<string, CountryUsage>();
    countries.forEach((entry) => map.set(entry.country.toUpperCase(), entry));
    return map;
  }, [countries]);

  const maxTokens = useMemo(
    () => Math.max(0, ...countries.map((entry) => entry.tokens)),
    [countries]
  );

  // "More" is the step furthest from the page, so the ramp runs toward light
  // on the dark theme and toward dark on the light one. This is the one colour
  // decision here that CSS can't make, because the step is picked from data.
  const ramp = sequentialFor(usePrefersDark());

  const w = width > 0 ? width : DEFAULT_WIDTH;
  const h = height ?? Math.round(w * ASPECT);

  const paths = useMemo(() => {
    const collection = getAfricaFeatureCollection();
    const { pathGenerator } = createProjection(collection, { width: w, height: h, padding: 8 });
    return buildCountryPaths(collection, pathGenerator);
  }, [w, h]);

  const hoveredUsage = hovered ? usageByAlpha2.get(hovered) : null;
  const hoveredName = hovered ? (findByAlpha2(hovered)?.name ?? null) : null;

  return (
    <div className={styles.wrap} ref={containerRef}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>
          {countries.length > 0
            ? `Token usage across ${countries.length} African countries. Highest: ${
                countries[0]?.country
              } at ${formatCompactNumber(countries[0]?.tokens ?? 0)} tokens.`
            : 'No country usage recorded in this window yet.'}
        </title>
        {paths.map((path) => {
          const country = findByNumericId(path.id);
          const usage = country ? usageByAlpha2.get(country.alpha2) : undefined;
          const fill = usage ? sequentialStep(usage.tokens, maxTokens, ramp) : VIZ_EMPTY;
          return (
            <path
              key={path.id}
              d={path.d}
              // Both go through style rather than presentation attributes:
              // the fill can be a themed var(), and a presentation attribute
              // would paint nothing for it.
              style={{ fill, stroke: 'var(--rv-bg)' }}
              strokeWidth="0.75"
              className={usage ? styles.active : styles.inactive}
              onPointerEnter={() => country && setHovered(country.alpha2)}
              onPointerLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>

      <div className={styles.legend} aria-hidden="true">
        <span className={styles.legendLabel}>Less</span>
        {ramp.map((step) => (
          <span key={step} className={styles.swatch} style={{ background: step }} />
        ))}
        <span className={styles.legendLabel}>More</span>
        <span className={styles.swatch} style={{ background: VIZ_EMPTY }} />
        <span className={styles.legendLabel}>No traffic</span>
      </div>

      <p className={styles.readout} role="status">
        {hoveredUsage
          ? `${hoveredName ?? hovered}: ${formatCompactNumber(hoveredUsage.tokens)} tokens · ${
              hoveredUsage.developers
            } ${hoveredUsage.developers === 1 ? 'developer' : 'developers'}${
              hoveredUsage.topModel ? ` · mostly ${hoveredUsage.topModel}` : ''
            }`
          : hovered
            ? `${hoveredName ?? hovered}: no traffic in this window`
            : 'Hover a country, or read the table for exact figures.'}
      </p>
    </div>
  );
}

