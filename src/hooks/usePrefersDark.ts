import { useEffect, useState } from 'react';

const QUERY = '(prefers-color-scheme: dark)';

/**
 * Whether the visitor's system is asking for the dark theme.
 *
 * Almost nothing needs this - CSS handles the theme on its own through the
 * custom properties in styles/base/_theme.scss. It exists for the one case CSS
 * can't reach: a colour chosen from data at render time, where the *direction*
 * of a scale depends on the page it's drawn on.
 *
 * Subscribes to the media query rather than reading it once, so flipping the
 * OS appearance repaints without a reload.
 */
export function usePrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia(QUERY);
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);

    // Safari only gained addEventListener on MediaQueryList in 14; the legacy
    // addListener is kept as the fallback rather than dropping those visitors
    // onto the wrong ramp.
    if (media.addEventListener) {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  return prefersDark;
}
