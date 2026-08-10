import {
  HORIZONTAL_MARK_STROKE_WIDTH,
  HORIZONTAL_MARK_TRANSFORM,
  HORIZONTAL_VIEWBOX,
  MARK_PATHS,
  MARK_STROKE_WIDTH,
  MARK_TRANSFORM,
  MARK_VIEWBOX,
  WORDMARK_PATH,
  WORDMARK_TRANSFORM,
} from '../../assets/logo.generated';
import styles from './Logo.module.scss';

/**
 * The Rovie logo, in its two official lockups.
 *
 * The artwork is a build-time constant baked from public/logos/*.svg - see
 * scripts/build-logo.mjs, and run `npm run logo:build` after replacing an SVG.
 *
 * Every stroke and fill is `currentColor`. The brand files also ship as
 * "-inverted" white-on-black variants, and the app deliberately does not use
 * them: a logo that inherits its colour follows the theme, the plate, the
 * footer watermark and a hover state for free, where a second file would only
 * cover one of those. Set `color` - or the `--logo-color` custom property - on
 * any ancestor to change it.
 */
interface LogoProps {
  /**
   * `mark` is the nested-Africa symbol alone, for square slots.
   * `horizontal` is the symbol plus the wordmark, for the header and footer.
   */
  variant?: 'mark' | 'horizontal';
  /**
   * Rendered height in px. Width follows the lockup's own aspect ratio, which
   * is why this is a height and not a size - the two lockups are very
   * different shapes and pinning width would make them different heights.
   */
  height?: number;
  /**
   * The logo is decorative by default: it sits inside a link that already
   * carries its own accessible name. Pass a title only where it stands alone.
   */
  title?: string;
  className?: string;
}

const RATIOS = {
  mark: aspectOf(MARK_VIEWBOX),
  horizontal: aspectOf(HORIZONTAL_VIEWBOX),
} as const;

function aspectOf(viewBox: string): number {
  const [, , width, height] = viewBox.split(/\s+/).map(Number);
  return width / height;
}

export function Logo({ variant = 'horizontal', height = 28, title, className }: LogoProps) {
  const isHorizontal = variant === 'horizontal';
  const viewBox = isHorizontal ? HORIZONTAL_VIEWBOX : MARK_VIEWBOX;

  return (
    <svg
      className={[styles.logo, className].filter(Boolean).join(' ')}
      width={Math.round(height * RATIOS[variant])}
      height={height}
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}

      <g
        transform={isHorizontal ? HORIZONTAL_MARK_TRANSFORM : MARK_TRANSFORM}
        fill="none"
        stroke="currentColor"
        strokeWidth={isHorizontal ? HORIZONTAL_MARK_STROKE_WIDTH : MARK_STROKE_WIDTH}
        strokeLinejoin="round"
      >
        {MARK_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {isHorizontal ? (
        <g transform={WORDMARK_TRANSFORM}>
          <path d={WORDMARK_PATH} fill="currentColor" />
        </g>
      ) : null}
    </svg>
  );
}
