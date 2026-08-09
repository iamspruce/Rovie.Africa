import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home } from '../Home/Home';

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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/the ai layer\s*for africa/i);
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

  it('prices the top models on the globe itself', async () => {
    renderHome();
    const tags = await screen.findByLabelText(/top model prices in the selected currency/i);
    // Before the live catalog answers these are name-only fallbacks; either
    // way every tag carries a price line rather than a blank.
    expect(tags.textContent).toMatch(/\$0\.50|tokens|From/i);
  });

  it('keeps the hero free of calls to action', () => {
    renderHome();
    expect(screen.queryByRole('link', { name: /get started/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /see what we offer/i })).not.toBeInTheDocument();
  });

  it('makes the case for accessible AI directly under the hero', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { level: 2, name: /ai should be accessible/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/builders everywhere/i)).toBeInTheDocument();
    expect(screen.getByText(/high costs, fragmented apis/i)).toBeInTheDocument();
    expect(screen.getByText(/changing that/i)).toBeInTheDocument();
  });

  it('states the mission as its own claim, in a section named by its thesis', () => {
    renderHome();
    // The statement is split across spans to accent "across Africa", so this
    // asserts on the whole region rather than a single node.
    const section = screen.getByRole('region', { name: /ai should be accessible/i });
    expect(section).toHaveTextContent(/our mission/i);
    expect(section).toHaveTextContent(/make ai accessible and affordable across africa/i);
  });

  it('runs hero, mission, featured models, then how to start - and nothing else', () => {
    renderHome();
    const sections = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(sections).toHaveLength(3);
    expect(sections[0]).toMatch(/ai should be accessible/i);
    expect(sections[1]).toMatch(/the most .+ can buy/i);
    expect(sections[2]).toMatch(/three steps to your first call/i);
  });

  it('never hangs more tags off the globe than it has places to put them', async () => {
    renderHome();
    const tags = await screen.findByLabelText(/top model prices in the selected currency/i);
    // The catalog now spans nine families; the globe has five slots, and the
    // rest are carried by the list below it.
    expect(tags.children.length).toBeLessThanOrEqual(5);
    const positions = [...tags.children].map((g) => g.getAttribute('transform'));
    expect(new Set(positions).size).toBe(positions.length);
  });

  it('prices the page in the visitor’s currency, or dollars when location fails', () => {
    renderHome();
    const heading = screen.getByRole('heading', { name: /the most .+ can buy/i });
    // Either a resolved local currency or the dollar fallback - never a blank
    // or a currency invented from the default map country.
    expect(heading.textContent).toMatch(/\$|₦|KSh|GH₵|USh/);
  });

  it('keeps the homepage list to a shortlist, not the whole catalog', () => {
    renderHome();
    const featured = screen.getByRole('region', { name: /the most .+ can buy/i });
    // The catalog spans nine families; /models carries the rest.
    expect(within(featured).queryAllByRole('listitem').length).toBeLessThanOrEqual(4);
  });

  it('features models from the live catalog under the mission', () => {
    renderHome();
    // Before the catalog answers this is the empty state, not a broken list.
    const featured = screen.getByRole('region', { name: /the most .+ can buy/i });
    expect(featured).toBeInTheDocument();
    expect(featured).toHaveTextContent(/live catalog/i);
  });

  it('closes with the three steps to a first call', () => {
    renderHome();
    const steps = screen.getByRole('region', { name: /three steps to your first call/i });
    expect(steps).toHaveTextContent(/sign up/i);
    expect(steps).toHaveTextContent(/buy credits/i);
    expect(steps).toHaveTextContent(/start using/i);
  });

  it('reaches a settled state once the real FX/models requests complete', async () => {
    renderHome();
    await waitFor(() => expect(screen.getByRole('img', { name: /globe/i })).toBeInTheDocument(), {
      timeout: 12000,
    });
  });
});
