import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { TESTIMONIALS, initialsFor, type Testimonial } from '../../content/testimonials';
import styles from './HeroTestimonials.module.scss';

// -----------------------------------------------------------------------
// Two columns of quotes, one either side of the hero.
//
// They arrive one at a time once the page is up, and then they are tied to
// the scroll: as the hero leaves, each card retreats back out the edge it
// came in from, and scrolling back up brings it home. Nothing here runs on a
// timer - the entrance is a one-shot CSS animation, and the retreat only
// computes on frames where the page has actually moved.
//
// Everything animated is a transform or an opacity, which the compositor can
// take off the main thread. There is deliberately no transition on the cards:
// the scroll handler is already writing one value per frame, and a transition
// on top of that would be two animations fighting over the same property.
// -----------------------------------------------------------------------

// $breakpoint-xl from styles/abstracts/_variables.scss, which a component
// can't read: both stylesheets involved reach it through respond-to('xl'), and
// this is the same width written out by hand. Below it the rails are
// display:none - there is no room for them beside a globe - so there is
// nothing to drive and no listener worth attaching.
const RAIL_BREAKPOINT = '(min-width: 1280px)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

// How far the page scrolls before the cards are completely gone, as a
// fraction of the viewport height. Two thirds of a screen: long enough that
// the retreat reads as gradual rather than as a swipe, short enough that they
// are clear of the edge before the next section is under the headline.
const EXIT_VIEWPORTS = 0.66;

// Travel past the viewport edge, so a card finishes actually outside it
// instead of resting with its last pixel on the boundary.
const CLEARANCE_PX = 32;

// Cards in the same rail pull away at slightly different rates, outermost
// fastest. Without it the three move as one rigid block, which reads as a
// panel sliding rather than three cards leaving.
const DEPTH_RATE = 0.16;

// Where in the retreat the quote starts fading. It is already most of the way
// out by then; the fade is what stops the last sliver from winking out against
// the edge of the screen.
const FADE_FROM = 0.72;

// Entrance pacing. Longer than $duration-base, and deliberately: that token
// is for interface feedback, where the system's rule is that a terminal
// answers immediately. This is a thing arriving on a page, which is a
// different job and reads as hurried at 150ms.
const ENTER_FIRST_MS = 220;
const ENTER_STEP_MS = 130;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/**
 * Whether a media query currently matches, kept in sync as it changes.
 *
 * Local rather than in hooks/ because one component asks. Tolerates a missing
 * matchMedia - jsdom has none - by reporting false, which lands this component
 * on its static, unanimated rendering.
 */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(media.matches);

    // Same reason as usePrefersDark: MediaQueryList only gained
    // addEventListener in Safari 14.
    if (media.addEventListener) {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, [query]);

  return matches;
}

export function HeroTestimonials() {
  const rootRef = useRef<HTMLDivElement>(null);
  const isWide = useMediaQuery(RAIL_BREAKPOINT);
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !isWide || prefersReducedMotion) return undefined;

    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-card]'));
    if (cards.length === 0) return undefined;

    // Signed pixels each card travels at full retreat: negative for the left
    // rail, positive for the right. Measured rather than guessed, because how
    // far "off the screen" is depends on the viewport.
    let travel: number[] = [];
    let exitDistance = 1;
    let lastProgress = -1;
    let frame: number | null = null;

    const measure = () => {
      exitDistance = Math.max(1, window.innerHeight * EXIT_VIEWPORTS);
      travel = cards.map((card) => {
        // The rail is what gets measured with a rect, never the card: a card
        // may be mid-flight and carrying a transform, while its rail never
        // moves. That is what keeps a resize part-way through a scroll from
        // measuring a displaced box.
        //
        // The card's own place within that rail then comes from offsetLeft and
        // offsetWidth, which - unlike a rect - a transform does not affect. It
        // has to be asked for separately because the cards sit at three
        // different distances from the edge: see $curve in the stylesheet, the
        // arc each rail is arranged on.
        const rail = card.parentElement;
        if (!rail) return 0;
        const box = rail.getBoundingClientRect();
        const rate = 1 + Number(card.dataset.depth ?? '0') * DEPTH_RATE;
        const left = box.left + card.offsetLeft;
        return card.dataset.side === 'left'
          ? -(left + card.offsetWidth + CLEARANCE_PX) * rate
          : (window.innerWidth - left + CLEARANCE_PX) * rate;
      });
      lastProgress = -1;
    };

    const paint = () => {
      frame = null;
      // The hero is the top of the homepage, so how far the page has scrolled
      // is how far the hero has left.
      const progress = clamp01(window.scrollY / exitDistance);
      // Pinned at either end - parked at the top, or scrolled well past the
      // hero - there is nothing to write. This is what keeps the effect off
      // the CPU for most of the page.
      if (progress === lastProgress) return;
      lastProgress = progress;

      // Smoothstep, so the cards ease out of rest and ease into gone instead
      // of tracking the wheel linearly.
      const eased = progress * progress * (3 - 2 * progress);
      const fade =
        progress <= FADE_FROM ? 1 : clamp01(1 - (progress - FADE_FROM) / (1 - FADE_FROM));

      cards.forEach((card, index) => {
        const x = (travel[index] ?? 0) * eased;
        card.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
        card.style.opacity = fade.toFixed(3);
      });
    };

    const onScroll = () => {
      // Wheels and trackpads fire faster than the screen redraws. Coalescing
      // to one write per frame means no frame is computed and thrown away.
      if (frame === null) frame = requestAnimationFrame(paint);
    };

    const onResize = () => {
      measure();
      onScroll();
    };

    measure();
    // A reload part-way down the page must not start with the cards at rest
    // over the hero it has already scrolled past.
    paint();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      // Hand the cards back to the stylesheet. Left as they are, a viewport
      // that narrows past the breakpoint - or a visitor who turns on reduced
      // motion - would inherit whatever offset the last frame wrote.
      cards.forEach((card) => {
        card.style.transform = '';
        card.style.opacity = '';
      });
    };
  }, [isWide, prefersReducedMotion]);

  return (
    <div ref={rootRef} className={styles.rails} data-testid="hero-testimonials">
      <Rail side="left" />
      <Rail side="right" />
    </div>
  );
}

function Rail({ side }: { side: 'left' | 'right' }) {
  const items = TESTIMONIALS.filter((item) => item.side === side);

  return (
    <ul className={`${styles.rail} ${side === 'left' ? styles.railLeft : styles.railRight}`}>
      {items.map((item, depth) => (
        <Card
          key={item.id}
          testimonial={item}
          side={side}
          // Distance out from the middle of the rail, which sets both how
          // late the card arrives and how early it leaves.
          depth={depth}
          // Position in the full list, not in this rail - the entrance
          // alternates sides, so the delay has to come from the global order.
          order={TESTIMONIALS.indexOf(item)}
        />
      ))}
    </ul>
  );
}

interface CardProps {
  testimonial: Testimonial;
  side: 'left' | 'right';
  depth: number;
  order: number;
}

function Card({ testimonial, side, depth, order }: CardProps) {
  return (
    // The <li> is the scroll handler's element and the <figure> inside it is
    // the entrance animation's. Two elements because they both want the
    // transform, and one would overwrite the other.
    <li className={styles.card} data-card data-side={side} data-depth={depth}>
      <figure
        className={styles.face}
        style={{ '--enter-delay': `${ENTER_FIRST_MS + order * ENTER_STEP_MS}ms` } as CSSProperties}
      >
        <figcaption className={styles.attribution}>
          <Avatar testimonial={testimonial} />
          <span className={styles.who}>
            <span className={styles.name}>{testimonial.name}</span>
            <span className={styles.role}>{testimonial.role}</span>
          </span>
        </figcaption>
        {/* The quotation marks are drawn by the stylesheet, so the copy in
            content/testimonials.ts stays free of punctuation it would have to
            get right in every entry. */}
        <blockquote className={styles.quote}>{testimonial.quote}</blockquote>
      </figure>
    </li>
  );
}

function Avatar({ testimonial }: { testimonial: Testimonial }) {
  if (testimonial.avatarUrl) {
    return (
      <img
        className={styles.avatar}
        src={testimonial.avatarUrl}
        alt={testimonial.name}
        width={36}
        height={36}
        loading="lazy"
        decoding="async"
      />
    );
  }

  // Initials, not a generated face. The name beside it is the label, so the
  // monogram itself is decoration and is kept out of the accessibility tree.
  return (
    <span className={styles.avatar} aria-hidden="true">
      {initialsFor(testimonial.name)}
    </span>
  );
}
