import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HamburgerButton, HamburgerMenu } from '../../components/HamburgerMenu/HamburgerMenu';
import { PRIMARY_NAV, CONTACT_EMAIL } from '../../content/navLinks';

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
    render(
      <MemoryRouter>
        <HamburgerMenu isOpen={false} onNavigate={() => {}} />
      </MemoryRouter>
    );
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('renders every primary destination when open', () => {
    render(
      <MemoryRouter>
        <HamburgerMenu isOpen onNavigate={() => {}} />
      </MemoryRouter>
    );
    PRIMARY_NAV.forEach((link) => {
      expect(screen.getByRole('link', { name: link.label })).toHaveAttribute('href', link.to);
    });
  });

  // "Contact us" comes out of the header bar at this width, so the menu is the
  // only place it's reachable from the top of the page.
  it('carries the contact link the bar drops on small screens', () => {
    render(
      <MemoryRouter>
        <HamburgerMenu isOpen onNavigate={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /contact us/i })).toHaveAttribute(
      'href',
      `mailto:${CONTACT_EMAIL}`
    );
  });

  it('calls onNavigate when a link is clicked', async () => {
    const onNavigate = vi.fn();
    render(
      <MemoryRouter>
        <HamburgerMenu isOpen onNavigate={onNavigate} />
      </MemoryRouter>
    );
    await userEvent.click(screen.getByRole('link', { name: 'Models' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
