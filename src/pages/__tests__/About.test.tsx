import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { About } from '../About/About';
import { ROUTE_URL } from '../../content/navLinks';
import { CONTACT_EMAIL } from '../../content/navLinks';

function renderAbout() {
  return render(
    <MemoryRouter>
      <About />
    </MemoryRouter>
  );
}

describe('About page', () => {
  it('leads with why the company exists rather than with the product', () => {
    renderAbout();
    expect(screen.getByRole('heading', { level: 1, name: /why rovie exists/i })).toBeInTheDocument();
  });

  // The four commitments are the load-bearing part of the page: a gateway is
  // mostly distinguished by what it quietly does to your traffic, and each of
  // these matches a promise made in the docs and the data policy. Dropping one
  // silently would leave the two documents disagreeing.
  it('states every commitment the docs make about the gateway', () => {
    renderAbout();
    const limits = screen.getByRole('heading', { name: /what rovie will not do/i }).parentElement!;

    ['Train on your traffic', 'Silently reroute you', 'Host the models', 'Sell you a subscription'].forEach(
      (commitment) => {
        expect(within(limits).getByText(commitment)).toBeInTheDocument();
      }
    );
  });

  // An about page that will not say how the company gets paid is an about page
  // with a hole in it, and this one answers it in its own section.
  it('says how Rovie makes money', () => {
    renderAbout();
    const heading = screen.getByRole('heading', { name: /how we make money/i });
    expect(heading.parentElement).toHaveTextContent(/converts your currency/i);
    expect(heading.parentElement).toHaveTextContent(/markup/i);
  });

  // Quoting and settling are different lists, and the difference is the single
  // most misread thing about the product - see docs/guides/billing.
  it('separates the currencies it can quote from the ones it can settle', () => {
    renderAbout();
    const heading = screen.getByRole('heading', { name: /what we cannot do yet/i });
    expect(heading.parentElement).toHaveTextContent(/quote/i);
    expect(heading.parentElement).toHaveTextContent(/settle/i);
    expect(heading.parentElement).toHaveTextContent(/naira, Ugandan shillings, cedis/i);
  });

  it('offers a way onward, including a person to email', () => {
    renderAbout();
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute(
      'href',
      `${ROUTE_URL}/signup`
    );
    expect(screen.getByRole('link', { name: CONTACT_EMAIL })).toHaveAttribute(
      'href',
      `mailto:${CONTACT_EMAIL}`
    );
  });

  // Named claims elsewhere on the site are backed by a link to the page that
  // substantiates them, rather than left as an assertion about ourselves.
  it('links the claims it makes to the pages that back them', () => {
    renderAbout();
    ['/data-policy', '/status', '/models', '/rankings'].forEach((path) => {
      expect(document.querySelector(`a[href="${path}"]`)).not.toBeNull();
    });
  });
});
