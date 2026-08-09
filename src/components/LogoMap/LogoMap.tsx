import { LOGO_AFRICA_CENTER, LOGO_AFRICA_PATH, LOGO_SIZE } from '../../assets/geo/logo.generated';
import styles from './LogoMap.module.scss';

// Three concentric copies of the continent - the mark reads as a signal
// radiating out from it.
const RINGS = [1, 0.75, 0.5];

const [CENTER_X, CENTER_Y] = LOGO_AFRICA_CENTER;

/**
 * The wordmark's Africa.
 *
 * The outline is a build-time constant (see scripts/build-geo.mjs). It used to
 * be projected here at module load, which meant this component - which renders
 * in the header and the footer of every single route - pulled d3-geo,
 * topojson-client and a 739 KB world atlas into the entry bundle to compute
 * one path string that is identical on every visit.
 */
interface LogoMapProps {
  size?: number;
}

export function LogoMap({ size = 28 }: LogoMapProps) {
  return (
    <svg
      className={styles.icon}
      width={size}
      height={size}
      viewBox={`0 0 ${LOGO_SIZE} ${LOGO_SIZE}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {RINGS.map((scale) => (
        <path
          key={scale}
          d={LOGO_AFRICA_PATH}
          fill="none"
          strokeWidth={12}
          transform={
            scale === 1
              ? undefined
              : `translate(${CENTER_X},${CENTER_Y}) scale(${scale}) translate(${-CENTER_X},${-CENTER_Y})`
          }
        />
      ))}
    </svg>
  );
}
