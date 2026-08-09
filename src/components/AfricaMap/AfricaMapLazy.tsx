import { Suspense, lazy } from 'react';
import type { ComponentProps } from 'react';
import type { AfricaMap } from './AfricaMap';
import styles from './AfricaMap.module.scss';

// -----------------------------------------------------------------------
// The globe, split off from the homepage bundle.
//
// AfricaMap pulls in the world's coastlines and d3-geo. That is ~170 KB of
// geometry the hero's headline has no reason to wait for, and it is the
// heaviest thing on the site - so it loads on its own, after the text is
// already on screen, and only on the one page that draws it.
//
// The fallback is not a spinner. It reserves exactly the box the globe will
// occupy, computed the same way AfricaMap computes it, so the page does not
// reflow when the chunk lands. An empty div of the right height is a better
// loading state than a spinner that shifts the layout when it leaves.
// -----------------------------------------------------------------------

const AfricaMapImpl = lazy(() =>
  import('./AfricaMap').then((module) => ({ default: module.AfricaMap }))
);

type AfricaMapProps = ComponentProps<typeof AfricaMap>;

export function AfricaMapLazy(props: AfricaMapProps) {
  return (
    <Suspense fallback={<div className={styles.placeholder} aria-hidden="true" />}>
      <AfricaMapImpl {...props} />
    </Suspense>
  );
}
