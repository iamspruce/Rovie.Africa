import { useLayoutEffect, useRef, useState } from 'react';
import { AfricaMapSvg, type MapModelTag } from './AfricaMapSvg';
import styles from './AfricaMap.module.scss';

// Width used for the very first render before layout. It's never painted:
// the real width is measured in a layout effect (below) and re-rendered
// synchronously before the browser paints, so the globe doesn't flash a
// 900px frame and then snap to the container's actual size.
const DEFAULT_WIDTH = 900;
// The canvas is wider than it is tall; the globe is fit inside it with room
// left over for the model tags that hang off the sphere.
const ASPECT = 0.62;
const NARROW_ASPECT = 0.86;
const NARROW_WIDTH = 620;
const SPHERE_PADDING_RATIO = 0.13;

interface AfricaMapProps {
  highlightAlpha2?: string;
  onSelectCountry?: (alpha2: string) => void;
  priceFor?: (alpha2: string) => string | null | undefined;
  tags?: MapModelTag[];
  className?: string;
}

export function AfricaMap({
  highlightAlpha2,
  onSelectCountry,
  priceFor,
  tags,
  className = '',
}: AfricaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

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

  const canvasWidth = width > 0 ? width : DEFAULT_WIDTH;
  const canvasHeight = Math.round(
    canvasWidth * (canvasWidth < NARROW_WIDTH ? NARROW_ASPECT : ASPECT)
  );
  const padding = Math.min(canvasWidth, canvasHeight) * SPHERE_PADDING_RATIO;

  return (
    <div ref={containerRef} className={`${styles.wrapper} ${className}`}>
      <AfricaMapSvg
        width={canvasWidth}
        height={canvasHeight}
        padding={padding}
        highlightAlpha2={highlightAlpha2}
        onSelectCountry={onSelectCountry}
        priceFor={priceFor}
        tags={tags}
      />
    </div>
  );
}
