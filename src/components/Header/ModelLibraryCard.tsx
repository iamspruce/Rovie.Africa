import { NavLink } from 'react-router-dom';
import { logoForFamily } from '../ModelLogo/logoSources';
import styles from './NavDropdown.module.scss';

// The marks people recognise the catalog by, in a fixed order. Providers, not
// model names: a provider Rovie routes to is a stable fact, whereas a list of
// model names hardcoded into a menu is out of date the week a new one ships,
// and this site doesn't state things it can't back up.
const FAMILIES = ['gpt', 'claude', 'gemini', 'llama', 'deepseek', 'qwen', 'mistral', 'grok'];

/**
 * The panel's second column: what is actually behind the API, and a way into
 * the catalog. The developer destinations on the left say how to call a model;
 * this says which ones there are.
 */
export function ModelLibraryCard() {
  return (
    <NavLink to="/models" className={styles.feature}>
      <span className={styles.featureMarks} aria-hidden="true">
        {FAMILIES.map((family) => {
          const logo = logoForFamily(family);
          if (!logo) return null;
          return (
            <span
              key={family}
              className={styles.featureMark}
              // Static build-time assets from @lobehub/icons-static-svg, drawn
              // at 1em in currentColor - never user input.
              dangerouslySetInnerHTML={{ __html: logo.svg }}
            />
          );
        })}
      </span>

      <span className={styles.featureLabel}>Model library</span>
      <span className={styles.featureDescription}>
        Every model Rovie routes to, priced in your currency
      </span>
    </NavLink>
  );
}
