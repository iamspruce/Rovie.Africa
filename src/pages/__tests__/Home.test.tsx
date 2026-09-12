import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home } from '../Home/Home';
import { ROUTE_URL } from '../../content/navLinks';

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

describe('Home page', () => {
  // The headline says what the company is, not what the product charges. A
  // price or a feature turning up in the h1 is the regression this catches.
  it('leads with the company mission rather than a product spec', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/ai for\s*africa/i);
  });

  // The globe is a lazily loaded chunk - see AfricaMapLazy - so it arrives a
  // tick after the hero text it sits under. The generous timeout is for the
  // role query rather than the import: computing an accessible name across a
  // fully drawn globe is slow under jsdom.
  it('keeps the interactive globe in the hero', async () => {
    renderHome();
    expect(
      await screen.findByRole('img', { name: /globe.*africa/i }, { timeout: 8000 })
    ).toBeInTheDocument();
  });

  it('shows Route model prices on the globe', async () => {
    renderHome();
    const tags = await screen.findByLabelText(/top model prices/i);
    expect(tags.children.length).toBeLessThanOrEqual(5);
  });

  it('keeps the hero free of calls to action', () => {
    renderHome();
    expect(screen.queryByRole('link', { name: /get started/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /see what we offer/i })).not.toBeInTheDocument();
  });

  it('keeps testimonials off the company homepage', () => {
    renderHome();
    expect(screen.queryByTestId('hero-testimonials')).not.toBeInTheDocument();
  });

  it('makes the case for African agency directly under the hero', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { level: 2, name: /africa should help shape the future of ai/i })
    ).toBeInTheDocument();
    const section = screen.getByRole('region', {
      name: /africa should help shape the future of ai/i,
    });
    expect(section).toHaveTextContent(/africa should not be last to access it/i);
    expect(section).toHaveTextContent(/we begin with access. we are building for agency/i);
  });

  it('runs hero, purpose, products, then the work behind Rovie', () => {
    renderHome();
    const sections = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(sections).toHaveLength(3);
    expect(sections[0]).toMatch(/africa should help shape the future of ai/i);
    expect(sections[1]).toMatch(/an ai company for africa/i);
    expect(sections[2]).toMatch(/the work behind rovie/i);
  });

  it('introduces Route as the active product and keeps future work clearly labelled', () => {
    renderHome();
    const products = screen.getByRole('region', { name: /an ai company for africa/i });
    expect(products).toHaveTextContent(/rovie route/i);
    expect(products).toHaveTextContent(/available now/i);
    expect(products).toHaveTextContent(/rovie code/i);
    expect(products).toHaveTextContent(/rovie research/i);
    expect(products).toHaveTextContent(/in development/i);
    expect(screen.getByRole('link', { name: /explore rovie route/i })).toHaveAttribute('href', ROUTE_URL);
    expect(screen.getByRole('link', { name: /about rovie code/i })).toHaveAttribute('href', '/code');
    expect(screen.getByRole('link', { name: /our research/i })).toHaveAttribute('href', '/research');
  });

  it('links to real Route, company, and data work instead of invented announcements', () => {
    renderHome();
    const work = screen.getByRole('region', { name: /the work behind rovie/i });
    expect(work).toHaveTextContent(/explore rovie/i);
    expect(screen.getByRole('link', { name: /explore the models available through route/i })).toHaveAttribute(
      'href',
      ROUTE_URL
    );
    expect(screen.getByRole('link', { name: /why rovie exists/i })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: /what africa is building with/i })).toHaveAttribute(
      'href',
      '/rankings'
    );
  });
});
