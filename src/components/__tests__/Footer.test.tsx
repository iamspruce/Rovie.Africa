import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Footer } from '../Footer/Footer';
import { PRODUCT_NAV } from '../../content/navLinks';
import {
  PRODUCT_LINKS,
  LEARN_LINKS,
  DEVELOPER_LINKS,
  COMPANY_LINKS,
  SOCIAL_LINKS,
} from '../../content/siteLinks';
import { PLACEHOLDER_PAGES } from '../../content/placeholderPages';
import { LEGAL_DOCS } from '../../pages/Legal/Legal';

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );
}

describe('Footer', () => {
  it('renders as a site-wide contentinfo landmark', () => {
    renderFooter();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  // The footer's Product column reads from the same list as the header, so a
  // destination can't be reachable from one and missing from the other.
  it('links to every product destination the header offers', () => {
    renderFooter();
    PRODUCT_NAV.forEach((link) => {
      expect(screen.getAllByRole('link', { name: link.longLabel }).some((item) => item.getAttribute('href') === link.to)).toBe(true);
    });
  });

  it.each([
    ['Product', PRODUCT_LINKS],
    ['Learn', LEARN_LINKS],
    ['Developers', DEVELOPER_LINKS],
    ['Company', COMPANY_LINKS],
  ])('renders every %s link with a real destination', (_column, links) => {
    renderFooter();
    links.forEach((link) => {
      expect(screen.getAllByRole('link', { name: link.label }).some((item) => item.getAttribute('href') === link.to)).toBe(true);
    });
  });

  // Every route the footer points at has to be one the router actually serves
  // - a placeholder page still counts, an unrouted path does not.
  it('never links to a route the app does not serve', () => {
    const routed = new Set<string>([
      '/',
      '/code',
      '/research',
      '/models',
      '/rankings',
      '/status',
      '/support',
      '/about',
      ...LEGAL_DOCS.map((doc) => doc.path),
      ...PLACEHOLDER_PAGES.map((page) => page.path),
    ]);

    [...PRODUCT_LINKS, ...LEARN_LINKS, ...DEVELOPER_LINKS, ...COMPANY_LINKS]
      .filter((link) => !link.external)
      .forEach((link) => {
        expect(routed.has(link.to)).toBe(true);
      });
  });

  // The other half of the same guarantee. An off-site link that is not an
  // absolute URL is the failure this catches: react-router would resolve
  // "docs.rovie.africa/api/" as a relative path and land on the 404.
  //
  // Absolute, not https: DOCS_URL follows the environment, so these are
  // http://localhost:4321 in dev and under test. Asserting the scheme would be
  // asserting which environment the suite ran in.
  it('gives every off-site link an absolute URL', () => {
    const external = [...PRODUCT_LINKS, ...LEARN_LINKS, ...DEVELOPER_LINKS, ...COMPANY_LINKS].filter(
      (link) => link.external
    );

    expect(external.length).toBeGreaterThan(0);
    external.forEach((link) => {
      expect(() => new URL(link.to)).not.toThrow();
      expect(link.to).toMatch(/^https?:\/\//);
    });
  });

  // Unfilled social entries must not render - a link to '' resolves to the
  // current page, which is worse than no link at all.
  it('renders only the social accounts that have a URL', () => {
    renderFooter();
    SOCIAL_LINKS.filter((social) => social.url.length === 0).forEach((social) => {
      expect(screen.queryByRole('link', { name: social.label })).not.toBeInTheDocument();
    });
    SOCIAL_LINKS.filter((social) => social.url.length > 0).forEach((social) => {
      expect(screen.getByRole('link', { name: social.label })).toHaveAttribute('href', social.url);
    });
  });

  it('offers a real contact route', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: /contact us/i })).toHaveAttribute(
      'href',
      'mailto:hello@rovie.africa'
    );
  });

  // Which currencies a top-up settles in is the pricing page's job now. The
  // footer carrying its own copy of that list is what let the two drift.
  it('leaves the currency list to the pricing page', () => {
    renderFooter();
    expect(screen.queryByLabelText(/currencies you can top up in/i)).not.toBeInTheDocument();
  });

  it('closes on the company purpose the homepage introduces', () => {
    renderFooter();
    expect(screen.getByText(/Africa should help shape the future of AI/i)).toBeInTheDocument();
  });

  // The oversized mark behind the bottom bar is decoration; it must not reach
  // the accessibility tree or the tab order.
  it('keeps the decorative mark out of the accessibility tree', () => {
    const { container } = renderFooter();
    const mark = container.querySelector('[aria-hidden="true"] svg');
    expect(mark).toBeInTheDocument();
  });

  it('shows the current year in the copyright line', () => {
    renderFooter();
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} Rovie`))).toBeInTheDocument();
  });

  describe('newsletter', () => {
    it('offers a labelled subscribe form', () => {
      renderFooter();
      expect(
        screen.getByRole('heading', { name: /subscribe to our newsletter/i })
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
    });

    it('rejects an address that is not an email and keeps what was typed', async () => {
      const user = userEvent.setup();
      renderFooter();

      const input = screen.getByLabelText(/email address/i);
      await user.type(input, 'not-an-email');
      await user.click(screen.getByRole('button', { name: /subscribe/i }));

      expect(screen.getByRole('status')).toHaveTextContent(/valid email address/i);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveValue('not-an-email');
    });

    it('confirms and clears the field on a valid address', async () => {
      const user = userEvent.setup();
      renderFooter();

      const input = screen.getByLabelText(/email address/i);
      await user.type(input, 'builder@example.com');
      await user.click(screen.getByRole('button', { name: /subscribe/i }));

      expect(screen.getByRole('status')).toHaveTextContent(/on the list/i);
      expect(input).toHaveValue('');
    });
  });
});
