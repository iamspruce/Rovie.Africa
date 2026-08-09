import { DEVELOPER_NAV } from '../../content/navLinks';
import styles from './NavDropdown.module.scss';

// One mark per developer destination, keyed by destination.
//
// They live here rather than in content/navLinks because an icon is a
// presentation decision, not part of what the destination is - the mobile
// sheet lists the same four and doesn't draw any.
//
// Drawn rather than imported: four 24x24 line marks at a common 1.5 stroke,
// on currentColor so they follow the row's hover state, is a few hundred bytes
// against an icon set's several thousand.
//
// Three of the four keys are absolute URLs into docs.rovie.africa, read out of
// DEVELOPER_NAV rather than retyped - a typo here loses the icon silently, and
// there is nothing on the page to notice it by.
const [DOCS, API_REFERENCE, SDKS, STATUS] = DEVELOPER_NAV.map((link) => link.to);

const PATHS: Record<string, React.ReactNode> = {
  // A page with lines on it.
  [DOCS]: (
    <>
      <path d="M5 3.75h9.5L19 8.25V20.25H5z" />
      <path d="M14 3.75v4.5h4.75" />
      <path d="M8.25 12.5h7.5M8.25 16h5" />
    </>
  ),
  // Angle brackets: the reference is the shape of the request itself.
  [API_REFERENCE]: (
    <>
      <path d="M8.75 8.5 4.5 12l4.25 3.5" />
      <path d="M15.25 8.5 19.5 12l-4.25 3.5" />
      <path d="M13.25 5.5 10.75 18.5" />
    </>
  ),
  // A package, which is what an SDK is.
  [SDKS]: (
    <>
      <path d="M12 3.75 20 8v8l-8 4.25L4 16V8z" />
      <path d="M4 8l8 4.25L20 8" />
      <path d="M12 12.25v8" />
    </>
  ),
  // A trace, because status is a reading over time and not a state you set.
  [STATUS]: (
    <>
      <path d="M3.75 12.5h3.5l2-5.5 3 11 2.25-6.5 1.5 3h4.25" />
    </>
  ),
};

/** Nothing at all for a route with no mark, rather than a placeholder box. */
export function NavIcon({ to }: { to: string }) {
  const paths = PATHS[to];
  if (!paths) return null;

  return (
    <svg
      className={styles.itemIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}
