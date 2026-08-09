// -----------------------------------------------------------------------
// The chart palette, in JS.
//
// These values are mirrored from `$viz-categorical` / `$viz-sequential` in
// styles/abstracts/_variables.scss, which carries the full rationale. They
// live here as well because SVG fills are chosen from data at render time,
// and SCSS lists can't be read from a component - a `fill` picked per
// country or per provider has to come from JS.
//
// Change them in BOTH places, and re-run the colourblind validation before
// changing any value or the order. The ordering is the safety mechanism.
// -----------------------------------------------------------------------

/** Distinct series. Assign in order, never by rank, never cycled past the end. */
export const CATEGORICAL = [
  '#3987e5',
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
  '#e66767',
] as const;

/**
 * Magnitude, lowest step first.
 *
 * The direction has to follow the page, not the data: "more" is always the
 * step furthest from the background. On black that means the ramp climbs
 * toward light; on white it climbs toward dark. Same contract either way -
 * index 0 is the smallest value - so callers only choose which ramp, never
 * which end.
 */
export const SEQUENTIAL_DARK = ['#1c5cab', '#256abf', '#3987e5', '#6da7ec', '#b7d3f6'] as const;
export const SEQUENTIAL_LIGHT = ['#cfe1f4', '#a3c6e8', '#6ea7d8', '#3a7fbe', '#0d548f'] as const;

export function sequentialFor(prefersDark: boolean): readonly string[] {
  return prefersDark ? SEQUENTIAL_DARK : SEQUENTIAL_LIGHT;
}

// Chart chrome. These resolve through the theme's custom properties, so they
// flip with the page - a near-black "no data" fill would otherwise read as the
// largest value on a white background.
//
// They are var() references, which means they can only be applied through
// `style={{ ... }}` or a CSS class. An SVG *presentation attribute*
// (`fill="..."`) does not resolve custom properties, and will silently paint
// nothing. The data colours above stay literal for exactly that reason.
export const VIZ_PRIMARY = 'var(--rv-viz-primary)';
/** No data at all - distinct from the lowest step of the ramp, which means "a little". */
export const VIZ_EMPTY = 'var(--rv-viz-empty)';
export const VIZ_GRID = 'var(--rv-viz-grid)';
export const VIZ_AXIS = 'var(--rv-viz-axis)';

/**
 * A series colour by its fixed position in the set. Past the eighth series
 * this returns the "Other" grey rather than inventing a ninth hue - two
 * generated hues are indistinguishable under colour-vision deficiency, and
 * the tail should be folded (see `foldProviderTail`) before it gets here.
 */
export function categoricalAt(index: number): string {
  return CATEGORICAL[index] ?? VIZ_EMPTY;
}

/**
 * A ramp step for `value` against the largest value on show.
 *
 * Uses the square root of the ratio, not the ratio itself: usage across
 * countries is heavily skewed (one market can be 20x the next), and a linear
 * scale would paint everything except the leader in the darkest step and
 * leave the map unreadable. Ranks are preserved either way; the tooltip and
 * the table carry the exact figures.
 */
export function sequentialStep(
  value: number,
  max: number,
  ramp: readonly string[] = SEQUENTIAL_DARK
): string {
  if (!Number.isFinite(value) || value <= 0 || max <= 0) return VIZ_EMPTY;
  const position = Math.sqrt(Math.min(1, value / max));
  const index = Math.min(ramp.length - 1, Math.floor(position * ramp.length));
  return ramp[index];
}
