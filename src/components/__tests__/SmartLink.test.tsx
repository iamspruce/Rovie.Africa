import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SmartLink } from '../SmartLink/SmartLink';

function renderLink(ui: React.ReactNode, initialPath = '/') {
  return render(<MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>);
}

describe('SmartLink', () => {
  it('routes an internal destination', () => {
    renderLink(<SmartLink to="/models">Models</SmartLink>);
    expect(screen.getByRole('link', { name: 'Models' })).toHaveAttribute('href', '/models');
  });

  // The whole reason this component exists. react-router resolves `to` as a
  // path, so an absolute URL through <Link> becomes a route named after the
  // URL - the visitor lands on the 404 instead of on the docs.
  it('leaves an absolute URL absolute rather than routing it', () => {
    renderLink(
      <SmartLink to="https://docs.rovie.africa/api/" external>
        API reference
      </SmartLink>
    );

    expect(screen.getByRole('link', { name: 'API reference' })).toHaveAttribute(
      'href',
      'https://docs.rovie.africa/api/'
    );
  });

  it('applies a plain className in both branches', () => {
    renderLink(
      <>
        <SmartLink to="/models" className="row">
          Internal
        </SmartLink>
        <SmartLink to="https://docs.rovie.africa/" external className="row">
          External
        </SmartLink>
      </>
    );

    expect(screen.getByRole('link', { name: 'Internal' })).toHaveClass('row');
    expect(screen.getByRole('link', { name: 'External' })).toHaveClass('row');
  });

  // Callers pass react-router's callback form without knowing which branch
  // they will get, so the external branch has to resolve it too.
  it("resolves the callback className, and an external link is never 'active'", () => {
    const className = ({ isActive }: { isActive: boolean }) => (isActive ? 'row active' : 'row');

    renderLink(
      <SmartLink to="https://docs.rovie.africa/" external className={className}>
        Docs
      </SmartLink>,
      // Rendered while the router is "at" the URL itself, which is the
      // pathological case: it must still not read as active, because being on
      // another origin is not being on a route.
      'https://docs.rovie.africa/'
    );

    const link = screen.getByRole('link', { name: 'Docs' });
    expect(link).toHaveClass('row');
    expect(link).not.toHaveClass('active');
  });

  it('marks an internal link active when it is the current route', () => {
    renderLink(
      <SmartLink
        to="/models"
        className={({ isActive }) => (isActive ? 'row active' : 'row')}
      >
        Models
      </SmartLink>,
      '/models'
    );

    expect(screen.getByRole('link', { name: 'Models' })).toHaveClass('active');
  });

  // The mobile sheet closes itself on navigate, and it does that through
  // onClick - so dropping the handler on the external branch would leave the
  // menu open over the page the visitor just left.
  it('keeps onClick on both branches', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const clicks: string[] = [];

    renderLink(
      <>
        <SmartLink to="/models" onClick={() => clicks.push('internal')}>
          Internal
        </SmartLink>
        <SmartLink
          to="https://docs.rovie.africa/"
          external
          onClick={() => clicks.push('external')}
        >
          External
        </SmartLink>
      </>
    );

    await userEvent.click(screen.getByRole('link', { name: 'Internal' }));
    await userEvent.click(screen.getByRole('link', { name: 'External' }));

    expect(clicks).toEqual(['internal', 'external']);
  });
});
