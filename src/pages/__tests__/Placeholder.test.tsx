import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Placeholder } from '../Placeholder/Placeholder';
import { PLACEHOLDER_PAGES } from '../../content/placeholderPages';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<Placeholder />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Placeholder page', () => {
  // PLACEHOLDER_PAGES is empty while every route has a written page - /about
  // was the last of them. A forEach rather than it.each, so the file keeps
  // covering the list the moment an entry is added and doesn't fail collection
  // on an empty table in the meantime.
  it('renders every listed placeholder with its own title and brief', () => {
    PLACEHOLDER_PAGES.forEach((page) => {
      const { unmount } = renderAt(page.path);

      expect(screen.getByRole('heading', { level: 1, name: page.title })).toBeInTheDocument();
      expect(screen.getByText(page.summary)).toBeInTheDocument();
      // The rest of the site never states a figure it can't back up; an
      // unwritten page saying "coming soon" is the same rule applied to prose.
      expect(screen.getByRole('status')).toHaveTextContent(/haven't written this page yet/i);
      expect(screen.getByRole('link', { name: /browse the model catalog/i })).toHaveAttribute(
        'href',
        '/models'
      );

      unmount();
    });
  });

  // The component's other job, and currently its only live one: it is the
  // router's catch-all, so every mistyped URL lands here.
  it('falls back to a not-found page for a route with no entry', () => {
    renderAt('/nothing-here');
    expect(screen.getByRole('heading', { level: 1, name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to the homepage/i })).toHaveAttribute('href', '/');
  });

  // /about used to be served from here. It is a real page now, and this is
  // what catches the half-finished version of that change: the entry removed
  // but the route left pointing at Placeholder would render "Page not found"
  // on a link the footer shows every visitor.
  it('no longer claims /about, which is a written page', () => {
    renderAt('/about');
    expect(screen.getByRole('heading', { level: 1, name: /page not found/i })).toBeInTheDocument();
  });
});
