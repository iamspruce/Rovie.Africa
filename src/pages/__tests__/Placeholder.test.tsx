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
  it.each(PLACEHOLDER_PAGES.map((page) => [page.path, page.title, page.summary]))(
    '%s renders its own title and brief',
    (path, title, summary) => {
      renderAt(path);
      expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
      expect(screen.getByText(summary)).toBeInTheDocument();
    }
  );

  // The rest of the site never states a figure it can't back up; an unwritten
  // page saying "coming soon" is the same rule applied to prose.
  it('says plainly that the page is not written rather than faking content', () => {
    renderAt('/about');
    expect(screen.getByRole('status')).toHaveTextContent(/haven't written this page yet/i);
  });

  it('always offers a way onward', () => {
    renderAt('/about');
    expect(screen.getByRole('link', { name: /browse the model catalog/i })).toHaveAttribute(
      'href',
      '/models'
    );
  });

  it('falls back to a not-found page for a route with no entry', () => {
    renderAt('/nothing-here');
    expect(screen.getByRole('heading', { level: 1, name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to the homepage/i })).toHaveAttribute('href', '/');
  });
});
