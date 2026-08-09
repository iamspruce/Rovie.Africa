import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NavDropdown } from '../Header/NavDropdown';
import { ModelLibraryCard } from '../Header/ModelLibraryCard';
import { DEVELOPER_NAV, DEVELOPER_NAV_LABEL } from '../../content/navLinks';

function renderDropdown(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <NavDropdown
        label={DEVELOPER_NAV_LABEL}
        links={DEVELOPER_NAV}
        feature={<ModelLibraryCard />}
      />
    </MemoryRouter>
  );
}

function openPanel() {
  return userEvent.click(screen.getByRole('button', { name: DEVELOPER_NAV_LABEL }));
}

describe('NavDropdown', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('starts closed, with nothing of its own in the tab order', () => {
    renderDropdown();
    expect(screen.getByRole('button', { name: DEVELOPER_NAV_LABEL })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('opens on click and offers every destination in the group', async () => {
    renderDropdown();
    await openPanel();

    expect(screen.getByRole('button', { name: DEVELOPER_NAV_LABEL })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    DEVELOPER_NAV.forEach((link) => {
      expect(screen.getByRole('link', { name: new RegExp(link.longLabel, 'i') })).toHaveAttribute(
        'href',
        link.to
      );
    });
  });

  // Four one-word labels tell a first-time visitor nothing about which one
  // they want, which is the whole reason this is a panel and not four more
  // items in the bar.
  it('says what each destination is for', async () => {
    renderDropdown();
    await openPanel();

    DEVELOPER_NAV.forEach((link) => {
      const item = screen.getByRole('link', { name: new RegExp(link.longLabel, 'i') });
      expect(item.textContent).toContain(link.description);
    });
  });

  // jsdom has no matchMedia, and the panel only opens on hover where the input
  // device can actually hover - so the test has to say it is a mouse. That
  // guard is the point: on a touchscreen the tap before a click reports as a
  // hover, and without it the panel would open and shut under the finger.
  it('opens on hover, and closes again on the way out', async () => {
    vi.stubGlobal(
      'matchMedia',
      (query: string) => ({ matches: query.includes('hover: hover'), media: query }) as MediaQueryList
    );

    renderDropdown();
    const trigger = screen.getByRole('button', { name: DEVELOPER_NAV_LABEL });

    await userEvent.hover(trigger);
    await screen.findByRole('link', { name: /documentation/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await userEvent.unhover(trigger);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape and hands focus back to the trigger', async () => {
    renderDropdown();
    const trigger = screen.getByRole('button', { name: DEVELOPER_NAV_LABEL });

    await openPanel();
    await userEvent.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  // Down from the bar should reach the menu without a mouse.
  it('opens downward from the keyboard and walks the list with the arrow keys', async () => {
    renderDropdown();
    screen.getByRole('button', { name: DEVELOPER_NAV_LABEL }).focus();

    await userEvent.keyboard('{ArrowDown}');
    const first = screen.getByRole('link', {
      name: new RegExp(DEVELOPER_NAV[0].longLabel, 'i'),
    });
    expect(first).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    expect(
      screen.getByRole('link', { name: new RegExp(DEVELOPER_NAV[1].longLabel, 'i') })
    ).toHaveFocus();

    await userEvent.keyboard('{ArrowUp}');
    expect(first).toHaveFocus();
  });

  // The second column: what is behind the API, and a way into the catalog.
  it('offers the model library as the second column', async () => {
    renderDropdown();
    await openPanel();

    const library = screen.getByRole('link', { name: /model library/i });
    expect(library).toHaveAttribute('href', '/models');
    expect(library.textContent).toMatch(/priced in your currency/i);
    // The provider marks are decorative; the label beside them is what the
    // link is called.
    expect(library.querySelectorAll('svg').length).toBeGreaterThanOrEqual(6);
  });

  it('reaches the second column from the keyboard, as the last stop', async () => {
    renderDropdown();
    screen.getByRole('button', { name: DEVELOPER_NAV_LABEL }).focus();

    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('link', { name: /model library/i })).toHaveFocus();
  });

  it('closes when a click lands outside it', async () => {
    render(
      <MemoryRouter>
        <NavDropdown
        label={DEVELOPER_NAV_LABEL}
        links={DEVELOPER_NAV}
        feature={<ModelLibraryCard />}
      />
        <button type="button">Elsewhere</button>
      </MemoryRouter>
    );

    const trigger = screen.getByRole('button', { name: DEVELOPER_NAV_LABEL });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  // The bar still has to say where you are once the panel it was opened from
  // has closed behind you.
  it('marks the trigger active while you are on one of its pages', () => {
    // Deliberately the first INTERNAL destination rather than DEVELOPER_NAV[0]:
    // three of the four are absolute URLs into docs.rovie.africa now, and
    // routing to one of those in a MemoryRouter tests nothing real.
    const internal = DEVELOPER_NAV.find((link) => !link.external);
    expect(internal).toBeDefined();

    renderDropdown(internal!.to);
    expect(screen.getByRole('button', { name: DEVELOPER_NAV_LABEL })).toHaveAttribute(
      'data-active'
    );
  });

  // The three docs destinations left this origin. An <a href> is the only
  // thing that reaches them: react-router's <Link> resolves `to` as a path, so
  // it would route to a page named after the URL and render the 404.
  it('renders the off-site destinations as real links, and never marks one active', async () => {
    const external = DEVELOPER_NAV.filter((link) => link.external);
    expect(external.length).toBeGreaterThan(0);

    // Rendered while "on" the first of them - which cannot happen, and is the
    // point: an absolute URL must not be matched against the pathname.
    renderDropdown(external[0].to);
    await openPanel();

    external.forEach((link) => {
      expect(screen.getByRole('link', { name: new RegExp(link.longLabel, 'i') })).toHaveAttribute(
        'href',
        link.to
      );
    });

    expect(screen.getByRole('button', { name: DEVELOPER_NAV_LABEL })).not.toHaveAttribute(
      'data-active'
    );
  });
});
