import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroTestimonials } from '../HeroTestimonials/HeroTestimonials';
import { TESTIMONIALS, initialsFor } from '../../content/testimonials';

// jsdom has no matchMedia, so the component renders its static form here: the
// cards are in the document, with no entrance and no scroll listener. That is
// the same thing a visitor who asks for reduced motion sees, and it is the
// state worth asserting - the markup has to stand up without the animation.

describe('HeroTestimonials', () => {
  it('renders every quote, so none is lost to the layout', () => {
    render(<HeroTestimonials />);
    TESTIMONIALS.forEach((item) => {
      expect(screen.getByText(item.quote)).toBeInTheDocument();
    });
  });

  it('splits the quotes into two rails', () => {
    const { container } = render(<HeroTestimonials />);
    const rails = container.querySelectorAll('ul');
    expect(rails).toHaveLength(2);
    rails.forEach((rail) => {
      expect(rail.querySelectorAll('li').length).toBeGreaterThan(0);
    });
  });

  it('tags each card with the side it belongs to and its distance out', () => {
    const { container } = render(<HeroTestimonials />);
    const cards = Array.from(container.querySelectorAll('[data-card]'));
    expect(cards).toHaveLength(TESTIMONIALS.length);

    const sides = cards.map((card) => card.getAttribute('data-side'));
    expect(sides.filter((side) => side === 'left')).toHaveLength(
      TESTIMONIALS.filter((item) => item.side === 'left').length
    );
    expect(sides.filter((side) => side === 'right')).toHaveLength(
      TESTIMONIALS.filter((item) => item.side === 'right').length
    );

    // Depth is per rail, not per list - it drives how far each card travels.
    cards.forEach((card) => expect(card.getAttribute('data-depth')).toMatch(/^[0-9]+$/));
  });

  it('attributes every quote to the person who said it', () => {
    render(<HeroTestimonials />);
    TESTIMONIALS.forEach((item) => {
      expect(screen.getByText(item.name)).toBeInTheDocument();
      expect(screen.getByText(item.role)).toBeInTheDocument();
    });
  });

  it('stands in initials for a missing photograph rather than a stock face', () => {
    const { container } = render(<HeroTestimonials />);
    expect(container.querySelectorAll('img')).toHaveLength(
      TESTIMONIALS.filter((item) => item.avatarUrl).length
    );
    const withoutPhoto = TESTIMONIALS.find((item) => !item.avatarUrl);
    expect(withoutPhoto).toBeDefined();
    expect(screen.getByText(initialsFor(withoutPhoto!.name))).toBeInTheDocument();
  });

  it('marks each quote up as a quotation with its source', () => {
    const { container } = render(<HeroTestimonials />);
    expect(container.querySelectorAll('figure')).toHaveLength(TESTIMONIALS.length);
    expect(container.querySelectorAll('blockquote')).toHaveLength(TESTIMONIALS.length);
    expect(container.querySelectorAll('figcaption')).toHaveLength(TESTIMONIALS.length);
  });

  it('gives every card its own entrance delay, so they arrive one by one', () => {
    const { container } = render(<HeroTestimonials />);
    const delays = Array.from(container.querySelectorAll<HTMLElement>('figure'))
      .map((face) => Number.parseInt(face.style.getPropertyValue('--enter-delay'), 10))
      .filter((ms) => Number.isFinite(ms));

    expect(delays).toHaveLength(TESTIMONIALS.length);
    // No two cards land together, and the last one doesn't keep the reader
    // waiting - the whole sequence is done inside two seconds.
    expect(new Set(delays).size).toBe(TESTIMONIALS.length);
    expect(Math.max(...delays)).toBeLessThan(2000);
  });
});

describe('initialsFor', () => {
  it('takes the first and last name', () => {
    expect(initialsFor('Adaeze Okonkwo')).toBe('AO');
  });

  it('skips the middle of a longer name', () => {
    expect(initialsFor('Ama Serwaa Boateng')).toBe('AB');
  });

  it('copes with a single name', () => {
    expect(initialsFor('Tendai')).toBe('T');
  });

  it('copes with stray whitespace rather than reading it as a name', () => {
    expect(initialsFor('  Sipho   Ndlovu  ')).toBe('SN');
  });
});
