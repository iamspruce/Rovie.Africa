import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HamburgerButton, HamburgerMenu } from '../../components/HamburgerMenu/HamburgerMenu';
import {
  CONTACT_EMAIL,
  DEVELOPER_NAV,
  LEARN_NAV,
  PRODUCT_NAV,
  ROUTE_NAV,
} from '../../content/navLinks';
import { COMPANY_LINKS } from '../../content/siteLinks';

function renderMenu(props: Partial<React.ComponentProps<typeof HamburgerMenu>> = {}) {
  return render(
    <MemoryRouter>
      <HamburgerMenu
        isOpen
        onNavigate={() => {}}
        {...props}
      />
    </MemoryRouter>
  );
}

describe('HamburgerButton', () => {
  it('shows the correct aria-expanded state and label', () => {
    const { rerender } = render(<HamburgerButton isOpen={false} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    );

    rerender(<HamburgerButton isOpen onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('calls onToggle when clicked', async () => {
    const onToggle = vi.fn();
    render(<HamburgerButton isOpen={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe('HamburgerMenu', () => {
  it('renders nothing when closed', () => {
    renderMenu({ isOpen: false });
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  // Below the large breakpoint this sheet is the only navigation above the
  // footer, so it carries every group - not just the two in the desktop bar.
  it.each([
    ['Products', PRODUCT_NAV],
    ['Learn', LEARN_NAV],
    ['Rovie Route', ROUTE_NAV],
    ['Developers', DEVELOPER_NAV],
  ])('renders every %s destination', (group, links) => {
    renderMenu();
    const menu = within(screen.getByRole('list', { name: group }));
    links.forEach((link) => {
      expect(menu.getByRole('link', { name: new RegExp(link.longLabel, 'i') })).toHaveAttribute(
        'href',
        link.to
      );
    });
  });

  it('renders the company destinations the desktop bar leaves to the footer', () => {
    renderMenu();
    const company = within(screen.getByRole('list', { name: 'Company' }));
    COMPANY_LINKS.forEach((link) => {
      expect(company.getByRole('link', { name: new RegExp(link.label, 'i') })).toHaveAttribute(
        'href',
        link.to
      );
    });
  });

  it('carries the contact address, which is not a route', () => {
    renderMenu();
    expect(screen.getByRole('link', { name: /contact us/i })).toHaveAttribute(
      'href',
      `mailto:${CONTACT_EMAIL}`
    );
  });

  it('sends Route authentication to the separate Route site', () => {
    renderMenu();
    const routeMenu = within(screen.getByRole('list', { name: 'Rovie Route' }));
    expect(routeMenu.getByRole('link', { name: /sign in to route/i })).toHaveAttribute(
      'href',
      ROUTE_NAV.find((link) => link.label === 'Sign in')?.to
    );
    expect(routeMenu.getByRole('link', { name: /create a route account/i })).toHaveAttribute(
      'href',
      ROUTE_NAV.find((link) => link.label === 'Start')?.to
    );
  });

  it('calls onNavigate when a link is clicked', async () => {
    const onNavigate = vi.fn();
    renderMenu({ onNavigate });
    await userEvent.click(
      within(screen.getByRole('list', { name: 'Products' })).getByRole('link', { name: /rovie route/i })
    );
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
