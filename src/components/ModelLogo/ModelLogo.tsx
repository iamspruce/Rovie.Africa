import { logoForFamily } from './logoSources';
import styles from './ModelLogo.module.scss';

interface ModelLogoProps {
  /** Family key from `modelFamily()`, e.g. "gpt". */
  family: string | null;
  /** Provider name, used to label a family we have no mark for. */
  fallbackLabel: string;
  className?: string;
}

/**
 * A provider's own mark, for use in an HTML document. The marks are authored
 * at 1em with `currentColor`, so size and colour come from CSS.
 */
export function ModelLogo({ family, fallbackLabel, className = '' }: ModelLogoProps) {
  const logo = logoForFamily(family);

  if (!logo) {
    // No official mark on file - show the provider's initial rather than a
    // wrong logo.
    return (
      <span
        className={`${styles.logo} ${styles.fallback} ${className}`}
        role="img"
        aria-label={fallbackLabel}
      >
        {fallbackLabel.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <span
      className={`${styles.logo} ${className}`}
      role="img"
      aria-label={logo.label}
      dangerouslySetInnerHTML={{ __html: logo.svg }}
    />
  );
}
