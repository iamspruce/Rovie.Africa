import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HamburgerButton, HamburgerMenu } from '../../components/HamburgerMenu/HamburgerMenu';
import { CONTACT_EMAIL, DEVELOPER_NAV, PRIMARY_NAV } from '../../content/navLinks';
import { COMPANY_LINKS } from '../../content/siteLinks';

function renderMenu(props: Partial<React.ComponentProps<typeof HamburgerMenu>> = {}) {
  return render(
    <MemoryRouter>
      <HamburgerMenu
        isOpen
        isSignedIn={false}
        isAuthLoading={false}
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
    ['product', PRIMARY_NAV],
    ['developer', DEVELOPER_NAV],
  ])('renders every %s destination', (_group, links) => {
    renderMenu();
    links.forEach((link) => {
      expect(screen.getByRole('link', { name: new RegExp(link.longLabel, 'i') })).toHaveAttribute(
        'href',
        link.to
      );
    });
  });

  it('renders the company destinations the desktop bar leaves to the footer', () => {
    renderMenu();
    COMPANY_LINKS.forEach((link) => {
      expect(screen.getByRole('link', { name: new RegExp(link.label, 'i') })).toHaveAttribute(
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

  it('offers both auth actions when signed out', () => {
    renderMenu();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/signin');
    expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute('href', '/signup');
  });

  it('offers the dashboard instead once signed in', () => {
    renderMenu({ isSignedIn: true });
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
  });

  // Offering "Sign in" and then swapping it for "Dashboard" a moment later
  // tells a signed-in visitor they have been logged out.
  it('offers neither until the session check lands', () => {
    renderMenu({ isAuthLoading: true });
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument();
  });

  it('calls onNavigate when a link is clicked', async () => {
    const onNavigate = vi.fn();
    renderMenu({ onNavigate });
    await userEvent.click(screen.getByRole('link', { name: /models & pricing/i }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
