import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { NavLink as NavLinkData } from '../../content/navLinks';
import { SmartLink } from '../SmartLink/SmartLink';
import { NavIcon } from './NavIcon';
import styles from './NavDropdown.module.scss';

// -----------------------------------------------------------------------
// The desktop panel behind a bar item.
//
// One row per destination: a mark, the name, and a line saying what you would
// go there for. Four one-word labels tell a first-time visitor nothing about
// which one they want, which is the whole reason this is a panel rather than
// four more items in the bar.
//
// It opens on hover, with a short delay in each direction so that crossing the
// bar on the way somewhere else doesn't open it and the gap between the
// trigger and the panel doesn't close it. Click and keyboard both work too -
// hover alone is unreachable from a touchscreen or a keyboard.
// -----------------------------------------------------------------------

// Long enough that dragging the pointer across the bar on the way somewhere
// else doesn't open anything; short enough that deliberately landing on it
// feels immediate.
const HOVER_OPEN_MS = 110;
// Forgiving on the way out, because the space between the trigger and the
// panel is a real place the pointer passes through.
const HOVER_CLOSE_MS = 220;

interface NavDropdownProps {
  label: string;
  links: readonly NavLinkData[];
  /** The conversion menu keeps the system's one primary treatment. */
  variant?: 'default' | 'primary';
  /** Menus opened from the action area grow inward, never past the viewport. */
  align?: 'start' | 'end';
  /**
   * Second column, if the group has one. The list on the left says how to
   * work with the product; this says what there is.
   */
  feature?: React.ReactNode;
}

export function NavDropdown({
  label,
  links,
  variant = 'default',
  align = 'start',
  feature,
}: NavDropdownProps) {
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<number | null>(null);
  // Set when the panel is opened from the keyboard, so focus lands on the
  // first destination instead of staying on the bar.
  const focusOnOpenRef = useRef(false);
  const { pathname } = useLocation();

  // The trigger reads as active while you are on one of the pages it holds,
  // so the bar still says where you are once the panel has closed. External
  // destinations are skipped rather than compared: they are on another origin,
  // so being "on" one is not a state this app can be in.
  const isSectionActive = links.some((link) => !link.external && pathname.startsWith(link.to));

  // Navigating is the one close that must not pull focus back to the trigger:
  // the visitor is on a new page and belongs at the top of it.
  useEffect(() => setIsOpen(false), [pathname]);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearHoverTimer, [clearHoverTimer]);

  // Hover only opens the panel where hovering is something the input device
  // can actually do. A touchscreen reports a hover on the tap that precedes
  // the click, so without this the panel would open and immediately toggle
  // shut again under the finger.
  const canHover = useCallback(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    []
  );

  function handleMouseEnter() {
    if (!canHover()) return;
    clearHoverTimer();
    hoverTimerRef.current = window.setTimeout(() => setIsOpen(true), HOVER_OPEN_MS);
  }

  function handleMouseLeave() {
    if (!canHover()) return;
    clearHoverTimer();
    hoverTimerRef.current = window.setTimeout(() => setIsOpen(false), HOVER_CLOSE_MS);
  }

  const itemLinks = useCallback(
    () => Array.from(panelRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? []),
    []
  );

  const focusItem = useCallback(
    (index: number) => {
      const items = itemLinks();
      if (items.length === 0) return;
      items[(index + items.length) % items.length]?.focus();
    },
    [itemLinks]
  );

  useEffect(() => {
    if (!isOpen || !focusOnOpenRef.current) return;
    focusOnOpenRef.current = false;
    focusItem(0);
  }, [isOpen, focusItem]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowDown') return;
    // Down from the bar opens the panel and lands on its first destination -
    // the same thing the pointer does, without reaching for the mouse.
    event.preventDefault();
    focusOnOpenRef.current = true;
    setIsOpen(true);
  }

  function handlePanelKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = itemLinks();
    const current = items.indexOf(document.activeElement as HTMLAnchorElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusItem(current + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusItem(current - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusItem(items.length - 1);
    }
  }

  return (
    <div
      className={styles.wrapper}
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      // Tabbing out of the last link closes what tabbing in opened.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsOpen(false);
      }}
    >
      <button
        type="button"
        ref={triggerRef}
        className={`${styles.trigger} ${variant === 'primary' ? styles.triggerPrimary : ''}`}
        data-active={isSectionActive || undefined}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => {
          clearHoverTimer();
          setIsOpen((open) => !open);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        {label}
        <svg
          className={styles.chevron}
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Rendered only when open. A hidden-but-present panel is four extra tab
          stops in the middle of the header for anyone using a keyboard. */}
      {isOpen && (
        <div
          className={styles.panel}
          id={panelId}
          ref={panelRef}
          data-columns={feature ? 'two' : undefined}
          data-align={align === 'end' ? 'end' : undefined}
          onKeyDown={handlePanelKeyDown}
        >
          <ul className={styles.list}>
            {links.map((link) => (
              <li key={link.to}>
                <SmartLink
                  to={link.to}
                  external={link.external}
                  className={({ isActive }) =>
                    isActive ? `${styles.item} ${styles.itemActive}` : styles.item
                  }
                >
                  <NavIcon to={link.to} />

                  <span className={styles.itemBody}>
                    <span className={styles.itemLabel}>
                      {link.longLabel}
                      {/* Sits with the label rather than out at the right edge,
                          so it points from the name to where the name goes. */}
                      <svg
                        className={styles.itemArrow}
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
                      </svg>
                    </span>

                    {link.description && (
                      <span className={styles.itemDescription}>{link.description}</span>
                    )}
                  </span>
                </SmartLink>
              </li>
            ))}
          </ul>

          {feature}
        </div>
      )}
    </div>
  );
}
