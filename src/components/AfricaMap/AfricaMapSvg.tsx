import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { GeoPath } from 'd3-geo';
import { getWorldFeatureCollection, getAfricaFeatureCollection } from '../../lib/d3/geoData';
import {
  createGlobeProjection,
  buildCountryPaths,
  getFeatureCentroid,
  getSphereOutlinePath,
  getGraticulePath,
  rotationForLonLat,
  getDefaultGlobeCenter,
} from '../../lib/d3/projection';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { findByAlpha2, findByNumericId, AFRICA_NUMERIC_IDS } from '../../lib/d3/africaCountries';
import { logoForFamily } from '../ModelLogo/logoSources';
import styles from './AfricaMap.module.scss';

const DRAG_SENSITIVITY = 0.35;
const MAX_PHI = 90;
// Pointer travel (px) beyond which a gesture counts as a globe drag rather
// than a country tap.
const CLICK_SLOP = 5;

// Where each model tag floats, in lon/lat. They're anchored to the globe
// itself, so they swing around as you spin it and disappear over the horizon.
const TAG_SLOTS: Array<[number, number]> = [
  [-52, 25],
  [4, 71],
  [70, 30],
  [62, -35],
  [14, -63],
];

const TAG_WIDTH = 196;
const TAG_HEIGHT = 46;
// Tag geometry is authored at this canvas width and scales with it, so the
// globe and everything hanging off it stay in proportion on any screen.
const TAG_REFERENCE_WIDTH = 900;

export interface MapModelTag {
  id: string;
  /** Model name, e.g. "Claude Sonnet". */
  name: string;
  /** What the reference amount buys, in the selected currency. */
  price: string;
  /** Family key from `modelFamily()` - picks the provider's mark. */
  family: string | null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// -----------------------------------------------------------------------
// The rest of the world, as one shape.
//
// Only African countries are interactive - they hover, they carry a tooltip,
// they can be clicked to reprice. Everything else is scenery, and drawing 127
// separate <path> elements of scenery meant React reconciled 127 elements and
// the browser reparsed 127 `d` attributes on every frame of a drag.
//
// As a single GeometryCollection it is one d3 call, one string and one element,
// and the per-frame element count drops from ~180 to ~56. Built once at module
// load: it depends on nothing that can change.
// -----------------------------------------------------------------------
const REST_OF_WORLD = {
  type: 'GeometryCollection' as const,
  geometries: getWorldFeatureCollection()
    .features.filter((f) => !AFRICA_NUMERIC_IDS.has(String(f.id)))
    .map((f) => f.geometry),
};

function restOfWorldPath(pathGenerator: GeoPath): string {
  return pathGenerator(REST_OF_WORLD as never) || '';
}

const TAG_LOGO_SIZE = 22;

/**
 * The provider's real mark, nested into the tag. The source art is 24x24, so
 * it is scaled to fit and drawn in the tag's text colour.
 */
function TagLogo({ family }: { family: string | null }) {
  const logo = logoForFamily(family);
  if (!logo) return null;
  const scale = TAG_LOGO_SIZE / 24;
  return (
    <g
      className={styles.tagLogo}
      transform={`translate(${-TAG_WIDTH / 2 + 12} ${-TAG_LOGO_SIZE / 2}) scale(${scale})`}
      fillRule={logo.fillRule as 'evenodd' | 'nonzero' | undefined}
      dangerouslySetInnerHTML={{ __html: logo.glyph }}
    />
  );
}

interface AfricaMapSvgProps {
  width: number;
  height: number;
  /** Empty space kept around the sphere so the model tags fit on-canvas. */
  padding?: number;
  /** Country to spotlight + auto-focus (the visitor's, or whatever they picked). */
  highlightAlpha2?: string;
  onSelectCountry?: (alpha2: string) => void;
  /** Price line shown in the hover tooltip, e.g. "$0.50 ≈ ₦775". */
  priceFor?: (alpha2: string) => string | null | undefined;
  /** Top models, priced in the selected currency, tethered to the globe. */
  tags?: MapModelTag[];
}

export function AfricaMapSvg({
  width,
  height,
  padding,
  highlightAlpha2,
  onSelectCountry,
  priceFor,
  tags = [],
}: AfricaMapSvgProps) {
  const world = useMemo(() => getWorldFeatureCollection(), []);
  const africa = useMemo(() => getAfricaFeatureCollection(), []);
  const africaCenter = useMemo(() => getDefaultGlobeCenter(africa), [africa]);

  const highlightedFeature = useMemo(() => {
    if (!highlightAlpha2) return undefined;
    const match = findByAlpha2(highlightAlpha2);
    if (!match) return undefined;
    return world.features.find((f) => String(f.id) === match.numericId) as Feature<Geometry> | undefined;
  }, [world, highlightAlpha2]);

  const [rotation, setRotation] = useState(() => rotationForLonLat(africaCenter));
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef: MutableRefObject<{
    startX: number;
    startY: number;
    startRotation: [number, number];
    moved: boolean;
  } | null> = useRef(null);
  const suppressClickRef = useRef(false);

  // Pointer events fire faster than the screen refreshes - up to 1000Hz on a
  // drawing tablet, and commonly 120Hz on a phone. Re-projecting the globe on
  // each one meant computing frames that were then thrown away without ever
  // being painted. Rotation is now applied at most once per animation frame,
  // with the newest pointer position winning.
  const frameRef = useRef<number | null>(null);
  const pendingRotationRef = useRef<[number, number] | null>(null);

  const scheduleRotation = useCallback((next: [number, number]) => {
    pendingRotationRef.current = next;
    if (frameRef.current !== null) return;

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const pending = pendingRotationRef.current;
      if (pending) setRotation(pending);
    });
  }, []);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  useEffect(() => {
    if (!highlightedFeature) return;
    setRotation(rotationForLonLat(getDefaultGlobeCenter(highlightedFeature as unknown as FeatureCollection)));
  }, [highlightedFeature]);

  const { pathGenerator, projection } = useMemo(
    () => createGlobeProjection({ width, height, padding, rotate: rotation }),
    [width, height, padding, rotation]
  );

  const sphereOutline = useMemo(() => getSphereOutlinePath(pathGenerator), [pathGenerator]);
  const graticule = useMemo(() => getGraticulePath(pathGenerator), [pathGenerator]);
  // Africa is the only part of this map anyone can interact with, so it is the
  // only part that needs an element per country. See REST_OF_WORLD.
  const countryPaths = useMemo(
    () => buildCountryPaths(africa, pathGenerator),
    [africa, pathGenerator]
  );
  const backdropPath = useMemo(() => restOfWorldPath(pathGenerator), [pathGenerator]);

  const markerCentroid = useMemo(() => {
    if (!highlightedFeature) return null;
    return getFeatureCentroid(highlightedFeature, pathGenerator);
  }, [highlightedFeature, pathGenerator]);

  const hovered = useMemo(() => {
    if (!hoveredId) return null;
    const country = findByNumericId(hoveredId);
    const feature = africa.features.find((f) => String(f.id) === hoveredId);
    if (!country || !feature) return null;
    const centroid = getFeatureCentroid(feature as Feature<Geometry>, pathGenerator);
    if (!centroid) return null;
    return { country, centroid };
  }, [hoveredId, africa, pathGenerator]);

  const tagScale = clamp(width / TAG_REFERENCE_WIDTH, 0.6, 1);
  const tagBox = { width: TAG_WIDTH * tagScale, height: TAG_HEIGHT * tagScale };

  // Push each tag outward from the globe's centre so the card sits just off
  // the surface, then keep it inside the canvas at any screen size.
  const tagPositions = useMemo(
    () =>
      tags
        .map((tag, index) => {
          // Spread however many tags there are around the whole globe rather
          // than bunching them into the first few slots.
          const slot =
            TAG_SLOTS[
              tags.length >= TAG_SLOTS.length
                ? index % TAG_SLOTS.length
                : Math.floor((index * TAG_SLOTS.length) / tags.length)
            ];
          const projected = projection(slot);
          if (!projected) return null;
          const dx = projected[0] - width / 2;
          const dy = projected[1] - height / 2;
          const distance = Math.hypot(dx, dy) || 1;
          const offset = 20 * tagScale;
          return {
            ...tag,
            point: [
              clamp(
                projected[0] + (dx / distance) * offset,
                tagBox.width / 2 + 2,
                width - tagBox.width / 2 - 2
              ),
              clamp(
                projected[1] + (dy / distance) * offset,
                tagBox.height / 2 + 2,
                height - tagBox.height / 2 - 2
              ),
            ] as [number, number],
          };
        })
        .filter((tag): tag is NonNullable<typeof tag> => tag !== null),
    [tags, projection, width, height, tagScale, tagBox.width, tagBox.height]
  );

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startRotation: rotation,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!dragStateRef.current) return;
    const { startX, startY, startRotation } = dragStateRef.current;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!dragStateRef.current.moved && Math.hypot(dx, dy) < CLICK_SLOP) return;

    if (!dragStateRef.current.moved) setIsDragging(true);
    dragStateRef.current.moved = true;
    scheduleRotation([
      startRotation[0] + dx * DRAG_SENSITIVITY,
      clamp(startRotation[1] - dy * DRAG_SENSITIVITY, -MAX_PHI, MAX_PHI),
    ]);
  }

  function handlePointerUp(event: React.PointerEvent<SVGSVGElement>) {
    suppressClickRef.current = Boolean(dragStateRef.current?.moved);
    dragStateRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleCountryClick(numericId: string) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    const country = findByNumericId(numericId);
    if (country && onSelectCountry) onSelectCountry(country.alpha2);
  }

  // The sphere is fit inside the padded box, so the lighting has to follow it
  // rather than the canvas.
  const radius = Math.max(Math.min(width, height) / 2 - (padding ?? 20), 1);
  const tooltipPrice = hovered && priceFor ? priceFor(hovered.country.alpha2) : null;
  const tooltipWidth = Math.max(
    112,
    Math.max(hovered?.country.name.length ?? 0, (tooltipPrice ?? '').length) * 7.2 + 24
  );
  const tooltipFlip = hovered ? hovered.centroid[0] + tooltipWidth + 16 > width : false;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label="Interactive globe highlighting Africa - drag to rotate, tap a country to price models in its currency"
      className={styles.svg}
      // Read by the stylesheet to drop the two drop-shadow filters and switch
      // off anti-aliased path rendering while the globe is moving. Both are
      // re-rasterised from scratch on every frame otherwise, and neither is
      // perceptible on geometry that is in motion.
      data-dragging={isDragging || undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => setHoveredId(null)}
    >
      <defs>
        {/* Lit from the upper-left: the ocean surface, the shading that
            darkens toward the limb, and the atmospheric rim beyond it. */}
        <radialGradient id="rovieGlobeFill" cx="34%" cy="28%" r="78%">
          <stop offset="0%" className={styles.stopOceanLit} />
          <stop offset="55%" className={styles.stopOceanMid} />
          <stop offset="100%" className={styles.stopOceanDark} />
        </radialGradient>
        <radialGradient id="rovieGlobeShade" cx="34%" cy="28%" r="76%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="86%" stopColor="#000" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.72" />
        </radialGradient>
        <radialGradient id="rovieGlobeAtmosphere" cx="50%" cy="50%" r="50%">
          <stop offset="72%" className={styles.stopAtmosphereInner} />
          <stop offset="88%" className={styles.stopAtmosphereMid} />
          <stop offset="100%" className={styles.stopAtmosphereOuter} />
        </radialGradient>
        <radialGradient id="rovieGlobeSpecular" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>

        {/* The routes run over the lit face of Africa, which is the same blue
            they are. The glow is what separates them from it. Nothing under
            either of these filters moves except during a drag, when the
            stylesheet switches them off - so each is rasterised once and
            reused until the globe is turned. */}
        <filter id="rovieRouteGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#8ecbf5" floodOpacity="0.6" />
        </filter>
        {/* Lifts the tag cards off the sphere so they read as overlay, not paint. */}
        <filter id="rovieTagShadow" x="-30%" y="-80%" width="160%" height="260%">
          <feDropShadow dx="0" dy="2" stdDeviation="3.5" floodColor="#000" floodOpacity="0.8" />
        </filter>
      </defs>

      {/* Atmosphere halo, drawn a touch larger than the sphere. */}
      <circle
        cx={width / 2}
        cy={height / 2}
        r={radius * 1.13}
        fill="url(#rovieGlobeAtmosphere)"
        pointerEvents="none"
      />

      <path d={sphereOutline} fill="url(#rovieGlobeFill)" className={styles.sphere} />
      <path d={graticule} className={styles.graticule} />

      {/* Every country that isn't African, in one path. Nothing here responds
          to a pointer, so nothing here needs to be its own element. */}
      <path
        d={backdropPath}
        className={styles.countryWorld}
        data-testid="rest-of-world"
        pointerEvents="none"
      />

      <g>
        {countryPaths.map((country: { id: string; d: string }, index: number) => {
          const isHighlighted = highlightedFeature && country.id === String(highlightedFeature.id);
          const isHovered = country.id === hoveredId;
          const className = [
            isHighlighted ? styles.countryHighlighted : styles.countryAfrica,
            isHovered ? styles.countryHovered : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <path
              key={`${country.id}-${index}`}
              d={country.d}
              data-testid={`country-${country.id}`}
              className={className}
              onPointerEnter={() => setHoveredId(country.id)}
              onClick={() => handleCountryClick(country.id)}
            />
          );
        })}
      </g>

      {/* Terminator shading + specular highlight, over the land so the whole
          sphere reads as one curved surface. */}
      <path d={sphereOutline} fill="url(#rovieGlobeShade)" pointerEvents="none" />
      <ellipse
        cx={width / 2 - radius * 0.34}
        cy={height / 2 - radius * 0.42}
        rx={radius * 0.42}
        ry={radius * 0.3}
        fill="url(#rovieGlobeSpecular)"
        pointerEvents="none"
      />
      <path d={sphereOutline} fill="none" className={styles.sphereStroke} />

      {markerCentroid && tagPositions.length > 0 && (
        <g className={styles.connections} filter="url(#rovieRouteGlow)" aria-hidden="true">
          {tagPositions.map((tag) => (
            <line
              key={tag.id}
              x1={markerCentroid[0]}
              y1={markerCentroid[1]}
              x2={tag.point[0]}
              y2={tag.point[1]}
            />
          ))}
        </g>
      )}

      {markerCentroid && (
        <g data-testid="visitor-marker" className={styles.markerGroup}>
          <circle cx={markerCentroid[0]} cy={markerCentroid[1]} r={11} className={styles.markerRing} />
          <circle cx={markerCentroid[0]} cy={markerCentroid[1]} r={5} className={styles.marker} />
        </g>
      )}

      {tagPositions.length > 0 && (
        <g
          className={styles.modelTags}
          filter="url(#rovieTagShadow)"
          aria-label="Top model prices in the selected currency"
        >
          {tagPositions.map((tag) => (
            <g
              key={tag.id}
              transform={`translate(${tag.point[0]} ${tag.point[1]}) scale(${tagScale})`}
            >
              <rect x={-TAG_WIDTH / 2} y={-TAG_HEIGHT / 2} width={TAG_WIDTH} height={TAG_HEIGHT} rx="10" />
              <TagLogo family={tag.family} />
              <text x={-TAG_WIDTH / 2 + 44} y="-3" className={styles.tagName}>
                {tag.name}
              </text>
              <text x={-TAG_WIDTH / 2 + 44} y="13" className={styles.tagPrice}>
                {tag.price}
              </text>
            </g>
          ))}
        </g>
      )}

      {hovered && (
        <g
          className={styles.tooltip}
          transform={`translate(${hovered.centroid[0]} ${hovered.centroid[1]})`}
          aria-hidden="true"
        >
          <line x1="0" y1="0" x2={tooltipFlip ? -14 : 14} y2="-14" className={styles.tooltipLeader} />
          <g transform={`translate(${tooltipFlip ? -tooltipWidth - 14 : 14} ${tooltipPrice ? -46 : -34})`}>
            <rect width={tooltipWidth} height={tooltipPrice ? 42 : 26} rx="7" />
            <text x="10" y="17" className={styles.tooltipName}>
              {hovered.country.name}
            </text>
            {tooltipPrice && (
              <text x="10" y="33" className={styles.tooltipPrice}>
                {tooltipPrice}
              </text>
            )}
          </g>
        </g>
      )}
    </svg>
  );
}
